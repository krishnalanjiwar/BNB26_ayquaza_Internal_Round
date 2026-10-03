import pytest
import asyncio
from app.security.rate_limiter import RateLimiter


@pytest.mark.asyncio
async def test_rate_limit_triggers_and_returns_retry_after(setup_fake_redis):
    """15 & 16. Rate limit triggers when capacity exceeded and returns positive retry_after."""
    limiter = RateLimiter(setup_fake_redis)

    # Exhaust user limit (USER_REQUESTS_PER_SECOND = 20)
    for _ in range(20):
        res = await limiter.check_rate_limits(
            ip_address="10.0.0.1",
            user_id="busy-user",
            endpoint_name="queue_status",
        )
        assert res.allowed is True

    # 21st request exceeds bucket capacity
    res_overflow = await limiter.check_rate_limits(
        ip_address="10.0.0.1",
        user_id="busy-user",
        endpoint_name="queue_status",
    )
    assert res_overflow.allowed is False
    assert res_overflow.retry_after >= 1


@pytest.mark.asyncio
async def test_independent_users_independently_rate_limited(setup_fake_redis):
    """17. Independent users sharing an IP are rate limited independently."""
    limiter = RateLimiter(setup_fake_redis)
    shared_ip = "192.168.1.100"

    # User 1 exhausts their 20 tokens
    for _ in range(20):
        await limiter.check_rate_limits(shared_ip, user_id="user-1")

    u1_overflow = await limiter.check_rate_limits(shared_ip, user_id="user-1")
    assert u1_overflow.allowed is False

    # User 2 on the SAME IP still has their independent token allowance
    u2_res = await limiter.check_rate_limits(shared_ip, user_id="user-2")
    assert u2_res.allowed is True


@pytest.mark.asyncio
async def test_temporary_block_applies_and_expires(setup_fake_redis):
    """23. Temporary block blocks user and expires after TTL."""
    limiter = RateLimiter(setup_fake_redis)

    # Apply 1-second temporary block
    await limiter.apply_temporary_block("user", "bad-actor", duration_seconds=1)

    blocked = await limiter.is_blocked("user", "bad-actor")
    assert blocked.allowed is False
    assert blocked.retry_after > 0

    # Wait for block TTL to expire
    await asyncio.sleep(1.1)

    unblocked = await limiter.is_blocked("user", "bad-actor")
    assert unblocked.allowed is True
