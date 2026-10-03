from typing import Dict, List, NamedTuple, Optional
from app.core.config import get_settings
from app.security.signals import SignalTracker


class RiskEvaluation(NamedTuple):
    score: int
    reasons: List[str]
    recommended_action: str


class RiskEngine:
    DEFAULT_WEIGHTS = {
        "high_request_burst": 20,
        "repeated_reserve": 15,
        "invalid_token": 20,
        "bypass_attempt": 30,
        "rate_limit_violations": 15,
        "repeated_queue_joins": 10,
    }

    def __init__(
        self,
        signal_tracker: Optional[SignalTracker] = None,
        weights: Optional[Dict[str, int]] = None,
    ):
        self.signal_tracker = signal_tracker or SignalTracker()
        self.weights = weights or self.DEFAULT_WEIGHTS

    def calculate_score_from_signals(self, signals: Dict[str, int]) -> RiskEvaluation:
        """
        Compute deterministic risk score (0-100) from observed abuse signals.
        Returns neutral abuse evaluation, not an identity/bot label.
        """
        settings = get_settings()
        score = 0
        reasons: List[str] = []

        for signal_name, count in signals.items():
            if count > 0 and signal_name in self.weights:
                weight = self.weights[signal_name]
                increment = min(weight * count, weight * 2)  # cap repeat multipliers per category
                score += increment
                reasons.append(f"{signal_name} (x{count})")

        score = min(100, max(0, score))

        if score >= settings.RISK_BLOCK_THRESHOLD:
            action = "TEMPORARY_BLOCK"
        elif score >= settings.RISK_THROTTLE_THRESHOLD:
            action = "THROTTLE"
        else:
            action = "ALLOW"

        return RiskEvaluation(score=score, reasons=reasons, recommended_action=action)

    async def evaluate_risk(self, identifier: str) -> RiskEvaluation:
        """Evaluate current risk level for given identifier (user_id or ip)."""
        signals = await self.signal_tracker.get_signals(identifier)
        return self.calculate_score_from_signals(signals)
