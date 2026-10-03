import pytest
from app.queue.service import QueueService
from app.queue.redis_queue import RedisQueue
from app.core.errors import ForbiddenException, AppException


@pytest.mark.asyncio
async def test_first_user_joins(db_session):
    """1. First user joins: creates queue entry in WAITING state and position 1."""
    service = QueueService(db_session)
    res = await service.join_queue(event_id="evt-1", user_id="user-1")

    assert res["state"] == "WAITING"
    assert res["position"] == 1
    assert "entry_id" in res


@pytest.mark.asyncio
async def test_repeated_join_is_idempotent(db_session):
    """2 & 8. Repeated join / refresh is idempotent and does not create a new queue entry or move backwards."""
    service = QueueService(db_session)

    res1 = await service.join_queue(event_id="evt-1", user_id="user-1")
    res2 = await service.join_queue(event_id="evt-1", user_id="user-1")

    assert res1["entry_id"] == res2["entry_id"]
    assert res1["position"] == res2["position"]
    assert res2["state"] == "WAITING"


@pytest.mark.asyncio
async def test_multiple_users_preserve_fifo(db_session):
    """3. Multiple users preserve strict FIFO ordering."""
    service = QueueService(db_session)

    u1 = await service.join_queue(event_id="evt-1", user_id="user-1")
    u2 = await service.join_queue(event_id="evt-1", user_id="user-2")
    u3 = await service.join_queue(event_id="evt-1", user_id="user-3")

    assert u1["position"] == 1
    assert u2["position"] == 2
    assert u3["position"] == 3


@pytest.mark.asyncio
async def test_user_can_retrieve_own_status(db_session):
    """4. User can retrieve own queue status with authoritative server position."""
    service = QueueService(db_session)

    u1 = await service.join_queue(event_id="evt-1", user_id="user-1")
    u2 = await service.join_queue(event_id="evt-1", user_id="user-2")

    status1 = await service.get_queue_status(entry_id=u1["entry_id"], user_id="user-1")
    assert status1["entry_id"] == u1["entry_id"]
    assert status1["state"] == "WAITING"
    assert status1["position"] == 1
    assert status1["ahead"] == 0

    status2 = await service.get_queue_status(entry_id=u2["entry_id"], user_id="user-2")
    assert status2["position"] == 2
    assert status2["ahead"] == 1


@pytest.mark.asyncio
async def test_user_cannot_retrieve_another_users_queue_entry(db_session):
    """5. User cannot retrieve another user's queue entry (403 Forbidden)."""
    service = QueueService(db_session)

    u1 = await service.join_queue(event_id="evt-1", user_id="user-1")

    with pytest.raises(ForbiddenException):
        await service.get_queue_status(entry_id=u1["entry_id"], user_id="attacker-2")
