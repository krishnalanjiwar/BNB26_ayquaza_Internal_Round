from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.models import QueueEntry, utc_now
from app.queue.service import validate_admission_token, ValidationResult
from app.queue.state_machine import QueueState, transition_state
from app.security.bypass import record_queue_bypass_attempt
from app.security.decisions import evaluate_request


async def validate_queue_admission_for_reservation(
    session_user_id: str,
    event_id: str,
    queue_entry_id: str,
    queue_token: str,
    db: AsyncSession,
    ip_address: str = "127.0.0.1",
    idempotency_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Public integration function for Role 1 (Reservation/Inventory) teammate.
    Call this function before executing POST /events/{id}/reserve.

    Returns:
    {
        "success": bool,
        "reason": str,
        "error_code": Optional[str],
        "queue_entry_id": Optional[str],
        "user_id": Optional[str],
        "retry_after": Optional[int]
    }
    """
    # 1. Validate queue admission token and database state
    val_result: ValidationResult = await validate_admission_token(
        session_user_id=session_user_id,
        event_id=event_id,
        queue_entry_id=queue_entry_id,
        queue_token=queue_token,
        db=db,
    )

    if not val_result.is_valid:
        # Record queue bypass attempt signal & metric
        await record_queue_bypass_attempt(
            user_id=session_user_id,
            event_id=event_id,
            reason=val_result.reason,
            ip_address=ip_address,
        )
        return {
            "success": False,
            "reason": val_result.reason,
            "error_code": "QUEUE_ADMISSION_INVALID",
            "queue_entry_id": queue_entry_id,
            "user_id": session_user_id,
            "retry_after": None,
        }

    # 2. Check security layer (rate limits & risk evaluation for reservation endpoint cost = 3)
    sec_decision = await evaluate_request(
        ip_address=ip_address,
        user_id=session_user_id,
        endpoint="reserve",
        event_id=event_id,
        idempotency_key=idempotency_key,
    )

    if sec_decision["decision"] in ("THROTTLE", "TEMPORARY_BLOCK", "REJECT"):
        return {
            "success": False,
            "reason": f"Request blocked by security layer: {sec_decision['decision']}",
            "error_code": "SECURITY_MITIGATION",
            "decision": sec_decision["decision"],
            "retry_after": sec_decision.get("retry_after", 5),
            "queue_entry_id": queue_entry_id,
            "user_id": session_user_id,
        }

    return {
        "success": True,
        "reason": "Queue admission verified and authorized for reservation",
        "error_code": None,
        "queue_entry_id": queue_entry_id,
        "user_id": session_user_id,
        "retry_after": None,
    }


async def mark_reservation_held(queue_entry_id: str, db: AsyncSession) -> bool:
    """Transition queue state ADMITTED -> RESERVATION_HELD."""
    stmt = select(QueueEntry).where(QueueEntry.id == queue_entry_id)
    res = await db.execute(stmt)
    entry = res.scalar_one_or_none()
    if not entry:
        return False
    entry.state = transition_state(entry.state, QueueState.RESERVATION_HELD.value).value
    entry.updated_at = utc_now()
    await db.commit()
    return True


async def mark_booking_complete(queue_entry_id: str, db: AsyncSession) -> bool:
    """Transition queue state RESERVATION_HELD -> BOOKED."""
    stmt = select(QueueEntry).where(QueueEntry.id == queue_entry_id)
    res = await db.execute(stmt)
    entry = res.scalar_one_or_none()
    if not entry:
        return False
    entry.state = transition_state(entry.state, QueueState.BOOKED.value).value
    entry.updated_at = utc_now()
    await db.commit()
    return True
