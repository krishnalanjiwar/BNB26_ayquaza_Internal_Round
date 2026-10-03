from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, NamedTuple
import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import (
    AppException,
    ForbiddenException,
    ExpiredException,
    ConflictException,
)
from app.db.models import QueueEntry, utc_now, ensure_utc
from app.queue.state_machine import QueueState, transition_state
from app.queue.redis_queue import RedisQueue


class ValidationResult(NamedTuple):
    is_valid: bool
    reason: str
    payload: Optional[Dict[str, Any]] = None
    entry: Optional[QueueEntry] = None


def generate_queue_token(
    user_id: str,
    event_id: str,
    queue_entry_id: str,
    expires_at: Optional[datetime] = None,
    ttl_seconds: Optional[int] = None,
) -> str:
    """Generate a signed queue admission token."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    if expires_at is None:
        ttl = ttl_seconds or settings.QUEUE_TOKEN_TTL_SECONDS
        exp_timestamp = int((now + timedelta(seconds=ttl)).timestamp())
    else:
        exp_timestamp = int(ensure_utc(expires_at).timestamp())

    payload = {
        "user_id": user_id,
        "event_id": event_id,
        "queue_entry_id": queue_entry_id,
        "purpose": "queue_admission",
        "iat": int(now.timestamp()),
        "exp": exp_timestamp,
    }
    return jwt.encode(payload, settings.QUEUE_TOKEN_SECRET, algorithm="HS256")


async def validate_admission_token(
    session_user_id: str,
    event_id: str,
    queue_entry_id: str,
    queue_token: str,
    db: Optional[AsyncSession] = None,
) -> ValidationResult:
    """
    Validate queue admission token.
    Verifies:
    1. Signature
    2. Expiry
    3. Purpose == 'queue_admission'
    4. event_id match
    5. queue_entry_id match
    6. user_id match (against session_user_id)
    7. Database state == ADMITTED and not expired
    """
    settings = get_settings()
    if not queue_token:
        return ValidationResult(False, "Missing queue token")

    try:
        payload = jwt.decode(
            queue_token,
            settings.QUEUE_TOKEN_SECRET,
            algorithms=["HS256"],
        )
    except jwt.ExpiredSignatureError:
        return ValidationResult(False, "Queue token has expired")
    except jwt.InvalidTokenError:
        return ValidationResult(False, "Invalid queue token signature or format")

    if payload.get("purpose") != "queue_admission":
        return ValidationResult(False, "Invalid token purpose")

    if payload.get("event_id") != event_id:
        return ValidationResult(False, "Token event_id mismatch")

    if payload.get("queue_entry_id") != queue_entry_id:
        return ValidationResult(False, "Token queue_entry_id mismatch")

    if payload.get("user_id") != session_user_id:
        return ValidationResult(False, "Token user_id mismatch with authenticated user")

    entry: Optional[QueueEntry] = None
    if db is not None:
        stmt = select(QueueEntry).where(QueueEntry.id == queue_entry_id)
        result = await db.execute(stmt)
        entry = result.scalar_one_or_none()

        if not entry:
            return ValidationResult(False, "Queue entry not found in database", payload)

        if entry.event_id != event_id:
            return ValidationResult(False, "Queue entry does not match event_id", payload, entry)

        if entry.user_id != session_user_id:
            return ValidationResult(False, "Queue entry does not belong to user", payload, entry)

        if entry.state != QueueState.ADMITTED.value:
            return ValidationResult(
                False,
                f"Queue entry state is {entry.state}, expected ADMITTED",
                payload,
                entry,
            )

        if entry.expires_at and ensure_utc(entry.expires_at) < utc_now():
            return ValidationResult(False, "Queue admission hold has expired in database", payload, entry)

    return ValidationResult(True, "Admission token is valid", payload, entry)


class QueueService:
    def __init__(self, db: AsyncSession, redis_queue: Optional[RedisQueue] = None):
        self.db = db
        self.redis_queue = redis_queue or RedisQueue()

    async def join_queue(self, event_id: str, user_id: str) -> Dict[str, Any]:
        """
        Join queue for an event. Idempotent:
        If user already has an entry for the event, returns existing state and position
        without moving backward or creating duplicate.
        """
        stmt = select(QueueEntry).where(
            QueueEntry.event_id == event_id,
            QueueEntry.user_id == user_id,
        )
        result = await self.db.execute(stmt)
        entry = result.scalar_one_or_none()

        if entry:
            # Existing entry: retrieve state and position
            if entry.state == QueueState.WAITING.value:
                pos = await self.redis_queue.get_position(event_id, entry.id)
                if pos is None:
                    pos, _ = await self.redis_queue.enqueue(event_id, entry.id)
                return {
                    "entry_id": entry.id,
                    "state": entry.state,
                    "position": pos,
                }
            elif entry.state == QueueState.ADMITTED.value:
                token = generate_queue_token(user_id, event_id, entry.id, entry.expires_at)
                return {
                    "entry_id": entry.id,
                    "state": entry.state,
                    "position": 0,
                    "queue_token": token,
                    "hold_expires_at": entry.expires_at.isoformat() if entry.expires_at else None,
                }
            else:
                return {
                    "entry_id": entry.id,
                    "state": entry.state,
                    "position": 0,
                }

        # Create new QueueEntry
        new_entry = QueueEntry(
            event_id=event_id,
            user_id=user_id,
            state=QueueState.WAITING.value,
            created_at=utc_now(),
            updated_at=utc_now(),
        )
        self.db.add(new_entry)
        await self.db.flush()

        # Add to Redis FIFO queue
        position, _ = await self.redis_queue.enqueue(event_id, new_entry.id)
        await self.db.commit()

        return {
            "entry_id": new_entry.id,
            "state": QueueState.WAITING.value,
            "position": position,
        }

    async def get_queue_status(self, entry_id: str, user_id: str) -> Dict[str, Any]:
        """
        Retrieve queue status for a given entry_id.
        Enforces user ownership, queries authoritative server position from Redis.
        """
        stmt = select(QueueEntry).where(QueueEntry.id == entry_id)
        result = await self.db.execute(stmt)
        entry = result.scalar_one_or_none()

        if not entry:
            raise AppException("QUEUE_ENTRY_NOT_FOUND", "Queue entry not found", status_code=404)

        if entry.user_id != user_id:
            raise ForbiddenException("Access denied: You can only access your own queue entry")

        settings = get_settings()

        # Check if ADMITTED hold has expired
        if entry.state == QueueState.ADMITTED.value:
            if entry.expires_at and ensure_utc(entry.expires_at) < utc_now():
                entry.state = QueueState.EXPIRED.value
                entry.updated_at = utc_now()
                await self.db.commit()
                return {
                    "entry_id": entry.id,
                    "state": QueueState.EXPIRED.value,
                    "position": 0,
                    "ahead": 0,
                    "eta_seconds": 0,
                }

            token = generate_queue_token(entry.user_id, entry.event_id, entry.id, entry.expires_at)
            return {
                "entry_id": entry.id,
                "state": QueueState.ADMITTED.value,
                "position": 0,
                "ahead": 0,
                "eta_seconds": 0,
                "queue_token": token,
                "hold_expires_at": entry.expires_at.isoformat() if entry.expires_at else None,
            }

        if entry.state == QueueState.WAITING.value:
            ahead = await self.redis_queue.get_ahead_count(entry.event_id, entry.id)
            if ahead is None:
                # Fallback if desynchronized
                ahead = 0
                position = 1
            else:
                position = ahead + 1

            adm_rate = max(1, settings.QUEUE_ADMISSION_PER_SECOND)
            adm_interval = max(1, settings.QUEUE_ADMISSION_INTERVAL_SECONDS)
            eta_seconds = max(0, int((ahead / adm_rate) * adm_interval)) if ahead > 0 else 0

            return {
                "entry_id": entry.id,
                "state": QueueState.WAITING.value,
                "position": position,
                "ahead": ahead,
                "eta_seconds": eta_seconds,
            }

        # Terminal / intermediate states (RESERVATION_HELD, BOOKED, EXPIRED, REJECTED)
        return {
            "entry_id": entry.id,
            "state": entry.state,
            "position": 0,
            "ahead": 0,
            "eta_seconds": 0,
        }
