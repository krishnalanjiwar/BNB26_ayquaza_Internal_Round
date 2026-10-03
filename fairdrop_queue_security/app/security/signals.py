from typing import Optional, List, Dict, Any
import redis.asyncio as aioredis
from app.queue.redis_queue import get_redis_client


class SignalTracker:
    def __init__(self, client: Optional[aioredis.Redis] = None):
        self._client = client

    @property
    def client(self) -> aioredis.Redis:
        return self._client or get_redis_client()

    def _signal_key(self, identifier: str) -> str:
        return f"fairdrop:signals:{identifier}"

    async def record_signal(
        self,
        identifier: str,
        signal_name: str,
        weight_count: int = 1,
        ttl_seconds: int = 60,
    ) -> int:
        """Increment count for a specific abuse signal."""
        key = self._signal_key(identifier)
        val = await self.client.hincrby(key, signal_name, weight_count)
        await self.client.expire(key, ttl_seconds)
        return val

    async def get_signals(self, identifier: str) -> Dict[str, int]:
        """Fetch active signals for an identifier (user_id or ip)."""
        key = self._signal_key(identifier)
        data = await self.client.hgetall(key)
        return {k: int(v) for k, v in data.items()}

    async def record_request_burst(self, identifier: str) -> bool:
        """
        Record a burst tick in a 2-second sliding bucket.
        Returns True if burst threshold (> 25 req / 2s) is reached.
        """
        key = f"fairdrop:burst:{identifier}"
        count = await self.client.incr(key)
        if count == 1:
            await self.client.expire(key, 2)
        if count > 25:
            await self.record_signal(identifier, "high_request_burst", 1)
            return True
        return False

    async def record_invalid_token(self, identifier: str) -> None:
        await self.record_signal(identifier, "invalid_token", 1)

    async def record_bypass_attempt(self, identifier: str) -> None:
        await self.record_signal(identifier, "bypass_attempt", 1)

    async def record_rate_limit_violation(self, identifier: str) -> None:
        await self.record_signal(identifier, "rate_limit_violations", 1)

    async def record_repeated_reserve(self, identifier: str) -> None:
        await self.record_signal(identifier, "repeated_reserve", 1)

    async def record_repeated_join(self, identifier: str) -> None:
        await self.record_signal(identifier, "repeated_queue_joins", 1)

    async def check_and_record_idempotency_key(
        self, user_id: str, idempotency_key: str, ttl_seconds: int = 120
    ) -> bool:
        """
        Returns True if this is a legitimate retry of the SAME idempotency key.
        Prevents legitimate retries from triggering abuse signals.
        """
        key = f"fairdrop:idempotency:{user_id}:{idempotency_key}"
        # Set NX: returns True if key was set (first time), False if it already existed
        is_new = await self.client.set(key, "1", ex=ttl_seconds, nx=True)
        return not bool(is_new)
