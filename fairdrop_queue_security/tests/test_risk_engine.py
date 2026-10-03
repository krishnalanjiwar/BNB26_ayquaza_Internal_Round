import pytest
from app.security.signals import SignalTracker
from app.security.risk_engine import RiskEngine


@pytest.mark.asyncio
async def test_risk_score_increases_with_abuse_signals(setup_fake_redis):
    """18. Risk score increases deterministically when abuse signals occur."""
    tracker = SignalTracker(setup_fake_redis)
    engine = RiskEngine(tracker)

    # Initial state: no signals
    initial = await engine.evaluate_risk("user-test-risk")
    assert initial.score == 0
    assert initial.recommended_action == "ALLOW"

    # Add burst signal (+20)
    await tracker.record_signal("user-test-risk", "high_request_burst", 1)
    eval1 = await engine.evaluate_risk("user-test-risk")
    assert eval1.score >= 20

    # Add bypass attempt (+30) and invalid token (+20) -> score >= 70 (THROTTLE)
    await tracker.record_signal("user-test-risk", "bypass_attempt", 1)
    await tracker.record_signal("user-test-risk", "invalid_token", 1)
    eval2 = await engine.evaluate_risk("user-test-risk")
    assert eval2.score >= 70
    assert eval2.recommended_action in ("THROTTLE", "TEMPORARY_BLOCK")

    # Add more violations pushing past 80 -> TEMPORARY_BLOCK
    await tracker.record_signal("user-test-risk", "rate_limit_violations", 2)
    eval3 = await engine.evaluate_risk("user-test-risk")
    assert eval3.score >= 80
    assert eval3.recommended_action == "TEMPORARY_BLOCK"
    assert len(eval3.reasons) > 0
