import logging
from typing import Optional
from app.security.signals import SignalTracker
from app.security.metrics import SecurityMetrics
from app.security.logger import log_security_event

logger = logging.getLogger("fairdrop.bypass")


async def record_queue_bypass_attempt(
    user_id: str,
    event_id: str,
    reason: str,
    ip_address: Optional[str] = None,
    signal_tracker: Optional[SignalTracker] = None,
    metrics: Optional[SecurityMetrics] = None,
) -> None:
    """
    Record an unauthorized queue bypass attempt (e.g., reserve attempted without valid queue token).
    Increments bypass abuse signals and increases risk score.
    """
    st = signal_tracker or SignalTracker()
    sm = metrics or SecurityMetrics()

    # Record signal on user and ip
    await st.record_bypass_attempt(user_id)
    if ip_address:
        await st.record_bypass_attempt(ip_address)

    # Record metric
    await sm.record_violation(event_id, "bypass_attempts")

    log_security_event(
        decision="REJECT",
        score=85,
        reasons=["queue_bypass_detected", reason],
        mitigation_enabled=True,
        endpoint="reserve_bypass",
        event_id=event_id,
        user_id=user_id,
        ip_address=ip_address,
        extra={"bypass_reason": reason},
    )

    logger.warning(
        f"Queue bypass attempt detected for user={user_id}, event={event_id}: {reason}"
    )
