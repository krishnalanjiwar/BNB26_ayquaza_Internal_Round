import time
import uuid
from typing import Optional, NamedTuple
import redis.asyncio as aioredis
from app.core.config import get_settings
from app.queue.redis_queue import get_redis_client


class RateLimitResult(NamedTuple):
    allowed: bool
    retry_after: int
    remaining: int
    limit: int
    key_type: str = "user"


class RateLimiter:
    ENDPOINT_COSTS = {
        "join_queue": 1,
        "queue_status": 1,
        "reserve": 3,
        "payment": 1,
    }

    def __init__(self, client: Optional[aioredis.Redis] = None):
        self._client = client

    @property
    def client(self) -> aioredis.Redis:
        return self._client or get_redis_client()

    async def _execute_window(
        self, key: str, capacity: int, cost: int, key_type: str
    ) -> RateLimitResult:
        now = time.time()
        window = 1.0  # 1-second rolling window

        # Clean expired timestamps older than rolling window
        await self.client.zremrangebyscore(key, 0, now - window)
        current_count = await self.client.zcard(key)

        if current_count + cost <= capacity:
            # Record request cost
            entries = {
                f"{now}_{i}_{uuid.uuid4().hex[:6]}": now
                for i in range(cost)
            }
            await self.client.zadd(key, entries)
            await self.client.expire(key, int(window + 5))
            remaining = max(0, capacity - current_count - cost)
            return RateLimitResult(
                allowed=True,
                retry_after=0,
                remaining=remaining,
                limit=capacity,
                key_type=key_type,
            )
        else:
            # Over capacity: calculate retry_after from oldest score in window
            oldest = await self.client.zrange(key, 0, 0, withscores=True)
            if oldest:
                oldest_score = oldest[0][1]
                time_until_expiry = window - (now - oldest_score)
                retry_after = max(1, int(time_until_expiry) + 1)
            else:
                retry_after = 1

            return RateLimitResult(
                allowed=False,
                retry_after=retry_after,
                remaining=max(0, capacity - current_count),
                limit=capacity,
                key_type=key_type,
            )

    async def is_blocked(self, entity_type: str, identifier: str) -> RateLimitResult:
        """Check if an IP or user is currently temporarily blocked."""
        key = f"fairdrop:block:{entity_type}:{identifier}"
        ttl = await self.client.ttl(key)
        if ttl > 0:
            return RateLimitResult(
                allowed=False,
                retry_after=ttl,
                remaining=0,
                limit=0,
                key_type=entity_type,
            )
        return RateLimitResult(
            allowed=True,
            retry_after=0,
            remaining=1,
            limit=1,
            key_type=entity_type,
        )

    async def apply_temporary_block(
        self, entity_type: str, identifier: str, duration_seconds: Optional[int] = None
    ) -> None:
        """Apply temporary block with TTL in Redis."""
        settings = get_settings()
        duration = duration_seconds or settings.SECURITY_BLOCK_SECONDS
        key = f"fairdrop:block:{entity_type}:{identifier}"
        await self.client.set(key, "blocked", ex=duration)

    async def check_rate_limits(
        self,
        ip_address: str,
        user_id: Optional[str] = None,
        endpoint_name: str = "queue_status",
        custom_cost: Optional[int] = None,
    ) -> RateLimitResult:
        """
        Check rate limit independently by IP and by user.
        Independent users sharing an IP will not be unfairly exhausted by each other.
        """
        settings = get_settings()
        cost = custom_cost if custom_cost is not None else self.ENDPOINT_COSTS.get(endpoint_name, 1)

        # 1. Check temporary blocks first
        ip_block = await self.is_blocked("ip", ip_address)
        if not ip_block.allowed:
            return ip_block

        if user_id:
            user_block = await self.is_blocked("user", user_id)
            if not user_block.allowed:
                return user_block

        # 2. Check IP rate limit
        ip_key = f"fairdrop:ratelimit:ip:{ip_address}"
        ip_res = await self._execute_window(
            key=ip_key,
            capacity=settings.IP_REQUESTS_PER_SECOND,
            cost=cost,
            key_type="ip",
        )
        if not ip_res.allowed:
            return ip_res

        # 3. Check User rate limit if user_id is present
        if user_id:
            user_key = f"fairdrop:ratelimit:user:{user_id}"
            user_res = await self._execute_window(
                key=user_key,
                capacity=settings.USER_REQUESTS_PER_SECOND,
                cost=cost,
                key_type="user",
            )
            if not user_res.allowed:
                return user_res
            return user_res

        return ip_res
