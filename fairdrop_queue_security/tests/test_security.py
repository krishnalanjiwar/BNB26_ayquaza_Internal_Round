import pytest
import json
from app.core.config import get_settings
from app.security.decisions import evaluate_request
from app.security.signals import SignalTracker
from app.security.metrics import SecurityMetrics
from app.security.bypass import record_queue_bypass_attempt
from app.security.logger import log_security_event, mask_token


@pytest.mark.asyncio
async def test_normal_request_returns_allow(setup_fake_redis):
    """19. Normal, unflagged request returns ALLOW with 0 score."""
    dec = await evaluate_request(
        ip_address="10.1.1.1",
        user_id="normal-user",
        endpoint="queue_status",
    )
    assert dec["decision"] == "ALLOW"
    assert dec["score"] < 60
    assert dec["retry_after"] == 0


@pytest.mark.asyncio
async def test_high_risk_returns_throttle_or_block(setup_fake_redis):
    """20. High risk returns THROTTLE or TEMPORARY_BLOCK."""
    st = SignalTracker(setup_fake_redis)
    # Inflate signals
    await st.record_signal("risky-user", "bypass_attempt", 2)  # +60
    await st.record_signal("risky-user", "invalid_token", 2)    # +40

    dec = await evaluate_request(
        ip_address="10.1.1.2",
        user_id="risky-user",
        signal_tracker=st,
    )
    assert dec["decision"] in ("THROTTLE", "TEMPORARY_BLOCK")
    assert dec["score"] >= 60


@pytest.mark.asyncio
async def test_mitigation_switch_disabled_prevents_risk_blocking(monkeypatch, setup_fake_redis):
    """21. MITIGATION_ENABLED=false prevents risk-based blocking but records signals and score."""
    settings = get_settings()
    monkeypatch.setattr(settings, "MITIGATION_ENABLED", False)

    st = SignalTracker(setup_fake_redis)
    await st.record_signal("risky-user-2", "bypass_attempt", 3)

    dec = await evaluate_request(
        ip_address="10.1.1.3",
        user_id="risky-user-2",
        signal_tracker=st,
    )
    # When mitigation is disabled, risk decision becomes ALLOW (monitoring mode)
    assert dec["decision"] == "ALLOW"
    assert dec["score"] >= 60


@pytest.mark.asyncio
async def test_fundamental_security_still_rejects_with_mitigation_disabled(monkeypatch, setup_fake_redis):
    """22. Fundamental security (invalid signature, wrong token) STILL rejects even when mitigation is disabled."""
    settings = get_settings()
    monkeypatch.setattr(settings, "MITIGATION_ENABLED", False)

    dec = await evaluate_request(
        ip_address="10.1.1.4",
        user_id="hacker",
        is_fundamental_violation=True,
        violation_reason="tampered_token_signature",
    )
    assert dec["decision"] == "REJECT"


@pytest.mark.asyncio
async def test_bypass_attempt_is_recorded(setup_fake_redis):
    """24. Queue bypass attempt records abuse signals and increments violation metrics."""
    st = SignalTracker(setup_fake_redis)
    sm = SecurityMetrics(setup_fake_redis)

    await record_queue_bypass_attempt(
        user_id="bypass-user",
        event_id="evt-sec",
        reason="attempted_reserve_without_queue_token",
        signal_tracker=st,
        metrics=sm,
    )

    signals = await st.get_signals("bypass-user")
    assert signals.get("bypass_attempt", 0) >= 1

    metrics = await sm.get_metrics("evt-sec")
    assert metrics["bypass_attempts"] >= 1


def test_sensitive_tokens_not_written_to_logs():
    """25. Sensitive tokens are masked or omitted in security logs."""
    raw_secret = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.supersecretpayload12345678"
    masked = mask_token(raw_secret)
    assert masked != raw_secret
    assert "..." in masked

    log_entry = log_security_event(
        decision="REJECT",
        score=90,
        reasons=["invalid_token"],
        mitigation_enabled=True,
        endpoint="reserve",
        extra={"queue_token": raw_secret},
    )
    assert raw_secret not in json.dumps(log_entry)


@pytest.mark.asyncio
async def test_metrics_update_correctly(setup_fake_redis):
    """26. SecurityMetrics tracks requests, decisions, and violations."""
    sm = SecurityMetrics(setup_fake_redis)

    await sm.record_request("evt-m", "allow")
    await sm.record_request("evt-m", "throttle")
    await sm.record_request("evt-m", "temporary_block")
    await sm.record_violation("evt-m", "rate_limit_violations", 3)

    metrics = await sm.get_metrics("evt-m")
    assert metrics["total_requests"] == 3
    assert metrics["allowed"] == 1
    assert metrics["throttled"] == 1
    assert metrics["temporary_blocks"] == 1
    assert metrics["rate_limit_violations"] == 3
