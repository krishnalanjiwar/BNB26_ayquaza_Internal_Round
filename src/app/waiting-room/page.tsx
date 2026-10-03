"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Zap,
  Clock,
  Users,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { UserSession, QueueState } from "@/lib/types";
import { formatCountdown, generateIdempotencyKey } from "@/lib/utils";

const EVENT_ID = "evt_neon_pulse_2026";

export default function WaitingRoomPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [showRecoveryToast, setShowRecoveryToast] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());
  const [holdCountdown, setHoldCountdown] = useState<number | null>(null);

  // ── Session Recovery ────────────────────────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem("fd_session");
    if (!stored) {
      router.push("/sign-in");
      return;
    }
    const parsed: UserSession = JSON.parse(stored);
    setSession(parsed);

    if (parsed.entry_id) {
      setEntryId(parsed.entry_id);
      setShowRecoveryToast(true);
      setTimeout(() => setShowRecoveryToast(false), 4000);
    }
  }, [router]);

  // ── Join Queue ──────────────────────────────────────────────────────────
  const joinQueue = useCallback(async () => {
    if (entryId || isJoining) return;
    setIsJoining(true);
    try {
      const result = await api.joinQueue(EVENT_ID);
      setEntryId(result.entry_id);
      const updated = {
        ...session!,
        entry_id: result.entry_id,
        queue_token: result.queue_token,
      };
      sessionStorage.setItem("fd_session", JSON.stringify(updated));
      setSession(updated);
    } catch {
      // Handle error
    } finally {
      setIsJoining(false);
    }
  }, [entryId, isJoining, session]);

  useEffect(() => {
    if (session && !entryId) {
      joinQueue();
    }
  }, [session, entryId, joinQueue]);

  // ── Poll Queue Status ──────────────────────────────────────────────────
  const {
    data: queueStatus,
    isLoading: isPolling,
  } = useQuery({
    queryKey: ["queue-status", entryId],
    queryFn: () => api.getQueueStatus(entryId!),
    enabled: !!entryId,
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      if (state === "BOOKED" || state === "EXPIRED" || state === "REJECTED")
        return false;
      return 2000;
    },
  });

  // ── Hold Countdown ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!queueStatus?.hold_expires_at) {
      setHoldCountdown(null);
      return;
    }
    const update = () => {
      const remaining = Math.max(
        0,
        (new Date(queueStatus.hold_expires_at!).getTime() - Date.now()) / 1000
      );
      setHoldCountdown(remaining);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [queueStatus?.hold_expires_at]);

  // ── Navigate on state changes ──────────────────────────────────────────
  useEffect(() => {
    if (queueStatus?.state === "BOOKED") {
      router.push("/confirmation");
    }
  }, [queueStatus?.state, router]);

  // ── Reserve ─────────────────────────────────────────────────────────────
  const handleReserve = async () => {
    if (reserving) return;
    setReserving(true);
    setReserveError(null);
    try {
      const result = await api.reserve(EVENT_ID, idempotencyKey);
      // Store reservation for the payment step
      sessionStorage.setItem(
        "fd_reservation",
        JSON.stringify(result)
      );
      router.push("/payment");
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string; retry_after?: number };
      if (error.code === "SOLD_OUT") {
        setReserveError("All tickets have been sold.");
      } else if (error.retry_after) {
        setReserveError(
          `Too many requests. Please wait ${error.retry_after}s.`
        );
      } else {
        setReserveError(
          error.message ?? "Failed to reserve. Retrying safely…"
        );
      }
    } finally {
      setReserving(false);
    }
  };

  const state: QueueState = queueStatus?.state ?? "WAITING";

  return (
    <div className="min-h-screen bg-fd-bg flex flex-col">
      {/* Header */}
      <header className="border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-fd-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-fd-bg" />
            </div>
            <span className="font-bold text-sm">Fair Drop</span>
          </Link>
          {session && (
            <div className="fd-pill bg-white/[0.06] text-xs">
              {session.username}
            </div>
          )}
        </div>
      </header>

      {/* Recovery Toast */}
      <AnimatePresence>
        {showRecoveryToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="fd-pill bg-fd-green/15 text-fd-green text-sm shadow-xl">
              <CheckCircle2 className="w-4 h-4" />
              Welcome back — your place was preserved
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {!entryId || isPolling && !queueStatus ? (
            // Loading
            <div className="fd-card text-center space-y-4">
              <Skeleton className="h-6 w-24 mx-auto" />
              <Skeleton className="h-16 w-32 mx-auto" />
              <Skeleton className="h-4 w-48 mx-auto" />
            </div>
          ) : state === "WAITING" ? (
            // ── WAITING ───────────────────────────────────────────────
            <div className="fd-card text-center space-y-6">
              <StatusBadge status="WAITING" size="md" />

              <div>
                <div className="text-sm text-white/40 mb-2">
                  Your Position
                </div>
                <div className="text-6xl font-bold text-white/[0.92] tabular-nums">
                  <AnimatedNumber value={queueStatus?.position ?? 0} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.03]">
                  <Users className="w-4 h-4 text-white/40 mx-auto mb-1" />
                  <div className="text-xs text-white/40">People Ahead</div>
                  <div className="text-lg font-semibold tabular-nums">
                    <AnimatedNumber value={queueStatus?.ahead ?? 0} />
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03]">
                  <Clock className="w-4 h-4 text-white/40 mx-auto mb-1" />
                  <div className="text-xs text-white/40">Est. Wait</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {formatCountdown(queueStatus?.eta_seconds ?? 0)}
                  </div>
                </div>
              </div>

              {/* Animated waiting indicator */}
              <div className="flex items-center justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-fd-primary/60"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.3,
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2 justify-center text-xs text-white/30">
                <RefreshCw className="w-3 h-3" />
                You can safely refresh — your place is saved
              </div>
            </div>
          ) : state === "ADMITTED" ? (
            // ── ADMITTED ──────────────────────────────────────────────
            <div className="fd-card space-y-6">
              <div className="text-center">
                <StatusBadge status="ADMITTED" size="md" />
                <h2 className="text-xl font-bold mt-4">
                  It&apos;s Your Turn!
                </h2>
                <p className="text-sm text-white/40 mt-1">
                  You&apos;ve been admitted to the booking stage
                </p>
              </div>

              {/* Ticket Summary */}
              <div className="p-4 rounded-xl bg-white/[0.03] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Event</span>
                  <span className="text-sm font-medium">
                    Neon Pulse World Tour 2026
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Date</span>
                  <span className="text-sm">Nov 15, 2026</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Venue</span>
                  <span className="text-sm">Meridian Arena, Mumbai</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Quantity</span>
                  <span className="text-sm font-semibold text-fd-primary">
                    1 Ticket
                  </span>
                </div>
              </div>

              {reserveError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-fd-red/10 text-fd-red text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {reserveError}
                </div>
              )}

              <button
                onClick={handleReserve}
                disabled={reserving}
                className="w-full py-3.5 px-4 rounded-full bg-fd-primary text-fd-bg font-semibold text-sm hover:bg-fd-primary-hover transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {reserving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Reserving safely…
                  </>
                ) : (
                  <>
                    Confirm Reservation
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-white/30 text-center">
                Your request uses an idempotency key — retries are safe.
              </p>
            </div>
          ) : state === "RESERVATION_HELD" ? (
            // ── RESERVATION HELD ──────────────────────────────────────
            <div className="fd-card text-center space-y-6">
              <StatusBadge status="RESERVATION_HELD" size="md" />
              <h2 className="text-xl font-bold">Ticket Reserved</h2>

              {/* Countdown Ring */}
              {holdCountdown !== null && (
                <div className="flex flex-col items-center">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="6"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="var(--fd-amber)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 52}`}
                      strokeDashoffset={`${
                        2 *
                        Math.PI *
                        52 *
                        (1 - holdCountdown / 120)
                      }`}
                      transform="rotate(-90 60 60)"
                      style={{
                        transition: "stroke-dashoffset 1s linear",
                      }}
                    />
                    <text
                      x="60"
                      y="56"
                      textAnchor="middle"
                      className="fill-white/[0.92] text-2xl font-bold"
                      style={{ fontFamily: "inherit" }}
                    >
                      {formatCountdown(holdCountdown)}
                    </text>
                    <text
                      x="60"
                      y="74"
                      textAnchor="middle"
                      className="fill-white/40 text-xs"
                      style={{ fontFamily: "inherit" }}
                    >
                      remaining
                    </text>
                  </svg>
                </div>
              )}

              <p className="text-sm text-white/40">
                Complete payment before the hold expires
              </p>

              <button
                onClick={() => router.push("/payment")}
                className="w-full py-3 px-4 rounded-full bg-fd-primary text-fd-bg font-semibold text-sm hover:bg-fd-primary-hover transition-all"
              >
                Proceed to Payment
              </button>
            </div>
          ) : state === "EXPIRED" ? (
            // ── EXPIRED ───────────────────────────────────────────────
            <div className="fd-card text-center space-y-4">
              <StatusBadge status="EXPIRED" size="md" />
              <h2 className="text-xl font-bold">Hold Expired</h2>
              <p className="text-sm text-white/40">
                Your reservation hold has expired. The ticket has been
                released back to the queue.
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-2.5 rounded-full bg-white/[0.06] text-sm font-medium hover:bg-white/[0.1] transition-colors"
              >
                Back to Event
              </Link>
            </div>
          ) : state === "REJECTED" ? (
            // ── REJECTED ──────────────────────────────────────────────
            <div className="fd-card text-center space-y-4">
              <StatusBadge status="REJECTED" size="md" />
              <h2 className="text-xl font-bold">Session Restricted</h2>
              <p className="text-sm text-white/40">
                Your session has been flagged for review. If you believe
                this is an error, please contact support.
              </p>
              <div className="flex items-center gap-2 justify-center text-xs text-white/30">
                <ShieldCheck className="w-3 h-3" />
                This helps protect fairness for all users
              </div>
            </div>
          ) : null}
        </motion.div>
      </main>
    </div>
  );
}
