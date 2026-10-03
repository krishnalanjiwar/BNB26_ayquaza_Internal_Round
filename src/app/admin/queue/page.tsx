"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { CapacityBar } from "@/components/ui/capacity-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Users, Clock, Zap, ShieldCheck, ArrowRight, RefreshCw } from "lucide-react";
import { useState } from "react";

const EVENT_ID = "evt_neon_pulse_2026";

export default function QueueBoardPage() {
  const { data: metrics } = useQuery({
    queryKey: ["admin-metrics", EVENT_ID],
    queryFn: () => api.getMetrics(EVENT_ID),
    refetchInterval: 2000,
  });

  const { data: clientsData } = useQuery({
    queryKey: ["admin-clients", EVENT_ID],
    queryFn: () => api.getClients(EVENT_ID),
    refetchInterval: 2000,
  });

  const clients = clientsData?.clients ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white/[0.92]">Queue Board & Admission Pipeline</h1>
          <p className="text-sm text-white/40 mt-1">
            Real-time queue funnel tracking across 50,000 competing connections.
          </p>
        </div>
        <div className="fd-pill bg-fd-blue/15 text-fd-blue text-xs font-semibold">
          <Zap className="w-3.5 h-3.5" /> Admission Rate: 10/sec
        </div>
      </div>

      {/* Funnel Pipeline Columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Waiting Column */}
        <div className="fd-card space-y-4 border-t-2 border-t-white/40">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-white/40" /> Waiting Room
            </h3>
            <span className="text-xs font-mono text-white/40">
              {metrics?.queue_counts.waiting ?? 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] space-y-1">
            <span className="text-[10px] text-white/40 block">Est. Avg Wait</span>
            <span className="text-lg font-bold text-white">~45 seconds</span>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
            {clients
              .filter((c) => c.state === "WAITING")
              .slice(0, 5)
              .map((c) => (
                <div key={c.id} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/[0.08] flex items-center justify-center font-bold text-[10px]">
                      {c.avatar_initials}
                    </div>
                    <div>
                      <span className="font-medium text-white/80 block">{c.session_id}</span>
                      <span className="text-[10px] text-white/40">Pos #{c.position}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${c.label === "BOT" ? "bg-fd-red/15 text-fd-red" : "bg-fd-green/15 text-fd-green"}`}>
                    {c.label}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Admitted Column */}
        <div className="fd-card space-y-4 border-t-2 border-t-fd-blue">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-fd-blue" /> Admitted
            </h3>
            <span className="text-xs font-mono text-fd-blue font-bold">
              {metrics?.queue_counts.admitted ?? 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-fd-blue/10 space-y-1">
            <span className="text-[10px] text-fd-blue/80 block">Active Checkout Sessions</span>
            <span className="text-lg font-bold text-fd-blue">Admitting 10/s</span>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
            {clients
              .filter((c) => c.state === "ADMITTED")
              .slice(0, 5)
              .map((c) => (
                <div key={c.id} className="p-2.5 rounded-lg bg-fd-blue/5 border border-fd-blue/10 text-xs flex items-center justify-between">
                  <span className="font-medium text-white">{c.session_id}</span>
                  <span className="text-[10px] text-fd-blue font-semibold">Active Hold</span>
                </div>
              ))}
          </div>
        </div>

        {/* Reservation Held Column */}
        <div className="fd-card space-y-4 border-t-2 border-t-fd-amber">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-fd-amber" /> Hold Active
            </h3>
            <span className="text-xs font-mono text-fd-amber font-bold">
              {metrics?.queue_counts.reservation_held ?? 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-fd-amber/10 space-y-1">
            <span className="text-[10px] text-fd-amber/80 block">Seat Reservation Window</span>
            <span className="text-lg font-bold text-fd-amber">120s Countdown</span>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
            {clients
              .filter((c) => c.state === "RESERVATION_HELD")
              .slice(0, 5)
              .map((c) => (
                <div key={c.id} className="p-2.5 rounded-lg bg-fd-amber/5 border border-fd-amber/10 text-xs flex items-center justify-between">
                  <span className="font-medium text-white">{c.session_id}</span>
                  <span className="text-[10px] font-mono text-fd-amber">Seat Locked</span>
                </div>
              ))}
          </div>
        </div>

        {/* Booked Column */}
        <div className="fd-card space-y-4 border-t-2 border-t-fd-green">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-fd-green" /> Booked & Confirmed
            </h3>
            <span className="text-xs font-mono text-fd-green font-bold">
              {metrics?.inventory.booked ?? 0}/500
            </span>
          </div>

          <div className="p-3 rounded-xl bg-fd-green/10 space-y-1">
            <span className="text-[10px] text-fd-green/80 block">Successful Conversions</span>
            <span className="text-lg font-bold text-fd-green">
              {Math.round(((metrics?.inventory.booked ?? 0) / 500) * 100)}% Complete
            </span>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
            {clients
              .filter((c) => c.state === "BOOKED")
              .slice(0, 5)
              .map((c) => (
                <div key={c.id} className="p-2.5 rounded-lg bg-fd-green/5 border border-fd-green/10 text-xs flex items-center justify-between">
                  <span className="font-medium text-white">{c.session_id}</span>
                  <span className="text-[10px] text-fd-green font-bold">Confirmed</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
