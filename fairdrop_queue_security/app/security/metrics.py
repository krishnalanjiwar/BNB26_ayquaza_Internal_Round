from typing import Dict, Any, Optional
import redis.asyncio as aioredis
from app.queue.redis_queue import get_redis_client


class SecurityMetrics:
    def __init__(self, client: Optional[aioredis.Redis] = None):
        self._client = client

    @property
    def client(self) -> aioredis.Redis:
        return self._client or get_redis_client()

    def _key(self, event_id: str) -> str:
        return f"fairdrop:metrics:{event_id}"

    async def increment(self, event_id: str, field: str, amount: int = 1) -> int:
        return await self.client.hincrby(self._key(event_id), field, amount)

    async def record_request(self, event_id: str, decision: str) -> None:
        """Record general request decision counts."""
        key = self._key(event_id)
        pipe = self.client.pipeline()
        pipe.hincrby(key, "total_requests", 1)
        decision_lower = decision.lower()
        if decision_lower == "allow":
            pipe.hincrby(key, "allowed", 1)
        elif decision_lower == "throttle":
            pipe.hincrby(key, "throttled", 1)
        elif decision_lower in ("temporary_block", "block", "blocked"):
            pipe.hincrby(key, "temporary_blocks", 1)
        elif decision_lower in ("reject", "rejected"):
            pipe.hincrby(key, "rejected", 1)
        await pipe.execute()

    async def record_violation(self, event_id: str, violation_type: str, count: int = 1) -> None:
        valid_types = {
            "rate_limit_violations",
            "invalid_token_attempts",
            "bypass_attempts",
        }
        if violation_type in valid_types:
            await self.client.hincrby(self._key(event_id), violation_type, count)

    async def record_simulation_client(
        self,
        event_id: str,
        label: str,
        was_throttled_or_blocked: bool = False,
        was_successful: bool = False,
        is_bypass: bool = False,
        bypass_success: bool = False,
    ) -> None:
        """Record simulation-only tagged data."""
        key = self._key(event_id)
        pipe = self.client.pipeline()
        if label == "genuine":
            pipe.hincrby(key, "sim_genuine_clients", 1)
            if was_throttled_or_blocked:
                pipe.hincrby(key, "sim_genuine_throttled_or_blocked", 1)
            if was_successful:
                pipe.hincrby(key, "sim_genuine_success", 1)
        elif label == "bot":
            pipe.hincrby(key, "sim_bot_clients", 1)
            if was_throttled_or_blocked:
                pipe.hincrby(key, "sim_bot_throttled_or_blocked", 1)
            if was_successful:
                pipe.hincrby(key, "sim_bot_success", 1)

        if is_bypass:
            pipe.hincrby(key, "sim_bypass_attempts", 1)
            if bypass_success:
                pipe.hincrby(key, "sim_bypass_success", 1)

        await pipe.execute()

    async def get_metrics(self, event_id: str) -> Dict[str, Any]:
        """Fetch raw metrics and computed fairness ratios."""
        raw = await self.client.hgetall(self._key(event_id))
        metrics = {k: int(v) for k, v in raw.items()}

        total_requests = metrics.get("total_requests", 0)
        allowed = metrics.get("allowed", 0)
        throttled = metrics.get("throttled", 0)
        temporary_blocks = metrics.get("temporary_blocks", 0)
        rejected = metrics.get("rejected", 0)
        rate_limit_violations = metrics.get("rate_limit_violations", 0)
        invalid_token_attempts = metrics.get("invalid_token_attempts", 0)
        bypass_attempts = metrics.get("bypass_attempts", 0)

        # Simulation metrics calculation
        sim_genuine_clients = metrics.get("sim_genuine_clients", 0)
        sim_bot_clients = metrics.get("sim_bot_clients", 0)
        sim_genuine_throttled_or_blocked = metrics.get("sim_genuine_throttled_or_blocked", 0)
        sim_bot_throttled_or_blocked = metrics.get("sim_bot_throttled_or_blocked", 0)
        sim_genuine_success = metrics.get("sim_genuine_success", 0)
        sim_bot_success = metrics.get("sim_bot_success", 0)
        sim_bypass_attempts = metrics.get("sim_bypass_attempts", 0)
        sim_bypass_success = metrics.get("sim_bypass_success", 0)

        # Fairness metrics (simulation-only controlled metrics)
        false_positive_rate = (
            round(sim_genuine_throttled_or_blocked / sim_genuine_clients, 4)
            if sim_genuine_clients > 0
            else 0.0
        )

        total_allocations = sim_genuine_success + sim_bot_success
        bot_allocation_rate = (
            round(sim_bot_success / total_allocations, 4)
            if total_allocations > 0
            else 0.0
        )

        legitimate_success_rate = (
            round(sim_genuine_success / sim_genuine_clients, 4)
            if sim_genuine_clients > 0
            else 0.0
        )

        bypass_rate = (
            round(sim_bypass_success / sim_bypass_attempts, 4)
            if sim_bypass_attempts > 0
            else 0.0
        )

        # Recovery rate (percentage of throttled legitimate users who subsequently succeed)
        recovery_rate = (
            round(sim_genuine_success / max(1, sim_genuine_throttled_or_blocked), 4)
            if sim_genuine_throttled_or_blocked > 0
            else 1.0
        )

        return {
            "total_requests": total_requests,
            "allowed": allowed,
            "throttled": throttled,
            "temporary_blocks": temporary_blocks,
            "rejected": rejected,
            "rate_limit_violations": rate_limit_violations,
            "invalid_token_attempts": invalid_token_attempts,
            "bypass_attempts": bypass_attempts,
            # Simulation fairness metrics
            "sim_genuine_clients": sim_genuine_clients,
            "sim_bot_clients": sim_bot_clients,
            "false_positive_rate": false_positive_rate,
            "bot_allocation_rate": bot_allocation_rate,
            "legitimate_success_rate": legitimate_success_rate,
            "bypass_rate": bypass_rate,
            "recovery_rate": recovery_rate,
        }

    async def reset(self, event_id: str) -> None:
        await self.client.delete(self._key(event_id))
