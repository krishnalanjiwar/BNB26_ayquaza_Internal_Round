import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.database import AsyncSessionLocal
from app.db.models import QueueEntry, utc_now
from app.queue.redis_queue import RedisQueue, get_redis_client
from app.queue.state_machine import QueueState
from app.queue.service import generate_queue_token

logger = logging.getLogger("fairdrop.admission_worker")


class AdmissionWorker:
    def __init__(
        self,
        redis_queue: Optional[RedisQueue] = None,
        admission_per_second: Optional[int] = None,
        interval_seconds: Optional[float] = None,
    ):
        settings = get_settings()
        self.redis_queue = redis_queue or RedisQueue()
        self.admission_per_second = admission_per_second or settings.QUEUE_ADMISSION_PER_SECOND
        self.interval_seconds = interval_seconds or settings.QUEUE_ADMISSION_INTERVAL_SECONDS
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def admit_batch(
        self,
        event_id: str,
        limit: int,
        db: AsyncSession,
    ) -> List[str]:
        """
        Admit up to `limit` waiting entries from Redis FIFO queue.
        Uses atomic ZPOPMIN to prevent duplicate processing by concurrent workers.
        """
        if limit <= 0:
            return []

        # Atomic pop from Redis FIFO sorted set
        entry_ids = await self.redis_queue.pop_next_batch(event_id, limit)
        if not entry_ids:
            return []

        now = utc_now()
        settings = get_settings()
        hold_expires_at = now + timedelta(seconds=settings.QUEUE_TOKEN_TTL_SECONDS)

        # Update entries in database atomically
        stmt = (
            select(QueueEntry)
            .where(
                QueueEntry.id.in_(entry_ids),
                QueueEntry.state == QueueState.WAITING.value,
            )
        )
        result = await db.execute(stmt)
        entries = result.scalars().all()

        admitted_ids: List[str] = []
        for entry in entries:
            entry.state = QueueState.ADMITTED.value
            entry.admitted_at = now
            entry.expires_at = hold_expires_at
            entry.updated_at = now
            admitted_ids.append(entry.id)

        await db.commit()
        logger.info(
            f"Admitted {len(admitted_ids)} entries for event '{event_id}' "
            f"(target batch: {limit})"
        )
        return admitted_ids

    async def run_cycle(self, event_ids: List[str]) -> int:
        """Run one admission cycle across given event IDs."""
        total_admitted = 0
        async with AsyncSessionLocal() as session:
            for event_id in event_ids:
                try:
                    admitted = await self.admit_batch(
                        event_id=event_id,
                        limit=self.admission_per_second,
                        db=session,
                    )
                    total_admitted += len(admitted)
                except Exception as e:
                    logger.error(f"Error admitting batch for event {event_id}: {e}", exc_info=True)
        return total_admitted

    async def start(self, get_active_event_ids_callable=None) -> None:
        """Start the background admission loop."""
        self._running = True
        logger.info("Admission worker background loop starting...")
        while self._running:
            try:
                event_ids = (
                    await get_active_event_ids_callable()
                    if get_active_event_ids_callable
                    else []
                )
                if event_ids:
                    await self.run_cycle(event_ids)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in admission loop: {e}", exc_info=True)

            await asyncio.sleep(self.interval_seconds)

    def stop(self) -> None:
        """Stop the background admission loop."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
