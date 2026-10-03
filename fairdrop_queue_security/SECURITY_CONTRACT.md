# Fair Drop — Security Contract & Threat Mitigation

## 1. Rate Limiting
- **Mechanism**: Redis sliding window / token bucket per-entity tracking.
- **Separation**: User/session limits (`20 req/s`) and IP limits (`100 req/s`) operate independently. Independent users on a shared NAT or campus IP are not penalized by each other's traffic.
- **Endpoint Weights**:
  - `join_queue`: 1
  - `queue_status`: 1
  - `reserve`: 3
  - `payment`: 1
- **Responses**: Returns `allowed`, `retry_after`, `remaining`, and `limit`. HTTP 429 carries both `Retry-After` headers and a JSON `retry_after` countdown integer.

---

## 2. Abuse Signals
The security engine tracks non-intrusive behavioral signals without ML or invasive client fingerprinting:
- `high_request_burst`: > 25 requests across a 2-second sliding interval (+20 risk)
- `repeated_reserve`: Repeated reservation attempts without queue admission (+15 risk)
- `invalid_token`: Tampered or invalid queue admission tokens (+20 risk)
- `bypass_attempt`: Attempted access to reserve/inventory skipping the queue (+30 risk)
- `rate_limit_violations`: Repeatedly tripping bucket limits (+15 risk)
- `repeated_queue_joins`: Flooding join requests (+10 risk)

Signals decay using Redis TTLs (60 seconds) so users can recover naturally.

---

## 3. Risk Engine & Neutral Scoring
- **Range**: Deterministic 0–100 integer score.
- **Interpretation**: A high risk score indicates abnormal abuse signals, **NOT** proof of bot identity.
- **Thresholds**:
  - `0–59`: Normal (`ALLOW`)
  - `60–79`: Throttle (`THROTTLE`, retry delay enforced)
  - `80–100`: Temporary Block (`TEMPORARY_BLOCK`, default 30s TTL in Redis)

---

## 4. Mitigation Switch (`MITIGATION_ENABLED`)
- **`MITIGATION_ENABLED=true`**: Dynamic risk-based throttling and temporary blocks are enforced.
- **`MITIGATION_ENABLED=false`**: Silent observation mode. Abuse signals, risk scores, logs, and fairness metrics are calculated and logged, but no risk-based blocks or throttles are executed.
- **Fundamental Security Guarantee**: Regardless of `MITIGATION_ENABLED` setting, fundamental security is **ALWAYS** enforced:
  - Missing or invalid Bearer authentication is rejected (`401`).
  - Cryptographically invalid or forged queue tokens are rejected (`403`).
  - Expired tokens or wrong-event tokens are rejected (`410` / `403`).
  - Non-admitted queue entries cannot pass admission validation.

---

## 5. Temporary Blocks
- Applied via Redis keys (`fairdrop:block:{entity}:{id}`) with a configured TTL (`SECURITY_BLOCK_SECONDS=30`).
- No permanent IP or user bans. Once the TTL expires, the entity can immediately resume normal interactions.

---

## 6. Queue Bypass Detection
- Invoked when endpoints or reservation integration receive requests without a valid, server-issued queue token.
- Recorded via `record_queue_bypass_attempt(user_id, event_id, reason)`.
- Automatically logs security events and inflates abuse signals (+30 risk).

---

## 7. Security Logging & Data Sanitization
- Formatted as structured JSON with UTC timestamps, event ID, user ID, client IP, endpoint, decision, score, and reasons.
- **Data Protection Guarantee**: Raw passwords, session secrets, bearer tokens, and queue tokens are **NEVER** logged. Any sensitive tokens are strictly masked (`eyJh...9xZ1`) or omitted.

---

## 8. Fairness Metrics & Simulation-Only Bot Labels
In production, no backend can reliably label humans vs bots with 100% certainty without invasive surveillance. Therefore:
- Bot labels (`genuine` vs `bot`) exist **strictly in simulation experiments**.
- Simulation fairness metrics:
  - **False Positive Rate**: $\frac{\text{genuine clients throttled or blocked}}{\text{total genuine clients exposed}}$
  - **Bot Allocation Rate**: $\frac{\text{tickets allocated to bot-labeled simulation clients}}{\text{total tickets allocated}}$
  - **Legitimate Success Rate**: $\frac{\text{tickets allocated to genuine simulation clients}}{\text{total genuine clients}}$
  - **Bypass Rate**: $\frac{\text{unauthorized bypasses admitted}}{\text{total bypass attempts}}$ (enforced at 0.0%)
  - **Recovery Rate**: $\frac{\text{throttled genuine clients who successfully complete}}{\text{total throttled genuine clients}}$
