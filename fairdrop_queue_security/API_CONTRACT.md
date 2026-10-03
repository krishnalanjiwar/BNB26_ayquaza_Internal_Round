# Fair Drop — Queue & Security API Contract

## Overview & Base URL

- **Backend Base URL**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **Expected Frontend**: `http://localhost:3000`

---

## 1. Authentication & Authorization

All user queue endpoints require session Bearer authentication:
```http
Authorization: Bearer <session_token>
```

### Dev Token Generation (Utility)
```http
POST /auth/dev-token
Content-Type: application/json

{
  "user_id": "buyer-123"
}
```

Response (`200 OK`):
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "user_id": "buyer-123"
}
```

---

## 2. Queue States

The system strictly enforces these 6 state values:
- `WAITING`: Enqueued in FIFO waiting room. Server calculates authoritative position and ETA.
- `ADMITTED`: Admitted through FIFO queue worker; queue token issued with hold expiry window.
- `RESERVATION_HELD`: Ticket hold active in reservation backend.
- `BOOKED`: Ticket successfully booked.
- `EXPIRED`: Hold or queue admission expired without reservation completion.
- `REJECTED`: Rejected due to security violation, tampering, or queue capacity exhaustion.

---

## 3. Buyer Endpoints

### 3.1 Join Queue
Joins the FIFO queue for an event. Idempotent: repeated calls by the same user return the existing entry without losing position or moving backward.

```http
POST /events/{event_id}/join-queue
Authorization: Bearer <session_token>
```

Response (`200 OK`):
```json
{
  "entry_id": "945b1fa6-b378-4875-8ccd-7b1a906455bb",
  "state": "WAITING",
  "position": 142
}
```

If the user was already admitted, returns `queue_token` and `hold_expires_at`:
```json
{
  "entry_id": "945b1fa6-b378-4875-8ccd-7b1a906455bb",
  "state": "ADMITTED",
  "position": 0,
  "queue_token": "eyJhbGciOi...",
  "hold_expires_at": "2026-10-04T02:15:00Z"
}
```

### 3.2 Poll Queue Status
Polled by frontend waiting-room page every ~2 seconds. Position and ETA are calculated authoritatively by the server.

```http
GET /queue/{entry_id}
Authorization: Bearer <session_token>
```

Response while `WAITING` (`200 OK`):
```json
{
  "entry_id": "945b1fa6-b378-4875-8ccd-7b1a906455bb",
  "state": "WAITING",
  "position": 12,
  "ahead": 11,
  "eta_seconds": 1
}
```

Response when `ADMITTED` (`200 OK`):
```json
{
  "entry_id": "945b1fa6-b378-4875-8ccd-7b1a906455bb",
  "state": "ADMITTED",
  "position": 0,
  "ahead": 0,
  "eta_seconds": 0,
  "queue_token": "eyJhbGciOi...",
  "hold_expires_at": "2026-10-04T02:15:00Z"
}
```

Response when `EXPIRED` (`200 OK`):
```json
{
  "entry_id": "945b1fa6-b378-4875-8ccd-7b1a906455bb",
  "state": "EXPIRED",
  "position": 0,
  "ahead": 0,
  "eta_seconds": 0
}
```

---

## 4. Admin Endpoints

### 4.1 Admin Event Metrics
```http
GET /admin/events/{event_id}/metrics
```

Response (`200 OK`):
```json
{
  "event_id": "demo-event",
  "inventory": {
    "available_placeholder": 500,
    "owned_by": "Role_1_Reservation_Backend",
    "oversell_count": 0,
    "duplicate_count": 0
  },
  "oversell_count": 0,
  "duplicate_count": 0,
  "req_per_sec": 42.5,
  "latency_ms": { "p50": 18, "p95": 65, "p99": 140 },
  "p50": 18,
  "p95": 65,
  "p99": 140,
  "error_rate": 0.005,
  "decisions": {
    "allowed": 4120,
    "throttled": 120,
    "temporary_blocks": 45,
    "rejected": 15
  },
  "violations": {
    "rate_limit": 130,
    "invalid_tokens": 12,
    "bypass_attempts": 35
  },
  "queue_counts": {
    "WAITING": 350,
    "ADMITTED": 50,
    "RESERVATION_HELD": 20,
    "BOOKED": 480,
    "EXPIRED": 15,
    "REJECTED": 85
  },
  "legitimate_success_rate": 0.942,
  "bot_allocation_rate": 0.038,
  "false_positive_rate": 0.012,
  "bypass_rate": 0.0,
  "recovery_rate": 0.985
}
```

### 4.2 Admin Clients Inspector
```http
GET /admin/events/{event_id}/clients?state=WAITING&label=genuine&limit=50&cursor=0
```

Response (`200 OK`):
```json
{
  "total": 3500,
  "limit": 50,
  "offset": 0,
  "clients": [
    {
      "user_id": "gen-user-0001",
      "entry_id": "945b1fa6-b378-4875-8ccd-7b1a906455bb",
      "queue_state": "WAITING",
      "request_count": 4,
      "risk_score": 10,
      "label": "genuine",
      "time_in_state": "14s",
      "created_at": "2026-10-04T00:50:00Z"
    }
  ]
}
```

### 4.3 Simulation Lab Endpoints
#### Start Simulation
```http
POST /admin/simulations
Content-Type: application/json

{
  "event_id": "demo-event",
  "tickets": 500,
  "clients": 5000,
  "bot_percentage": 30,
  "retry_storm": true,
  "bypass_attempts": true,
  "refresh_reconnect": true,
  "mitigation_enabled": true,
  "allocation_policy": "FIFO"
}
```

#### Get Simulation Run
```http
GET /admin/simulations/{run_id}
```

#### List Simulation Runs
```http
GET /admin/simulations
```

---

## 5. Queue Admission Token Structure

Signed HMAC-SHA256 JWT issued when user reaches `ADMITTED` state:
```json
{
  "user_id": "buyer-123",
  "event_id": "demo-event",
  "queue_entry_id": "945b1fa6-b378-4875-8ccd-7b1a906455bb",
  "purpose": "queue_admission",
  "iat": 1728000000,
  "exp": 1728000300
}
```

---

## 6. Standard Error Format

All error responses strictly follow this format:
```json
{
  "code": "RATE_LIMITED",
  "message": "Too many requests. Please wait before retrying.",
  "retry_after": 2
}
```

### Status Code Mapping
- `401 Unauthorized`: Missing or invalid session token (`UNAUTHORIZED`).
- `403 Forbidden`: Accessing another user's entry or temporarily blocked (`FORBIDDEN`, `TEMPORARILY_BLOCKED`).
- `409 Conflict`: Duplicate entry or conflicting action (`CONFLICT`).
- `410 Gone / Expired`: Admission token or reservation hold expired (`EXPIRED`).
- `429 Too Many Requests`: Rate limit exceeded (`RATE_LIMITED`, with `retry_after` countdown in body and header).
- `500 Internal Server Error`: Unexpected server issue (`INTERNAL_SERVER_ERROR`).
