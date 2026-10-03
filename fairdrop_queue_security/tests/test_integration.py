import pytest
from app.queue.integration import validate_queue_admission_for_reservation
from app.queue.service import QueueService
from app.queue.admission_worker import AdmissionWorker


@pytest.mark.asyncio
async def test_queue_admission_validation_integration_for_reservation(db_session):
    """27. Queue admission validation can be called by reservation backend."""
    service = QueueService(db_session)
    join_res = await service.join_queue("evt-integ", "buyer-role1")

    # Admit user
    worker = AdmissionWorker()
    await worker.admit_batch("evt-integ", limit=1, db=db_session)

    status = await service.get_queue_status(join_res["entry_id"], "buyer-role1")
    token = status["queue_token"]

    # Role 1 calls integration function
    role1_res = await validate_queue_admission_for_reservation(
        session_user_id="buyer-role1",
        event_id="evt-integ",
        queue_entry_id=join_res["entry_id"],
        queue_token=token,
        db=db_session,
    )

    assert role1_res["success"] is True
    assert role1_res["queue_entry_id"] == join_res["entry_id"]
    assert role1_res["error_code"] is None


@pytest.mark.asyncio
async def test_fastapi_app_starts_successfully(async_client):
    """28. FastAPI application starts successfully and responds to /health."""
    res = await async_client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["service"] == "fairdrop_queue_security"


@pytest.mark.asyncio
async def test_main_queue_endpoints_return_expected_schemas(async_client, auth_headers):
    """29. Main queue endpoints return exact expected frontend schemas."""
    user_id = "test-buyer-99"
    headers = auth_headers(user_id)

    # 1. Join queue
    join_resp = await async_client.post("/events/event-demo/join-queue", headers=headers)
    assert join_resp.status_code == 200
    join_data = join_resp.json()

    assert "entry_id" in join_data
    assert join_data["state"] == "WAITING"
    assert "position" in join_data
    assert isinstance(join_data["position"], int)

    entry_id = join_data["entry_id"]

    # 2. Get queue status
    status_resp = await async_client.get(f"/queue/{entry_id}", headers=headers)
    assert status_resp.status_code == 200
    status_data = status_resp.json()

    assert status_data["entry_id"] == entry_id
    assert status_data["state"] == "WAITING"
    assert "position" in status_data
    assert "ahead" in status_data
    assert "eta_seconds" in status_data
