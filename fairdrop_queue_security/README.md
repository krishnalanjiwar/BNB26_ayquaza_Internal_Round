# Fair Drop — Queue + Security Backend Component

> **Notice**: Validated for the project's 5,000-client / 500-ticket demonstration scenario; this is not a claim of verified production capacity for 50,000 concurrent clients.

Fair Drop is a high-demand ticket sale queue and security backend component designed to prevent bot hoarders, enforce deterministic FIFO waiting room admission, protect against distributed traffic storms, and provide authoritative position telemetry to buyer frontends.

---

## 1. What This Component Does

### Queue Management
- **Authoritative FIFO Queue**: Redis Sorted Sets with server-generated monotonic arrival sequences. Clients cannot tamper with arrival order.
- **Idempotent Join**: Repeated joins (`POST /events/{event_id}/join-queue`) return the existing entry without moving the user backward or reallocating positions.
- **Waiting Room Telemetry**: Periodic polling (`GET /queue/{entry_id}`) returns authoritative server position, ahead count, and estimated wait time (ETA).
- **Admission Worker**: Atomic batch admission (`ZPOPMIN`) moving users from `WAITING` to `ADMITTED` at configurable rates (e.g. 50/sec), safe against concurrent multi-worker execution.
- **Signed Queue Admission Token**: HMAC-SHA256 signed JWT cryptographically binding `user_id`, `event_id`, and `queue_entry_id` with a strict expiry hold window.
- **State Machine**: Enforces strict transitions: `WAITING` $\rightarrow$ `ADMITTED` $\rightarrow$ `RESERVATION_HELD` $\rightarrow$ `BOOKED`, with terminal `EXPIRED` and `REJECTED` states.

### Security & Abuse Mitigation
- **Dual Entity Rate Limiting**: Independent IP (100 req/s) and User (20 req/s) sliding window limits. Users sharing an IP/NAT are never penalized by each other's traffic.
- **Transparent Abuse Signals**: Tracks burst rates, repeated joins, bypass attempts, invalid tokens, and rate-limit violations without invasive fingerprinting or machine learning.
- **Deterministic Risk Engine**: Generates a neutral 0–100 abuse score.
- **Mitigation Switch (`MITIGATION_ENABLED`)**: Toggles active risk-based throttling/blocking while preserving fundamental cryptographic and token authentication.
- **Temporary Blocks**: Redis TTL-based blocks (default 30s) allowing natural user recovery without permanent bans.
- **Queue Bypass Detection**: Flags direct attempts to reserve tickets without valid admission tokens.
- **Simulation Lab & Fairness Analytics**: Simulates up to 5,000 clients and calculates legitimate success rate, bot allocation rate, false positive rate, bypass rate, and recovery rate.

---

## 2. Component URLs

- **Backend Base URL**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **Expected Frontend**: `http://localhost:3000`

---

## 3. Folder Structure

```
fairdrop_queue_security/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI app, lifespan, CORS, and routers
│   ├── api/
│   │   ├── __init__.py
│   │   ├── queue_routes.py         # Buyer join-queue, queue status, dev token
│   │   └── admin_routes.py         # Admin metrics, clients inspector, simulation lab
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py               # Pydantic BaseSettings configuration
│   │   ├── auth.py                 # Dev session JWT auth and dependencies
│   │   └── errors.py               # Frontend-compatible error shapes and handlers
│   ├── db/
│   │   ├── __init__.py
│   │   ├── database.py             # SQLAlchemy 2.x async engine & session maker
│   │   └── models.py               # QueueEntry, SimulationRun models
│   ├── queue/
│   │   ├── __init__.py
│   │   ├── redis_queue.py          # Redis FIFO queue (sorted sets + monotonic seq)
│   │   ├── service.py              # Queue business logic and token validation
│   │   ├── state_machine.py        # Queue state enum & transition rules
│   │   ├── admission_worker.py     # Background FIFO admission worker
│   │   └── integration.py          # Integration functions for Role 1 reservation backend
│   └── security/
│       ├── __init__.py
│       ├── rate_limiter.py         # Sliding window rate limiter & temporary block
│       ├── signals.py              # Abuse signals and idempotency key tracker
│       ├── risk_engine.py          # Deterministic 0-100 risk scoring
│       ├── decisions.py            # Decision synthesizer (ALLOW, THROTTLE, BLOCK, REJECT)
│       ├── bypass.py               # Queue bypass detection
│       ├── logger.py               # Sanitized structured security logger
│       ├── metrics.py              # Metrics collector & fairness analytics
│       └── simulation.py           # Simulation lab service (5,000 clients / 500 tickets)
├── tests/
│   ├── __init__.py
│   ├── conftest.py                 # In-memory async SQLite, fakeredis, test client
│   ├── test_queue.py               # Join queue, idempotency, FIFO, status
│   ├── test_admission.py           # Batch admission & duplicate prevention
│   ├── test_queue_token.py         # Token validity, user binding, event binding, expiry
│   ├── test_state_machine.py       # State machine transition rules
│   ├── test_rate_limiter.py        # Independent limits & temporary block
│   ├── test_risk_engine.py         # Risk scoring & signal weights
│   ├── test_security.py            # Mitigation switch, bypass detection, logs
│   ├── test_admin.py               # Admin metrics, clients, simulation lifecycle
│   └── test_integration.py         # Reservation backend integration & API contracts
├── requirements.txt
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── pytest.ini
├── README.md
├── API_CONTRACT.md
├── SECURITY_CONTRACT.md
└── .gitignore
```

---

## 4. Setup & Running Locally

### Prerequisites
- Python 3.11+
- Redis (or in-memory mock for development/tests)

### 1. Install Dependencies
```bash
cd fairdrop_queue_security
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
cp .env.example .env
```
*(By default, `.env` uses SQLite `sqlite+aiosqlite:///./fairdrop.db` for zero-setup local development, and connects to Redis at `redis://localhost:6379/0`)*.

### 3. Run FastAPI Locally
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Swagger UI will be live at `http://localhost:8000/docs`.

---

## 5. Running with Docker Compose

To run the complete production-style environment (PostgreSQL 15 + Redis 7 + FastAPI backend):

```bash
cd fairdrop_queue_security
docker-compose up --build
```
Services started:
- `backend`: FastAPI running on port 8000
- `postgres`: PostgreSQL 15 on port 5432
- `redis`: Redis 7 on port 6379

---

## 6. Running Tests

Run the comprehensive 31-test test suite:
```bash
cd fairdrop_queue_security
pytest -v
```

All tests execute against an in-memory SQLite database and `fakeredis`, requiring no external servers running.

---

## 7. How the Frontend Connects

The Next.js frontend (at `http://localhost:3000`) communicates with this backend as follows:

1. **Obtain Dev Session Token**:
   - `POST /auth/dev-token` with `{"user_id": "buyer-123"}`
   - Header for subsequent calls: `Authorization: Bearer <access_token>`
2. **Join Waiting Room**:
   - `POST /events/{event_id}/join-queue`
   - Receives `{ "entry_id": "...", "state": "WAITING", "position": 120 }`
3. **Poll Waiting Room**:
   - `GET /queue/{entry_id}` approximately every 2 seconds
   - Receives authoritative position, ahead count, and ETA
   - When admitted, returns `{ "state": "ADMITTED", "queue_token": "...", "hold_expires_at": "..." }`
4. **Admin Dashboard & Simulation Lab**:
   - Metrics: `GET /admin/events/{event_id}/metrics`
   - Live Clients: `GET /admin/events/{event_id}/clients`
   - Simulation: `POST /admin/simulations` and `GET /admin/simulations/{run_id}`

---

## 8. Integration for the Reservation Backend (Role 1)

Another teammate owns the inventory and ticket reservation logic (`POST /events/{id}/reserve`).

Before reserving a ticket, the reservation backend calls:
```python
from app.queue.integration import (
    validate_queue_admission_for_reservation,
    mark_reservation_held,
    mark_booking_complete,
)

# In the reservation route handler:
result = await validate_queue_admission_for_reservation(
    session_user_id=current_user_id,
    event_id=event_id,
    queue_entry_id=request.queue_entry_id,
    queue_token=request.queue_token,
    db=db_session,
    ip_address=request.client.host,
    idempotency_key=request.headers.get("Idempotency-Key"),
)

if not result["success"]:
    # Block reservation: return HTTP 403 or 429
    return JSONResponse(status_code=403, content={"error": result["reason"]})

# Step 2: Attempt inventory reservation
# Once inventory hold succeeds:
await mark_reservation_held(request.queue_entry_id, db=db_session)
```

This guarantees:
- No user can reserve without server-controlled queue admission.
- Bypasses automatically increase client risk scores.
- Idempotent retries are respected without false abuse triggers.
- Inventory is strictly owned by Role 1.

---

## 9. Limitations & Explicit Scope Boundaries

1. **Demonstration Scale**:
   - Validated for the project's **5,000-client / 500-ticket demonstration scenario**; this is not a claim of verified production capacity for 50,000 concurrent clients.
2. **Simplified Authentication**:
   - Uses lightweight HMAC-signed session tokens suitable for development and demo pairing. Production deployments should connect to an external OAuth2/OIDC identity provider.
3. **Inventory Separation**:
   - This component **strictly owns queue admission and security**. Inventory allocation, locking, and payment gateway interactions are delegated to Role 1.
