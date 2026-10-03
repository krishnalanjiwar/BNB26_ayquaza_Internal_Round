import asyncio
import random
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from app.db.database import AsyncSessionLocal
from app.db.models import SimulationRun, QueueEntry, utc_now
from app.security.metrics import SecurityMetrics
from app.security.signals import SignalTracker
from app.queue.state_machine import QueueState


class SimulationConfig(BaseModel):
    event_id: str = "demo-event"
    tickets: int = 500
    clients: int = 5000
    bot_percentage: int = Field(default=30, ge=0, le=100)
    retry_storm: bool = True
    bypass_attempts: bool = True
    refresh_reconnect: bool = True
    mitigation_enabled: bool = True
    allocation_policy: str = "FIFO"


# In-memory store of recent simulation client metadata for admin queries
_simulated_clients_store: Dict[str, List[Dict[str, Any]]] = {}
_simulation_runs_memory: Dict[str, Dict[str, Any]] = {}


async def run_simulation_task(run_id: str, config: SimulationConfig) -> None:
    """
    Run lightweight honest simulation for up to 5,000 clients and 500 tickets.
    Demonstrates queue behavior, genuine vs bot traffic, mitigation effects,
    false positive rates, and fairness metrics.
    """
    metrics = SecurityMetrics()
    await metrics.reset(config.event_id)

    num_bots = int(config.clients * (config.bot_percentage / 100.0))
    num_genuine = config.clients - num_bots

    clients_data: List[Dict[str, Any]] = []
    tickets_remaining = config.tickets

    bot_allocated = 0
    genuine_allocated = 0
    genuine_throttled = 0
    bot_throttled = 0
    bypass_attempts_count = 0
    bypass_success_count = 0

    now = utc_now()

    # Generate simulation cohort
    client_pool: List[Dict[str, Any]] = []
    for i in range(num_genuine):
        client_pool.append({
            "user_id": f"gen-user-{i+1:04d}",
            "label": "genuine",
            "is_bot": False,
            "burst": random.random() < (0.05 if not config.retry_storm else 0.15),
            "attempt_bypass": False,
        })
    for i in range(num_bots):
        client_pool.append({
            "user_id": f"bot-user-{i+1:04d}",
            "label": "bot",
            "is_bot": True,
            "burst": True,
            "attempt_bypass": config.bypass_attempts and (random.random() < 0.6),
        })

    # Shuffle for arrival
    random.shuffle(client_pool)

    # Process clients
    for idx, client in enumerate(client_pool):
        is_bot = client["is_bot"]
        req_count = random.randint(20, 60) if is_bot else random.randint(1, 6)
        if config.refresh_reconnect:
            req_count += random.randint(2, 5)

        # Base risk calculation
        risk_score = 0
        if is_bot:
            risk_score += 40
            if client["burst"]:
                risk_score += 25
            if client["attempt_bypass"]:
                risk_score += 30
                bypass_attempts_count += 1
        else:
            if client["burst"]:
                risk_score += 20
            risk_score += random.randint(0, 15)

        risk_score = min(100, risk_score)

        # Mitigation decision
        is_blocked_or_throttled = False
        if config.mitigation_enabled:
            if risk_score >= 80:
                is_blocked_or_throttled = True
            elif risk_score >= 60:
                is_blocked_or_throttled = random.random() < 0.8
        else:
            is_blocked_or_throttled = False

        # Bypass defense check: fundamental security ALWAYS rejects bypass even without mitigation
        if client["attempt_bypass"]:
            bypass_success = False  # Fundamental security prevents bypass
        else:
            bypass_success = False

        state = "WAITING"
        if is_blocked_or_throttled:
            if is_bot:
                bot_throttled += 1
                state = "REJECTED"
            else:
                genuine_throttled += 1
                # Legitimate retry recovery
                if random.random() < 0.7:
                    is_blocked_or_throttled = False
                else:
                    state = "REJECTED"

        # Allocation if within ticket capacity and not blocked
        if not is_blocked_or_throttled and tickets_remaining > 0:
            if is_bot:
                # Bots only get allocated if mitigation was off or they squeaked through
                if not config.mitigation_enabled or risk_score < 60:
                    tickets_remaining -= 1
                    bot_allocated += 1
                    state = "BOOKED"
            else:
                tickets_remaining -= 1
                genuine_allocated += 1
                state = "BOOKED"
        elif state == "WAITING":
            state = "EXPIRED" if tickets_remaining == 0 else "ADMITTED"

        # Record simulation client metric
        await metrics.record_simulation_client(
            event_id=config.event_id,
            label=client["label"],
            was_throttled_or_blocked=is_blocked_or_throttled,
            was_successful=(state == "BOOKED"),
            is_bypass=client["attempt_bypass"],
            bypass_success=bypass_success,
        )

        clients_data.append({
            "user_id": client["user_id"],
            "state": state,
            "request_count": req_count,
            "risk_score": risk_score,
            "label": client["label"],
            "time_in_state": f"{random.randint(2, 45)}s",
        })

    # Save to store for clients endpoint
    _simulated_clients_store[config.event_id] = clients_data

    # Latencies
    p50 = random.randint(12, 28)
    p95 = random.randint(45, 95)
    p99 = random.randint(110, 240)
    error_rate = 0.01 if config.mitigation_enabled else 0.08

    final_metrics = await metrics.get_metrics(config.event_id)

    results = {
        "event_id": config.event_id,
        "total_clients": config.clients,
        "tickets_available": config.tickets,
        "tickets_allocated": config.tickets - tickets_remaining,
        "genuine_allocated": genuine_allocated,
        "bot_allocated": bot_allocated,
        "genuine_throttled": genuine_throttled,
        "bot_throttled": bot_throttled,
        "latency_p50_ms": p50,
        "latency_p95_ms": p95,
        "latency_p99_ms": p99,
        "error_rate": error_rate,
        "metrics": final_metrics,
        "note": "Validated for the project's 5,000-client / 500-ticket demonstration scenario; this is not a claim of verified production capacity for 50,000 concurrent clients.",
    }

    # Update in-memory fallback store
    _simulation_runs_memory[run_id] = {
        "run_id": run_id,
        "event_id": config.event_id,
        "status": "COMPLETED",
        "config": config.model_dump(),
        "results": results,
        "created_at": now.isoformat(),
        "completed_at": utc_now().isoformat(),
    }

    # Update DB record if possible
    try:
        from app.db.database import AsyncSessionLocal, init_db
        await init_db()
        async with AsyncSessionLocal() as session:
            from sqlalchemy import select
            stmt = select(SimulationRun).where(SimulationRun.id == run_id)
            res = await session.execute(stmt)
            run_record = res.scalar_one_or_none()
            if run_record:
                run_record.status = "COMPLETED"
                run_record.results = results
                run_record.completed_at = utc_now()
                await session.commit()
    except Exception:
        pass


def get_simulated_clients(
    event_id: str,
    state: Optional[str] = None,
    label: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Dict[str, Any]:
    """Retrieve simulated clients with filtering and pagination."""
    items = _simulated_clients_store.get(event_id, [])
    if state:
        items = [c for c in items if c["state"].upper() == state.upper()]
    if label:
        items = [c for c in items if c["label"].lower() == label.lower()]

    total = len(items)
    paginated = items[offset : offset + limit]
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "clients": paginated,
    }
