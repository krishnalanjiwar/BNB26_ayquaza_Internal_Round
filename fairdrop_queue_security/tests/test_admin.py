import pytest
import asyncio


@pytest.mark.asyncio
async def test_admin_metrics_endpoint(async_client, db_session):
    """Admin metrics endpoint returns complete metrics and inventory documentation."""
    resp = await async_client.get("/admin/events/evt-metric-test/metrics")
    assert resp.status_code == 200
    data = resp.json()

    assert data["event_id"] == "evt-metric-test"
    assert "queue_counts" in data
    assert "decisions" in data
    assert "p50" in data
    assert "p95" in data
    assert "p99" in data
    assert "inventory" in data
    assert data["inventory"]["owned_by"] == "Role_1_Reservation_Backend"
    assert "legitimate_success_rate" in data
    assert "bot_allocation_rate" in data
    assert "false_positive_rate" in data


@pytest.mark.asyncio
async def test_admin_clients_endpoint(async_client, auth_headers):
    """Admin clients endpoint returns paginated client state without exposing secrets."""
    headers = auth_headers("admin-view-user")
    # Join queue so there is an entry
    await async_client.post("/events/evt-client-test/join-queue", headers=headers)

    resp = await async_client.get("/admin/events/evt-client-test/clients?limit=10")
    assert resp.status_code == 200
    data = resp.json()

    assert "total" in data
    assert "clients" in data
    assert len(data["clients"]) >= 1

    first_client = data["clients"][0]
    assert "user_id" in first_client
    assert "queue_state" in first_client
    # Verify no tokens or secrets exposed
    assert "token" not in first_client
    assert "secret" not in first_client


@pytest.mark.asyncio
async def test_admin_simulations_lifecycle(async_client):
    """Simulation run creation, execution, and retrieval."""
    payload = {
        "event_id": "sim-test-event",
        "tickets": 50,
        "clients": 200,
        "bot_percentage": 25,
        "retry_storm": True,
        "bypass_attempts": True,
        "refresh_reconnect": True,
        "mitigation_enabled": True,
        "allocation_policy": "FIFO",
    }
    # 1. Start simulation
    create_resp = await async_client.post("/admin/simulations", json=payload)
    assert create_resp.status_code == 200
    create_data = create_resp.json()
    assert "run_id" in create_data
    run_id = create_data["run_id"]

    # Allow brief moment for background simulation task
    await asyncio.sleep(0.5)

    # 2. Get specific simulation
    get_resp = await async_client.get(f"/admin/simulations/{run_id}")
    assert get_resp.status_code == 200
    get_data = get_resp.json()
    assert get_data["run_id"] == run_id
    assert get_data["event_id"] == "sim-test-event"

    # 3. List simulations
    list_resp = await async_client.get("/admin/simulations")
    assert list_resp.status_code == 200
    list_data = list_resp.json()
    assert any(r["run_id"] == run_id for r in list_data)
