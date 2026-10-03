/**
 * Mock Implementation for Fair Drop
 *
 * Simulates queue movement, ticket allocation, real-time metrics,
 * and a flash-crowd demo scenario so the dashboard looks alive on load.
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
  SimulationResults,
  PlatformSettings,
  TimeSeriesPoint,
  QueueState,
  ClientLabel,
  UserSession,
} from "./types";
import { randomBetween, sleep } from "./utils";

// ─── Internal State ──────────────────────────────────────────────────────────

let mockTime = Date.now();
const TICK_INTERVAL = 1000;

interface MockQueueEntry {
  entry_id: string;
  user_id: string;
  state: QueueState;
  position: number;
  joined_at: number;
  admitted_at?: number;
  hold_expires_at?: number;
  reservation_id?: string;
  booking_id?: string;
  label: ClientLabel;
  risk_score: number;
  request_count: number;
}

// State
let inventory = { total: 500, held: 0, booked: 0, available: 500 };
let queueEntries: MockQueueEntry[] = [];
let nextPosition = 1;
let reqPerSecHistory: TimeSeriesPoint[] = [];
let decisionsLog = {
  allowed: 0,
  throttled: 0,
  challenged: 0,
  blocked: 0,
  rejected_invalid_token: 0,
};
let totalRequests = 0;
let totalErrors = 0;
let simulationRuns: SimulationRun[] = [];
let flashCrowdStarted = false;
let settings: PlatformSettings = {
  admission_rate_per_second: 10,
  hold_duration_seconds: 120,
  rate_limit_requests_per_minute: 60,
  rate_limit_burst: 10,
  per_account_ticket_limit: 1,
  mitigation_enabled: true,
};

// ─── Flash Crowd Simulation (auto-starts for demo) ──────────────────────────

const DEMO_NAMES = [
  "alex_chen", "maria_santos", "james_wilson", "priya_patel", "omar_hassan",
  "yuki_tanaka", "lucas_berg", "aisha_rahman", "daniel_kim", "sofia_garcia",
  "ryan_murphy", "nina_ivanova", "kai_nakamura", "elena_popov", "marcus_jones",
  "fatima_ali", "noah_schmidt", "zara_malik", "ethan_lee", "chloe_dubois",
  "liam_taylor", "amara_osei", "felix_muller", "isha_sharma", "diego_rivera",
  "hannah_white", "ren_sato", "layla_hussein", "oscar_nilsson", "mei_wang",
  "bot_alpha_01", "bot_alpha_02", "bot_alpha_03", "bot_bravo_01", "bot_bravo_02",
  "fast_clicker_7", "script_kiddie", "ticket_scalper_x", "auto_buyer_99", "reseller_bot",
];

function generateClients(count: number, botPercent: number): MockQueueEntry[] {
  const clients: MockQueueEntry[] = [];
  const botCount = Math.floor(count * botPercent);

  for (let i = 0; i < count; i++) {
    const isBot = i >= count - botCount;
    const label: ClientLabel = isBot
      ? "BOT"
      : Math.random() < 0.08
      ? "SUSPICIOUS"
      : "GENUINE";

    clients.push({
      entry_id: `entry_${Date.now()}_${i}`,
      user_id: `user_${i}`,
      state: "WAITING",
      position: nextPosition++,
      joined_at: Date.now() - randomBetween(0, 30000),
      label,
      risk_score: isBot
        ? randomBetween(65, 98)
        : label === "SUSPICIOUS"
        ? randomBetween(35, 64)
        : randomBetween(2, 30),
      request_count: isBot ? randomBetween(50, 500) : randomBetween(1, 15),
    });
  }

  return clients;
}

function startFlashCrowd() {
  if (flashCrowdStarted) return;
  flashCrowdStarted = true;

  // Pre-populate with a realistic scenario
  const initialClients = generateClients(800, 0.3);
  queueEntries = initialClients;

  // Simulate some already admitted/booked
  const admittedCount = 120;
  const bookedCount = 85;
  const heldCount = 20;

  for (let i = 0; i < bookedCount && i < queueEntries.length; i++) {
    queueEntries[i].state = "BOOKED";
    queueEntries[i].booking_id = `bk_${i}`;
    inventory.booked++;
    inventory.available--;
  }
  for (let i = bookedCount; i < bookedCount + heldCount && i < queueEntries.length; i++) {
    queueEntries[i].state = "RESERVATION_HELD";
    queueEntries[i].reservation_id = `res_${i}`;
    queueEntries[i].hold_expires_at = Date.now() + randomBetween(30000, 90000);
    inventory.held++;
    inventory.available--;
  }
  for (
    let i = bookedCount + heldCount;
    i < bookedCount + heldCount + admittedCount && i < queueEntries.length;
    i++
  ) {
    queueEntries[i].state = "ADMITTED";
    queueEntries[i].admitted_at = Date.now() - randomBetween(5000, 30000);
  }

  // A few expired and rejected
  for (let i = queueEntries.length - 30; i < queueEntries.length - 15; i++) {
    if (queueEntries[i]) {
      queueEntries[i].state = "EXPIRED";
    }
  }
  for (let i = queueEntries.length - 15; i < queueEntries.length - 5; i++) {
    if (queueEntries[i]) {
      queueEntries[i].state = "REJECTED";
    }
  }

  // Build initial req/sec history showing the flash-crowd spike
  const now = Date.now();
  for (let i = 60; i >= 0; i--) {
    const t = now - i * 1000;
    let genuine: number;
    let automated: number;

    if (i > 50) {
      // Pre-sale quiet period
      genuine = randomBetween(5, 20);
      automated = randomBetween(0, 5);
    } else if (i > 40) {
      // Ramp up
      genuine = randomBetween(50, 200);
      automated = randomBetween(20, 80);
    } else if (i > 25) {
      // Peak flash crowd
      genuine = randomBetween(300, 600);
      automated = randomBetween(150, 400);
    } else if (i > 15) {
      // Sustained high
      genuine = randomBetween(200, 400);
      automated = randomBetween(80, 200);
    } else {
      // Settling
      genuine = randomBetween(80, 200);
      automated = randomBetween(30, 100);
    }

    reqPerSecHistory.push({
      timestamp: new Date(t).toISOString(),
      genuine,
      automated,
      total: genuine + automated,
    });
  }

  // Set decision counters
  decisionsLog = {
    allowed: randomBetween(12000, 18000),
    throttled: randomBetween(800, 1500),
    challenged: randomBetween(200, 500),
    blocked: randomBetween(150, 350),
    rejected_invalid_token: randomBetween(50, 150),
  };

  totalRequests =
    decisionsLog.allowed +
    decisionsLog.throttled +
    decisionsLog.challenged +
    decisionsLog.blocked +
    decisionsLog.rejected_invalid_token;
  totalErrors = randomBetween(20, 80);

  // Pre-populate simulation runs for analytics
  simulationRuns = [
    createCompletedRun("Baseline", {
      tickets: 500,
      simulated_clients: 5000,
      bot_percentage: 0,
      retry_storm: false,
      queue_bypass_attempts: false,
      refresh_reconnect: false,
      allocation_policy: "FIFO",
      mitigation_enabled: true,
    }),
    createCompletedRun("Bot-heavy", {
      tickets: 500,
      simulated_clients: 5000,
      bot_percentage: 30,
      retry_storm: false,
      queue_bypass_attempts: false,
      refresh_reconnect: false,
      allocation_policy: "FIFO",
      mitigation_enabled: true,
    }),
    createCompletedRun("Mitigation OFF", {
      tickets: 500,
      simulated_clients: 5000,
      bot_percentage: 30,
      retry_storm: false,
      queue_bypass_attempts: false,
      refresh_reconnect: false,
      allocation_policy: "FIFO",
      mitigation_enabled: false,
    }),
    createCompletedRun("Stress Test (80%)", {
      tickets: 500,
      simulated_clients: 5000,
      bot_percentage: 80,
      retry_storm: true,
      queue_bypass_attempts: true,
      refresh_reconnect: true,
      allocation_policy: "FIFO",
      mitigation_enabled: true,
    }),
  ];

  // Start background tick
  setInterval(tick, TICK_INTERVAL);
}

function createCompletedRun(
  name: string,
  config: SimulationConfig
): SimulationRun {
  const botShare = config.bot_percentage / 100;
  const mitigationFactor = config.mitigation_enabled ? 0.12 : 0.65;
  const botAlloc = botShare > 0 ? botShare * mitigationFactor : 0;

  const results: SimulationResults = {
    tickets_confirmed: config.tickets,
    oversell_count: 0,
    duplicate_bookings: 0,
    latency: {
      p50: randomBetween(45, 85),
      p95: randomBetween(180, 350),
      p99: randomBetween(400, 800),
    },
    error_rate: config.retry_storm
      ? randomBetween(2, 8) / 100
      : randomBetween(0, 3) / 100,
    legitimate_success_rate: botAlloc < 0.5
      ? randomBetween(85, 98) / 100
      : randomBetween(30, 55) / 100,
    bot_allocation_rate: Math.round(botAlloc * 1000) / 1000,
    bot_population_share: botShare,
    false_positive_rate: config.mitigation_enabled
      ? randomBetween(1, 5) / 100
      : 0,
    queue_bypass_rate: config.queue_bypass_attempts
      ? config.mitigation_enabled
        ? randomBetween(0, 2) / 100
        : randomBetween(15, 35) / 100
      : 0,
    recovery_rate: config.refresh_reconnect
      ? randomBetween(92, 99) / 100
      : 1,
  };

  return {
    run_id: `run_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`,
    config,
    status: "COMPLETED",
    progress: 100,
    started_at: new Date(Date.now() - randomBetween(300000, 600000)).toISOString(),
    completed_at: new Date(Date.now() - randomBetween(60000, 180000)).toISOString(),
    results,
    name,
  };
}

function tick() {
  mockTime = Date.now();

  // Add new req/sec data point
  const lastPoint = reqPerSecHistory[reqPerSecHistory.length - 1];
  const lastGenuine = lastPoint?.genuine ?? 100;
  const lastAutomated = lastPoint?.automated ?? 50;

  const genuine = Math.max(
    10,
    lastGenuine + randomBetween(-30, 25)
  );
  const automated = Math.max(
    5,
    lastAutomated + randomBetween(-20, 15)
  );

  reqPerSecHistory.push({
    timestamp: new Date(mockTime).toISOString(),
    genuine,
    automated,
    total: genuine + automated,
  });

  if (reqPerSecHistory.length > 120) {
    reqPerSecHistory = reqPerSecHistory.slice(-120);
  }

  // Update decisions
  decisionsLog.allowed += genuine;
  decisionsLog.throttled += randomBetween(0, 5);
  decisionsLog.blocked += randomBetween(0, 2);
  totalRequests += genuine + automated;

  // Simulate queue advancement
  const waitingEntries = queueEntries.filter((e) => e.state === "WAITING");
  const toAdmit = Math.min(
    settings.admission_rate_per_second,
    waitingEntries.length,
    Math.max(0, inventory.available - 5)
  );

  for (let i = 0; i < toAdmit; i++) {
    const entry = waitingEntries[i];
    if (entry) {
      entry.state = "ADMITTED";
      entry.admitted_at = mockTime;
    }
  }

  // Simulate some admitted → reservation_held
  const admittedEntries = queueEntries.filter((e) => e.state === "ADMITTED");
  for (const entry of admittedEntries.slice(0, randomBetween(0, 3))) {
    if (inventory.available > 0 && Math.random() < 0.4) {
      entry.state = "RESERVATION_HELD";
      entry.reservation_id = `res_${entry.entry_id}`;
      entry.hold_expires_at = mockTime + settings.hold_duration_seconds * 1000;
      inventory.held++;
      inventory.available--;
    }
  }

  // Simulate some held → booked
  const heldEntries = queueEntries.filter(
    (e) => e.state === "RESERVATION_HELD"
  );
  for (const entry of heldEntries.slice(0, randomBetween(0, 2))) {
    if (Math.random() < 0.5) {
      entry.state = "BOOKED";
      entry.booking_id = `bk_${entry.entry_id}`;
      inventory.held--;
      inventory.booked++;
    }
  }

  // Expire some holds
  for (const entry of heldEntries) {
    if (entry.hold_expires_at && entry.hold_expires_at < mockTime) {
      entry.state = "EXPIRED";
      inventory.held--;
      inventory.available++;
    }
  }

  // Occasionally add new clients (simulating ongoing arrivals)
  if (Math.random() < 0.3 && queueEntries.length < 2000) {
    const isBot = Math.random() < 0.25;
    queueEntries.push({
      entry_id: `entry_live_${mockTime}_${Math.random().toString(36).slice(2, 8)}`,
      user_id: `user_live_${nextPosition}`,
      state: "WAITING",
      position: nextPosition++,
      joined_at: mockTime,
      label: isBot ? "BOT" : Math.random() < 0.05 ? "SUSPICIOUS" : "GENUINE",
      risk_score: isBot ? randomBetween(60, 95) : randomBetween(5, 25),
      request_count: isBot ? randomBetween(30, 200) : randomBetween(1, 10),
    });
  }
}

// ─── Latency Simulator ──────────────────────────────────────────────────────

async function simulateLatency(min = 50, max = 200) {
  await sleep(randomBetween(min, max));
}

// ─── Mock Session ────────────────────────────────────────────────────────────

let currentSession: UserSession | null = null;
let userQueueEntry: MockQueueEntry | null = null;

// ─── Public Mock API ─────────────────────────────────────────────────────────

export const mockApi = {
  // ── Buyer: Auth ──────────────────────────────────────────────────────────
  async signIn(username: string): Promise<UserSession> {
    await simulateLatency(100, 300);
    startFlashCrowd();

    currentSession = {
      user_id: `user_${username}_${Date.now()}`,
      username,
      token: `tok_${crypto.randomUUID()}`,
    };
    return currentSession;
  },

  // ── Buyer: Event ─────────────────────────────────────────────────────────
  async getEvent(eventId: string): Promise<Event> {
    await simulateLatency();
    startFlashCrowd();

    return {
      id: eventId,
      name: "Neon Pulse World Tour 2026",
      date: "2026-11-15T20:00:00Z",
      venue: "Meridian Arena, Mumbai",
      description:
        "The most anticipated electronic music event of the year. Featuring world-class DJs, immersive light shows, and an unforgettable night of sonic excellence.",
      total_tickets: inventory.total,
      available_tickets: inventory.available,
      sale_status:
        inventory.available === 0
          ? "SOLD_OUT"
          : "LIVE",
      sale_starts_at: new Date(Date.now() - 3600000).toISOString(),
      allocation_policy: "FIFO",
    };
  },

  // ── Buyer: Queue ─────────────────────────────────────────────────────────
  async joinQueue(eventId: string): Promise<JoinQueueResponse> {
    await simulateLatency(150, 400);

    if (userQueueEntry) {
      return {
        entry_id: userQueueEntry.entry_id,
        state: userQueueEntry.state,
        position: userQueueEntry.position,
        queue_token: `qt_${userQueueEntry.entry_id}`,
      };
    }

    const entry: MockQueueEntry = {
      entry_id: `entry_user_${Date.now()}`,
      user_id: currentSession?.user_id ?? "anonymous",
      state: "WAITING",
      position: nextPosition++,
      joined_at: Date.now(),
      label: "GENUINE",
      risk_score: randomBetween(3, 15),
      request_count: 1,
    };

    queueEntries.push(entry);
    userQueueEntry = entry;

    const session = currentSession;
    if (session) {
      session.entry_id = entry.entry_id;
      session.queue_token = `qt_${entry.entry_id}`;
    }

    return {
      entry_id: entry.entry_id,
      state: entry.state,
      position: entry.position,
      queue_token: `qt_${entry.entry_id}`,
    };
  },

  async getQueueStatus(entryId: string): Promise<QueueStatusResponse> {
    await simulateLatency(30, 100);

    let entry = userQueueEntry?.entry_id === entryId ? userQueueEntry : null;
    if (!entry) {
      entry = queueEntries.find((e) => e.entry_id === entryId) ?? null;
    }

    if (!entry) {
      throw { code: "NOT_FOUND", message: "Queue entry not found" };
    }

    // Simulate the user progressing through the queue over time
    if (
      entry === userQueueEntry &&
      entry.state === "WAITING"
    ) {
      const elapsed = Date.now() - entry.joined_at;
      // After ~15 seconds, admit the user (for demo purposes)
      if (elapsed > 15000) {
        entry.state = "ADMITTED";
        entry.admitted_at = Date.now();
      }
    }

    const ahead =
      entry.state === "WAITING"
        ? queueEntries.filter(
            (e) =>
              e.state === "WAITING" && e.position < entry!.position
          ).length
        : 0;

    return {
      state: entry.state,
      position: entry.position,
      ahead,
      eta_seconds:
        entry.state === "WAITING" ? Math.max(5, ahead * 2) : 0,
      hold_expires_at: entry.hold_expires_at
        ? new Date(entry.hold_expires_at).toISOString()
        : undefined,
    };
  },

  // ── Buyer: Reserve & Book ────────────────────────────────────────────────
  async reserve(
    eventId: string,
    _idempotencyKey: string
  ): Promise<ReserveResponse> {
    await simulateLatency(200, 500);

    if (!userQueueEntry || userQueueEntry.state !== "ADMITTED") {
      throw { code: "FORBIDDEN", message: "Not admitted to booking stage" };
    }

    if (inventory.available <= 0) {
      throw { code: "SOLD_OUT", message: "No tickets available" };
    }

    userQueueEntry.state = "RESERVATION_HELD";
    userQueueEntry.reservation_id = `res_${Date.now()}`;
    userQueueEntry.hold_expires_at =
      Date.now() + settings.hold_duration_seconds * 1000;

    inventory.held++;
    inventory.available--;

    return {
      reservation_id: userQueueEntry.reservation_id,
      expires_at: new Date(userQueueEntry.hold_expires_at).toISOString(),
    };
  },

  async pay(reservationId: string): Promise<PaymentResponse> {
    await simulateLatency(300, 800);

    if (
      !userQueueEntry ||
      userQueueEntry.reservation_id !== reservationId
    ) {
      throw { code: "NOT_FOUND", message: "Reservation not found" };
    }

    userQueueEntry.state = "BOOKED";
    userQueueEntry.booking_id = `bk_${Date.now()}`;
    inventory.held--;
    inventory.booked++;

    return {
      booking_id: userQueueEntry.booking_id,
      status: "CONFIRMED",
    };
  },

  async getBooking(bookingId: string): Promise<BookingResponse> {
    await simulateLatency();

    return {
      booking_id: bookingId,
      status: "CONFIRMED",
      event_id: "evt_neon_pulse_2026",
      event_name: "Neon Pulse World Tour 2026",
      event_date: "2026-11-15T20:00:00Z",
      event_venue: "Meridian Arena, Mumbai",
      seat_number: randomBetween(1, 500),
      booked_at: new Date().toISOString(),
    };
  },

  async releaseReservation(reservationId: string): Promise<void> {
    await simulateLatency();

    if (
      userQueueEntry &&
      userQueueEntry.reservation_id === reservationId
    ) {
      userQueueEntry.state = "EXPIRED";
      inventory.held--;
      inventory.available++;
    }
  },

  // ── Admin: Metrics ───────────────────────────────────────────────────────
  async getMetrics(_eventId: string): Promise<EventMetrics> {
    await simulateLatency(50, 150);
    startFlashCrowd();

    const queueCounts = {
      waiting: queueEntries.filter((e) => e.state === "WAITING").length,
      admitted: queueEntries.filter((e) => e.state === "ADMITTED").length,
      reservation_held: queueEntries.filter(
        (e) => e.state === "RESERVATION_HELD"
      ).length,
      booked: queueEntries.filter((e) => e.state === "BOOKED").length,
      expired: queueEntries.filter((e) => e.state === "EXPIRED").length,
      rejected: queueEntries.filter((e) => e.state === "REJECTED").length,
    };

    const genuineBooked = queueEntries.filter(
      (e) => e.state === "BOOKED" && e.label === "GENUINE"
    ).length;
    const botBooked = queueEntries.filter(
      (e) => e.state === "BOOKED" && e.label === "BOT"
    ).length;
    const totalBooked = genuineBooked + botBooked;

    return {
      inventory: { ...inventory },
      oversell_count: 0,
      duplicate_count: 0,
      req_per_sec: reqPerSecHistory.slice(-60),
      latency: {
        p50: randomBetween(45, 75),
        p95: randomBetween(180, 280),
        p99: randomBetween(400, 650),
      },
      error_rate: totalRequests > 0 ? totalErrors / totalRequests : 0,
      decisions: { ...decisionsLog },
      queue_counts: queueCounts,
      legitimate_success_rate:
        totalBooked > 0 ? genuineBooked / totalBooked : 0.92,
      bot_allocation_rate:
        totalBooked > 0 ? botBooked / totalBooked : 0.04,
      false_positive_rate: 0.025,
      bypass_rate: 0.008,
      recovery_rate: 0.96,
    };
  },

  // ── Admin: Clients ───────────────────────────────────────────────────────
  async getClients(
    _eventId: string,
    filters?: { state?: string; label?: string; cursor?: string }
  ): Promise<ClientsResponse> {
    await simulateLatency(80, 200);
    startFlashCrowd();

    let filtered = [...queueEntries];

    if (filters?.state) {
      filtered = filtered.filter((e) => e.state === filters.state);
    }
    if (filters?.label) {
      filtered = filtered.filter((e) => e.label === filters.label);
    }

    const cursorIdx = filters?.cursor
      ? filtered.findIndex((e) => e.entry_id === filters.cursor) + 1
      : 0;

    const pageSize = 50;
    const page = filtered.slice(cursorIdx, cursorIdx + pageSize);

    const clients: ClientEntry[] = page.map((e, idx) => {
      const nameIdx =
        (cursorIdx + idx) % DEMO_NAMES.length;

      return {
        id: e.entry_id,
        session_id: `sess_${e.entry_id.slice(-8)}`,
        label: e.label,
        state: e.state,
        position: e.position,
        risk_score: e.risk_score,
        request_count: e.request_count,
        time_in_state_seconds: Math.floor(
          (Date.now() - e.joined_at) / 1000
        ),
        joined_at: new Date(e.joined_at).toISOString(),
        avatar_initials: DEMO_NAMES[nameIdx]
          .split("_")
          .map((w) => w[0].toUpperCase())
          .join(""),
        requests_timeline: Array.from({ length: 20 }, (_, i) => ({
          timestamp: new Date(
            Date.now() - (20 - i) * 3000
          ).toISOString(),
          count:
            e.label === "BOT"
              ? randomBetween(10, 50)
              : randomBetween(0, 3),
        })),
        risk_signals: {
          burst: e.risk_score > 50,
          repeated_reserve: e.risk_score > 60,
          invalid_token: e.risk_score > 80,
          multi_account: e.risk_score > 70,
          rapid_queue_join: e.risk_score > 55,
        },
        state_history: [
          {
            state: "WAITING" as QueueState,
            entered_at: new Date(e.joined_at).toISOString(),
          },
          ...(e.state !== "WAITING"
            ? [
                {
                  state: e.state,
                  entered_at: new Date(
                    e.joined_at + randomBetween(5000, 30000)
                  ).toISOString(),
                },
              ]
            : []),
        ],
      };
    });

    return {
      clients,
      next_cursor:
        cursorIdx + pageSize < filtered.length
          ? filtered[cursorIdx + pageSize]?.entry_id
          : undefined,
      total: filtered.length,
    };
  },

  async getClient(clientId: string): Promise<ClientEntry> {
    await simulateLatency(50, 120);

    const entry = queueEntries.find((e) => e.entry_id === clientId);
    if (!entry) throw { code: "NOT_FOUND", message: "Client not found" };

    const nameIdx =
      queueEntries.indexOf(entry) % DEMO_NAMES.length;

    return {
      id: entry.entry_id,
      session_id: `sess_${entry.entry_id.slice(-8)}`,
      label: entry.label,
      state: entry.state,
      position: entry.position,
      risk_score: entry.risk_score,
      request_count: entry.request_count,
      time_in_state_seconds: Math.floor(
        (Date.now() - entry.joined_at) / 1000
      ),
      joined_at: new Date(entry.joined_at).toISOString(),
      avatar_initials: DEMO_NAMES[nameIdx]
        .split("_")
        .map((w) => w[0].toUpperCase())
        .join(""),
      requests_timeline: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 2000).toISOString(),
        count:
          entry.label === "BOT"
            ? randomBetween(10, 50)
            : randomBetween(0, 3),
      })),
      risk_signals: {
        burst: entry.risk_score > 50,
        repeated_reserve: entry.risk_score > 60,
        invalid_token: entry.risk_score > 80,
        multi_account: entry.risk_score > 70,
        rapid_queue_join: entry.risk_score > 55,
      },
      state_history: [
        {
          state: "WAITING" as QueueState,
          entered_at: new Date(entry.joined_at).toISOString(),
        },
        ...(entry.admitted_at
          ? [
              {
                state: "ADMITTED" as QueueState,
                entered_at: new Date(entry.admitted_at).toISOString(),
              },
            ]
          : []),
        ...(entry.state === "RESERVATION_HELD" ||
        entry.state === "BOOKED"
          ? [
              {
                state: "RESERVATION_HELD" as QueueState,
                entered_at: new Date(
                  (entry.admitted_at ?? entry.joined_at) +
                    randomBetween(5000, 15000)
                ).toISOString(),
              },
            ]
          : []),
        ...(entry.state === "BOOKED"
          ? [
              {
                state: "BOOKED" as QueueState,
                entered_at: new Date(
                  (entry.admitted_at ?? entry.joined_at) +
                    randomBetween(15000, 30000)
                ).toISOString(),
              },
            ]
          : []),
      ],
    };
  },

  // ── Admin: Simulations ───────────────────────────────────────────────────
  async createSimulation(config: SimulationConfig): Promise<SimulationRun> {
    await simulateLatency(100, 300);

    const run: SimulationRun = {
      run_id: `run_${Date.now()}`,
      config,
      status: "RUNNING",
      progress: 0,
      started_at: new Date().toISOString(),
    };

    simulationRuns.push(run);

    // Simulate progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += randomBetween(5, 15);
      if (progress >= 100) {
        progress = 100;
        run.status = "COMPLETED";
        run.progress = 100;
        run.completed_at = new Date().toISOString();
        run.results = generateSimResults(config);
        clearInterval(interval);
      } else {
        run.progress = progress;
      }
    }, 800);

    return run;
  },

  async getSimulation(runId: string): Promise<SimulationRun> {
    await simulateLatency(30, 80);

    const run = simulationRuns.find((r) => r.run_id === runId);
    if (!run) throw { code: "NOT_FOUND", message: "Simulation not found" };
    return { ...run };
  },

  async listSimulations(): Promise<SimulationRun[]> {
    await simulateLatency(50, 120);
    startFlashCrowd();
    return [...simulationRuns];
  },

  // ── Admin: Settings ──────────────────────────────────────────────────────
  async getSettings(): Promise<PlatformSettings> {
    await simulateLatency(30, 80);
    return { ...settings };
  },

  async updateSettings(
    updates: Partial<PlatformSettings>
  ): Promise<PlatformSettings> {
    await simulateLatency(100, 200);
    settings = { ...settings, ...updates };
    return { ...settings };
  },

  // ── Admin: Actions ─────────────────────────────────────────────────────
  async throttleClient(clientId: string): Promise<void> {
    await simulateLatency();
    const entry = queueEntries.find((e) => e.entry_id === clientId);
    if (entry) {
      entry.label = "SUSPICIOUS";
      entry.risk_score = Math.max(entry.risk_score, 50);
    }
  },

  async blockClient(clientId: string): Promise<void> {
    await simulateLatency();
    const entry = queueEntries.find((e) => e.entry_id === clientId);
    if (entry) {
      entry.state = "REJECTED";
      entry.label = "BOT";
    }
  },

  async releaseFlag(clientId: string): Promise<void> {
    await simulateLatency();
    const entry = queueEntries.find((e) => e.entry_id === clientId);
    if (entry) {
      entry.label = "GENUINE";
      entry.risk_score = Math.min(entry.risk_score, 20);
    }
  },
};

function generateSimResults(config: SimulationConfig): SimulationResults {
  const botShare = config.bot_percentage / 100;
  const mitigationFactor = config.mitigation_enabled ? 0.08 : 0.55;
  const botAlloc = botShare > 0 ? botShare * mitigationFactor : 0;

  return {
    tickets_confirmed: config.tickets,
    oversell_count: 0,
    duplicate_bookings: 0,
    latency: {
      p50: randomBetween(40, 90),
      p95: randomBetween(150, 400),
      p99: randomBetween(350, 900),
    },
    error_rate: config.retry_storm
      ? randomBetween(3, 10) / 100
      : randomBetween(0, 4) / 100,
    legitimate_success_rate:
      botAlloc < 0.3
        ? randomBetween(82, 98) / 100
        : randomBetween(25, 50) / 100,
    bot_allocation_rate: Math.round(botAlloc * 1000) / 1000,
    bot_population_share: botShare,
    false_positive_rate: config.mitigation_enabled
      ? randomBetween(1, 6) / 100
      : 0,
    queue_bypass_rate: config.queue_bypass_attempts
      ? config.mitigation_enabled
        ? randomBetween(0, 3) / 100
        : randomBetween(12, 40) / 100
      : 0,
    recovery_rate: config.refresh_reconnect
      ? randomBetween(90, 99) / 100
      : 1,
  };
}
