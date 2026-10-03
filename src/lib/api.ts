/**
 * Fair Drop API Client
 *
 * All API calls go through this typed client.
 * When NEXT_PUBLIC_USE_MOCKS=true, delegates to the mock implementation.
 */

import type {
  Event,
  JoinQueueResponse,
  QueueStatusResponse,
  ReserveResponse,
  PaymentResponse,
  BookingResponse,
  EventMetrics,
  ClientEntry,
  ClientsResponse,
  SimulationConfig,
  SimulationRun,
  PlatformSettings,
  ApiError,
  UserSession,
} from "./types";
import { mockApi } from "./mock";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

// ─── HTTP Helpers ────────────────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const session = sessionStorage.getItem("fd_session");
  if (!session) return {};
  const parsed = JSON.parse(session) as UserSession;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${parsed.token}`,
  };
  if (parsed.queue_token) {
    headers["X-Queue-Token"] = parsed.queue_token;
  }
  return headers;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({
      code: `HTTP_${res.status}`,
      message: res.statusText,
    }));

    if (res.status === 429 && err.retry_after) {
      (err as ApiError & { status: number }).status = 429;
    }

    throw err;
  }

  return res.json();
}

// ─── Typed API Client ────────────────────────────────────────────────────────

export const api = {
  // ── Auth ────────────────────────────────────────────────────────────────
  async signIn(username: string): Promise<UserSession> {
    if (USE_MOCKS) return mockApi.signIn(username);
    return request<UserSession>("POST", "/auth/sign-in", { username });
  },

  // ── Buyer ───────────────────────────────────────────────────────────────
  async getEvent(eventId: string): Promise<Event> {
    if (USE_MOCKS) return mockApi.getEvent(eventId);
    return request<Event>("GET", `/events/${eventId}`);
  },

  async joinQueue(eventId: string): Promise<JoinQueueResponse> {
    if (USE_MOCKS) return mockApi.joinQueue(eventId);
    return request<JoinQueueResponse>("POST", `/events/${eventId}/join-queue`);
  },

  async getQueueStatus(entryId: string): Promise<QueueStatusResponse> {
    if (USE_MOCKS) return mockApi.getQueueStatus(entryId);
    return request<QueueStatusResponse>("GET", `/queue/${entryId}`);
  },

  async reserve(
    eventId: string,
    idempotencyKey: string
  ): Promise<ReserveResponse> {
    if (USE_MOCKS) return mockApi.reserve(eventId, idempotencyKey);
    return request<ReserveResponse>(
      "POST",
      `/events/${eventId}/reserve`,
      undefined,
      { "Idempotency-Key": idempotencyKey }
    );
  },

  async pay(reservationId: string): Promise<PaymentResponse> {
    if (USE_MOCKS) return mockApi.pay(reservationId);
    return request<PaymentResponse>(
      "POST",
      `/reservations/${reservationId}/pay`
    );
  },

  async getBooking(bookingId: string): Promise<BookingResponse> {
    if (USE_MOCKS) return mockApi.getBooking(bookingId);
    return request<BookingResponse>("GET", `/bookings/${bookingId}`);
  },

  async releaseReservation(reservationId: string): Promise<void> {
    if (USE_MOCKS) return mockApi.releaseReservation(reservationId);
    return request<void>("POST", `/reservations/${reservationId}/release`);
  },

  // ── Admin ───────────────────────────────────────────────────────────────
  async getMetrics(eventId: string): Promise<EventMetrics> {
    if (USE_MOCKS) return mockApi.getMetrics(eventId);
    return request<EventMetrics>("GET", `/admin/events/${eventId}/metrics`);
  },

  async getClients(
    eventId: string,
    filters?: { state?: string; label?: string; cursor?: string }
  ): Promise<ClientsResponse> {
    if (USE_MOCKS) return mockApi.getClients(eventId, filters);
    const params = new URLSearchParams();
    if (filters?.state) params.set("state", filters.state);
    if (filters?.label) params.set("label", filters.label);
    if (filters?.cursor) params.set("cursor", filters.cursor);
    return request<ClientsResponse>(
      "GET",
      `/admin/events/${eventId}/clients?${params}`
    );
  },

  async getClient(clientId: string): Promise<ClientEntry> {
    if (USE_MOCKS) return mockApi.getClient(clientId);
    return request<ClientEntry>("GET", `/admin/clients/${clientId}`);
  },

  async createSimulation(config: SimulationConfig): Promise<SimulationRun> {
    if (USE_MOCKS) return mockApi.createSimulation(config);
    return request<SimulationRun>("POST", "/admin/simulations", config);
  },

  async getSimulation(runId: string): Promise<SimulationRun> {
    if (USE_MOCKS) return mockApi.getSimulation(runId);
    return request<SimulationRun>("GET", `/admin/simulations/${runId}`);
  },

  async listSimulations(): Promise<SimulationRun[]> {
    if (USE_MOCKS) return mockApi.listSimulations();
    return request<SimulationRun[]>("GET", "/admin/simulations");
  },

  async getSettings(): Promise<PlatformSettings> {
    if (USE_MOCKS) return mockApi.getSettings();
    return request<PlatformSettings>("GET", "/admin/settings");
  },

  async updateSettings(
    updates: Partial<PlatformSettings>
  ): Promise<PlatformSettings> {
    if (USE_MOCKS) return mockApi.updateSettings(updates);
    return request<PlatformSettings>("PATCH", "/admin/settings", updates);
  },

  // ── Admin Actions ───────────────────────────────────────────────────────
  async throttleClient(clientId: string): Promise<void> {
    if (USE_MOCKS) return mockApi.throttleClient(clientId);
    return request<void>("POST", `/admin/clients/${clientId}/throttle`);
  },

  async blockClient(clientId: string): Promise<void> {
    if (USE_MOCKS) return mockApi.blockClient(clientId);
    return request<void>("POST", `/admin/clients/${clientId}/block`);
  },

  async releaseFlag(clientId: string): Promise<void> {
    if (USE_MOCKS) return mockApi.releaseFlag(clientId);
    return request<void>("POST", `/admin/clients/${clientId}/release-flag`);
  },
};
