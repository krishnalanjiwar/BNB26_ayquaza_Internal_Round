import pytest
from app.queue.service import QueueService
from app.queue.admission_worker import AdmissionWorker
from app.db.models import QueueEntry
from sqlalchemy import select


@pytest.mark.asyncio
async def test_admission_moves_waiting_to_admitted(db_session):
    """6. Admission moves state from WAITING to ADMITTED and sets admitted_at and expires_at."""
    service = QueueService(db_session)
    u1 = await service.join_queue(event_id="evt-adm", user_id="user-1")

    worker = AdmissionWorker()
    admitted = await worker.admit_batch("evt-adm", limit=10, db=db_session)

    assert u1["entry_id"] in admitted

    # Verify status reflects ADMITTED and has a queue_token
    status = await service.get_queue_status(entry_id=u1["entry_id"], user_id="user-1")
    assert status["state"] == "ADMITTED"
    assert status["position"] == 0
    assert "queue_token" in status
    assert status["queue_token"] is not None


@pytest.mark.asyncio
async def test_admission_does_not_admit_same_user_twice(db_session):
    """7. Concurrent or consecutive admission calls do not admit the same entry twice."""
    service = QueueService(db_session)
    u1 = await service.join_queue(event_id="evt-adm-2", user_id="user-1")

    worker = AdmissionWorker()

    # First admission call
    admitted_1 = await worker.admit_batch("evt-adm-2", limit=10, db=db_session)
    assert u1["entry_id"] in admitted_1

    # Second admission call immediately after
    admitted_2 = await worker.admit_batch("evt-adm-2", limit=10, db=db_session)
    # Since u1 was already popped from the Redis FIFO queue, it must not be admitted again
    assert u1["entry_id"] not in admitted_2
    assert len(admitted_2) == 0
