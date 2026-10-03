from typing import Optional, List, Tuple
import redis.asyncio as aioredis
from app.core.config import get_settings

_redis_client: Optional[aioredis.Redis] = None


def get_redis_client() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        settings = get_settings()
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            encoding="utf-8",
        )
    return _redis_client


def set_redis_client(client: aioredis.Redis) -> None:
    """Allow overriding Redis client (e.g. for testing with fakeredis)."""
    global _redis_client
    _redis_client = client


class RedisQueue:
    def __init__(self, client: Optional[aioredis.Redis] = None):
        self._client = client

    @property
    def client(self) -> aioredis.Redis:
        return self._client or get_redis_client()

    def _queue_key(self, event_id: str) -> str:
        return f"fairdrop:event:{event_id}:queue"

    def _seq_key(self, event_id: str) -> str:
        return f"fairdrop:event:{event_id}:seq"

    async def enqueue(self, event_id: str, entry_id: str) -> Tuple[int, bool]:
        """
        Add entry to FIFO queue if not already present.
        Returns (position, is_new).
        Position is 1-indexed.
        """
        queue_key = self._queue_key(event_id)
        existing_score = await self.client.zscore(queue_key, entry_id)

        if existing_score is not None:
            rank = await self.client.zrank(queue_key, entry_id)
            return (rank + 1 if rank is not None else 1), False

        # Generate strictly monotonic arrival order sequence number
        seq_key = self._seq_key(event_id)
        score = await self.client.incr(seq_key)

        # NX flag: only add if member does not already exist
        added = await self.client.zadd(queue_key, {entry_id: score}, nx=True)
        rank = await self.client.zrank(queue_key, entry_id)
        position = (rank + 1) if rank is not None else 1
        return position, bool(added)

    async def get_position(self, event_id: str, entry_id: str) -> Optional[int]:
        """Get 1-indexed position in queue. Returns None if not in queue."""
        rank = await self.client.zrank(self._queue_key(event_id), entry_id)
        if rank is None:
            return None
        return rank + 1

    async def get_ahead_count(self, event_id: str, entry_id: str) -> Optional[int]:
        """Get number of users ahead in queue (0-indexed rank). Returns None if not in queue."""
        return await self.client.zrank(self._queue_key(event_id), entry_id)

    async def pop_next_batch(self, event_id: str, count: int) -> List[str]:
        """
        Atomically pop the next FIFO entries from queue using ZPOPMIN.
        Guarantees that concurrent workers cannot process the same entry twice.
        """
        if count <= 0:
            return []
        items = await self.client.zpopmin(self._queue_key(event_id), count)
        # zpopmin returns [(member, score), ...]
        return [item[0] for item in items]

    async def remove(self, event_id: str, entry_id: str) -> bool:
        """Remove entry from the queue."""
        res = await self.client.zrem(self._queue_key(event_id), entry_id)
        return bool(res)

    async def get_queue_length(self, event_id: str) -> int:
        """Get total number of waiting entries in queue."""
        return await self.client.zcard(self._queue_key(event_id))
