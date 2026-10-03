import pytest
from datetime import datetime, timezone, timedelta
from app.queue.service import (
    QueueService,
    generate_queue_token,
    validate_admission_token,
)
from app.queue.admission_worker import AdmissionWorker
from app.db.models import QueueEntry, utc_now
from app.queue.state_machine import QueueState


@pytest.mark.asyncio
async def test_queue_token_valid_for_correct_user_event(db_session):
    """9. Queue token is valid for correct user and event."""
    service = QueueService(db_session)
    u1 = await service.join_queue("evt-tok", "user-tok-1")

    # Admit user
    worker = AdmissionWorker()
    await worker.admit_batch("evt-tok", limit=1, db=db_session)

    status = await service.get_queue_status(u1["entry_id"], "user-tok-1")
    token = status["queue_token"]

    result = await validate_admission_token(
        session_user_id="user-tok-1",
        event_id="evt-tok",
        queue_entry_id=u1["entry_id"],
        queue_token=token,
        db=db_session,
    )
    assert result.is_valid is True
    assert "Admission token is valid" in result.reason


@pytest.mark.asyncio
async def test_queue_token_fails_for_wrong_user(db_session):
    """10. Queue token copied from User A and submitted by User B MUST fail."""
    service = QueueService(db_session)
    u1 = await service.join_queue("evt-tok", "user-A")

    worker = AdmissionWorker()
    await worker.admit_batch("evt-tok", limit=1, db=db_session)

    status = await service.get_queue_status(u1["entry_id"], "user-A")
    token = status["queue_token"]

    result = await validate_admission_token(
        session_user_id="user-B",  # Malicious user B attempting to use User A's token
        event_id="evt-tok",
        queue_entry_id=u1["entry_id"],
        queue_token=token,
        db=db_session,
    )
    assert result.is_valid is False
    assert "mismatch" in result.reason.lower()


@pytest.mark.asyncio
async def test_queue_token_fails_for_wrong_event(db_session):
    """11. A token for another event MUST fail."""
    service = QueueService(db_session)
    u1 = await service.join_queue("evt-real", "user-A")

    worker = AdmissionWorker()
    await worker.admit_batch("evt-real", limit=1, db=db_session)

    status = await service.get_queue_status(u1["entry_id"], "user-A")
    token = status["queue_token"]

    result = await validate_admission_token(
        session_user_id="user-A",
        event_id="evt-fake-event",
        queue_entry_id=u1["entry_id"],
        queue_token=token,
        db=db_session,
    )
    assert result.is_valid is False
    assert "event_id mismatch" in result.reason.lower()


@pytest.mark.asyncio
async def test_expired_token_fails(db_session):
    """12. Expired queue token MUST fail."""
    past_time = datetime.now(timezone.utc) - timedelta(seconds=10)
    expired_token = generate_queue_token(
        user_id="user-exp",
        event_id="evt-exp",
        queue_entry_id="entry-1",
        expires_at=past_time,
    )

    result = await validate_admission_token(
        session_user_id="user-exp",
        event_id="evt-exp",
        queue_entry_id="entry-1",
        queue_token=expired_token,
        db=db_session,
    )
    assert result.is_valid is False
    assert "expired" in result.reason.lower()


@pytest.mark.asyncio
async def test_non_admitted_entry_cannot_pass_validation(db_session):
    """13. A token for a non-admitted (e.g. WAITING) queue entry MUST fail."""
    service = QueueService(db_session)
    u1 = await service.join_queue("evt-not-adm", "user-waiting")

    # Manually create a forged token for this waiting entry
    forged_token = generate_queue_token("user-waiting", "evt-not-adm", u1["entry_id"])

    result = await validate_admission_token(
        session_user_id="user-waiting",
        event_id="evt-not-adm",
        queue_entry_id=u1["entry_id"],
        queue_token=forged_token,
        db=db_session,
    )
    assert result.is_valid is False
    assert "expected ADMITTED" in result.reason
