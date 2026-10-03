from typing import Optional, List, Dict, Any
from app.core.config import get_settings
from app.security.rate_limiter import RateLimiter, RateLimitResult
from app.security.signals import SignalTracker
from app.security.risk_engine import RiskEngine
from app.security.logger import log_security_event
from app.security.metrics import SecurityMetrics


async def evaluate_request(
    ip_address: str,
    user_id: Optional[str] = None,
    endpoint: str = "queue_status",
    event_id: Optional[str] = None,
    idempotency_key: Optional[str] = None,
    is_fundamental_violation: bool = False,
    violation_reason: Optional[str] = None,
    rate_limiter: Optional[RateLimiter] = None,
    risk_engine: Optional[RiskEngine] = None,
    signal_tracker: Optional[SignalTracker] = None,
    metrics: Optional[SecurityMetrics] = None,
) -> Dict[str, Any]:
    """
    Evaluate incoming request security and return authoritative decision.
    Decisions: ALLOW, THROTTLE, TEMPORARY_BLOCK, REJECT.
    Respects MITIGATION_ENABLED for risk-based decisions while preserving fundamental security.
    """
    settings = get_settings()
    rl = rate_limiter or RateLimiter()
    re = risk_engine or RiskEngine()
    st = signal_tracker or SignalTracker()
    sm = metrics or SecurityMetrics()

    # 1. Fundamental security violations (e.g. invalid signature, wrong user)
    # Always REJECT regardless of MITIGATION_ENABLED setting.
    if is_fundamental_violation:
        reason = violation_reason or "fundamental_security_violation"
        target_id = user_id or ip_address
        await st.record_signal(target_id, "invalid_token", 1)
        if event_id:
            await sm.record_violation(event_id, "invalid_token_attempts")
            await sm.record_request(event_id, "reject")

        log_security_event(
            decision="REJECT",
            score=90,
            reasons=[reason],
            mitigation_enabled=settings.MITIGATION_ENABLED,
            endpoint=endpoint,
            event_id=event_id,
            user_id=user_id,
            ip_address=ip_address,
        )
        return {
            "decision": "REJECT",
            "score": 90,
            "reasons": [reason],
            "retry_after": 0,
        }

    # 2. Check Idempotency Key (prevents legitimate retries from triggering abuse signals)
    is_idempotent_retry = False
    if idempotency_key and user_id:
        is_idempotent_retry = await st.check_and_record_idempotency_key(user_id, idempotency_key)

    # 3. Check burst patterns if not a recognized idempotent retry
    if not is_idempotent_retry:
        await st.record_request_burst(user_id or ip_address)

    # 4. Check Rate Limits
    rl_res: RateLimitResult = await rl.check_rate_limits(
        ip_address=ip_address,
        user_id=user_id,
        endpoint_name=endpoint,
    )

    if not rl_res.allowed:
        await st.record_rate_limit_violation(user_id or ip_address)
        if event_id:
            await sm.record_violation(event_id, "rate_limit_violations")

    # 5. Evaluate Risk Score
    user_eval = await re.evaluate_risk(user_id) if user_id else None
    ip_eval = await re.evaluate_risk(ip_address)

    combined_score = max(user_eval.score if user_eval else 0, ip_eval.score)
    combined_reasons = []
    if user_eval and user_eval.reasons:
        combined_reasons.extend(user_eval.reasons)
    if ip_eval and ip_eval.reasons:
        combined_reasons.extend(ip_eval.reasons)
    # Deduplicate reasons while preserving order
    unique_reasons = list(dict.fromkeys(combined_reasons))

    # 6. Synthesize Final Decision
    decision = "ALLOW"
    retry_after = 0

    if not rl_res.allowed:
        if rl_res.limit == 0:  # Active temporary block
            decision = "TEMPORARY_BLOCK"
        else:
            decision = "THROTTLE"
        retry_after = rl_res.retry_after
    else:
        # Evaluate risk score thresholds
        if combined_score >= settings.RISK_BLOCK_THRESHOLD:
            if settings.MITIGATION_ENABLED:
                decision = "TEMPORARY_BLOCK"
                retry_after = settings.SECURITY_BLOCK_SECONDS
                # Place temporary block in Redis
                target_type = "user" if user_id else "ip"
                target_id = user_id or ip_address
                await rl.apply_temporary_block(target_type, target_id, retry_after)
            else:
                decision = "ALLOW"
                retry_after = 0
        elif combined_score >= settings.RISK_THROTTLE_THRESHOLD:
            if settings.MITIGATION_ENABLED:
                decision = "THROTTLE"
                retry_after = 5
            else:
                decision = "ALLOW"
                retry_after = 0
        else:
            decision = "ALLOW"
            retry_after = 0

    # 7. Record Decision in Metrics
    if event_id:
        await sm.record_request(event_id, decision)

    # 8. Structured Security Log
    log_security_event(
        decision=decision,
        score=combined_score,
        reasons=unique_reasons,
        mitigation_enabled=settings.MITIGATION_ENABLED,
        endpoint=endpoint,
        event_id=event_id,
        user_id=user_id,
        ip_address=ip_address,
        rate_limit_result={
            "allowed": rl_res.allowed,
            "remaining": rl_res.remaining,
            "retry_after": rl_res.retry_after,
        },
    )

    return {
        "decision": decision,
        "score": combined_score,
        "reasons": unique_reasons,
        "retry_after": retry_after,
    }
