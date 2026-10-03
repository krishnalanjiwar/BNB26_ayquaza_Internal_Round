// ─── Queue States ────────────────────────────────────────────────────────────
export type QueueState =
  | "WAITING"
  | "ADMITTED"
  | "RESERVATION_HELD"
  | "BOOKED"
  | "EXPIRED"
  | "REJECTED";

export type SaleStatus = "UPCOMING" | "LIVE" | "SOLD_OUT";

export type ClientLabel = "GENUINE" | "SUSPICIOUS" | "BOT";

export type MitigationDecision =
  | "ALLOWED"
  | "THROTTLED"
  | "CHALLENGED"
  | "BLOCKED"
  | "REJECTED_INVALID_TOKEN";

export type AllocationPolicy = "FIFO" | "RANDOMIZED_WINDOW";

// ─── Buyer API Types ─────────────────────────────────────────────────────────

export interface Event {
  id: string;
  name: string;
  date: string;
  venue: string;
  description: string;
  total_tickets: number;
  available_tickets: number;
  sale_status: SaleStatus;
  sale_starts_at: string;
  allocation_policy: AllocationPolicy;
}

export interface JoinQueueResponse {
  entry_id: string;
  state: QueueState;
  position: number;
  queue_token: string;
}

export interface QueueStatusResponse {
  state: QueueState;
  position: number;
  ahead: number;
  eta_seconds: number;
  hold_expires_at?: string;
}

export interface ReserveResponse {
  reservation_id: string;
  expires_at: string;
  seat_number?: number;
}

export interface PaymentResponse {
  booking_id: string;
  status: "CONFIRMED" | "FAILED";
  seat_number?: number;
  transaction_id?: string;
}

export interface BookingResponse {
  booking_id: string;
  status: "CONFIRMED" | "CANCELLED";
  event_id: string;
  event_name: string;
  event_date: string;
  event_venue: string;
  seat_number: number;
  booked_at: string;
  transaction_id?: string;
}

// ─── Admin API Types ─────────────────────────────────────────────────────────

export interface InventoryMetrics {
  total: number;
  held: number;
  booked: number;
  available: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  genuine: number;
  automated: number;
  total: number;
}

export interface LatencyMetrics {
  p50: number;
  p95: number;
  p99: number;
}

export interface DecisionBreakdown {
  allowed: number;
  throttled: number;
  challenged: number;
  blocked: number;
  rejected_invalid_token: number;
}

export interface QueueCounts {
  waiting: number;
  admitted: number;
  reservation_held: number;
  booked: number;
  expired: number;
  rejected: number;
}

export interface EventMetrics {
  inventory: InventoryMetrics;
  oversell_count: number;
  duplicate_count: number;
  req_per_sec: TimeSeriesPoint[];
  latency: LatencyMetrics;
  error_rate: number;
  decisions: DecisionBreakdown;
  queue_counts: QueueCounts;
  legitimate_success_rate: number;
  bot_allocation_rate: number;
  false_positive_rate: number;
  bypass_rate: number;
  recovery_rate: number;
}

export interface ClientEntry {
  id: string;
  session_id: string;
  label: ClientLabel;
  state: QueueState;
  position: number;
  risk_score: number;
  request_count: number;
  time_in_state_seconds: number;
  joined_at: string;
  avatar_initials: string;
  requests_timeline: { timestamp: string; count: number }[];
  risk_signals: {
    burst: boolean;
    repeated_reserve: boolean;
    invalid_token: boolean;
    multi_account: boolean;
    rapid_queue_join: boolean;
  };
  state_history: { state: QueueState; entered_at: string }[];
}

export interface ClientsResponse {
  clients: ClientEntry[];
  next_cursor?: string;
  total: number;
}

// ─── Simulation Types ────────────────────────────────────────────────────────

export interface SimulationConfig {
  tickets: number;
  simulated_clients: number;
  bot_percentage: number;
  retry_storm: boolean;
  queue_bypass_attempts: boolean;
  refresh_reconnect: boolean;
  allocation_policy: AllocationPolicy;
  mitigation_enabled: boolean;
}

export type SimulationStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface SimulationRun {
  run_id: string;
  config: SimulationConfig;
  status: SimulationStatus;
  progress: number; // 0-100
  started_at: string;
  completed_at?: string;
  results?: SimulationResults;
  name?: string;
}

export interface SimulationResults {
  tickets_confirmed: number;
  oversell_count: number;
  duplicate_bookings: number;
  latency: LatencyMetrics;
  error_rate: number;
  legitimate_success_rate: number;
  bot_allocation_rate: number;
  bot_population_share: number;
  false_positive_rate: number;
  queue_bypass_rate: number;
  recovery_rate: number;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface PlatformSettings {
  admission_rate_per_second: number;
  hold_duration_seconds: number;
  rate_limit_requests_per_minute: number;
  rate_limit_burst: number;
  per_account_ticket_limit: number;
  mitigation_enabled: boolean;
}

// ─── Error Shape ─────────────────────────────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
  retry_after?: number;
}

// ─── Session ─────────────────────────────────────────────────────────────────

export interface UserSession {
  user_id: string;
  username: string;
  token: string;
  entry_id?: string;
  queue_token?: string;
}
