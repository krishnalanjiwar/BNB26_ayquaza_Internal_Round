"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { CapacityBar } from "@/components/ui/capacity-bar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Ticket,
  MapPin,
  Calendar,
  ShieldCheck,
  Users,
  Zap,
  ArrowRight,
  Lock,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { UserSession } from "@/lib/types";

const EVENT_ID = "evt_neon_pulse_2026";

export default function EventPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("fd_session");
    if (stored) {
      setSession(JSON.parse(stored));
    }
  }, []);

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", EVENT_ID],
    queryFn: () => api.getEvent(EVENT_ID),
    refetchInterval: 5000,
  });

  const handleJoinQueue = () => {
    if (!session) {
      router.push("/sign-in");
    } else {
      router.push("/waiting-room");
    }
  };

  if (isLoading || !event) {
    return (
      <div className="min-h-screen bg-fd-bg flex items-center justify-center">
        <div className="w-full max-w-2xl px-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fd-bg">
      {/* Header */}
      <header className="border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-fd-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-fd-bg" />
            </div>
            <span className="font-bold text-sm">Fair Drop</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              Admin →
            </Link>
            {session ? (
              <div className="fd-pill bg-white/[0.06] text-xs">
                <div className="w-5 h-5 rounded-full bg-fd-primary/20 flex items-center justify-center text-[10px] font-bold text-fd-primary">
                  {session.username[0].toUpperCase()}
                </div>
                {session.username}
              </div>
            ) : (
              <Link
                href="/sign-in"
                className="text-xs text-fd-primary hover:text-fd-primary-hover transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-8"
        >
          {/* Hero */}
          <div className="text-center space-y-4">
            <StatusBadge status={event.sale_status} size="md" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white/[0.92]">
              {event.name}
            </h1>
            <div className="flex items-center justify-center gap-4 text-white/40 text-sm">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(event.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {event.venue}
              </span>
            </div>
            <p className="text-white/50 text-base max-w-lg mx-auto leading-relaxed">
              {event.description}
            </p>
          </div>

          {/* Ticket Counter Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="fd-card text-center space-y-4"
          >
            <div className="flex items-center justify-center gap-2">
              <Ticket className="w-5 h-5 text-fd-primary" />
              <span className="text-sm font-medium text-white/60">
                Tickets Remaining
              </span>
            </div>
            <div className="text-6xl font-bold text-fd-primary tabular-nums">
              <AnimatedNumber value={event.available_tickets} />
            </div>
            <div className="text-sm text-white/40">
              of {event.total_tickets} total
            </div>
            <CapacityBar
              total={event.total_tickets}
              segments={[
                {
                  value: event.total_tickets - event.available_tickets,
                  color:
                    event.available_tickets < 50
                      ? "var(--fd-red)"
                      : "var(--fd-green)",
                  label: "Sold",
                },
                {
                  value: event.available_tickets,
                  color: "rgba(255,255,255,0.06)",
                  label: "Available",
                },
              ]}
              height={6}
            />
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <button
              onClick={handleJoinQueue}
              disabled={event.sale_status === "SOLD_OUT"}
              className="w-full py-4 px-6 rounded-full bg-fd-primary text-fd-bg font-semibold text-lg hover:bg-fd-primary-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {event.sale_status === "SOLD_OUT" ? (
                "Sold Out"
              ) : event.sale_status === "UPCOMING" ? (
                "Sale hasn't started yet"
              ) : (
                <>
                  Join the Queue
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </motion.div>

          {/* Fairness Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="fd-card space-y-4"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-fd-primary" />
              <h2 className="text-base font-semibold">
                How Fairness Works
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.03] space-y-2">
                <Users className="w-5 h-5 text-fd-blue" />
                <h3 className="text-sm font-medium">
                  Server-Controlled Queue
                </h3>
                <p className="text-xs text-white/40 leading-relaxed">
                  Your position is determined by the server, not your
                  browser. FIFO ordering ensures first-come, first-served.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] space-y-2">
                <Lock className="w-5 h-5 text-fd-amber" />
                <h3 className="text-sm font-medium">
                  One Ticket Per Account
                </h3>
                <p className="text-xs text-white/40 leading-relaxed">
                  Each verified account can book a maximum of one ticket.
                  Duplicate requests are safely handled.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] space-y-2">
                <ShieldCheck className="w-5 h-5 text-fd-green" />
                <h3 className="text-sm font-medium">Bot Protection</h3>
                <p className="text-xs text-white/40 leading-relaxed">
                  Automated traffic is detected and throttled. Sending more
                  requests does not increase your chances.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
