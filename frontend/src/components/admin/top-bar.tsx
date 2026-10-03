"use client";

import { Bell, Search, ChevronDown } from "lucide-react";
import { PillStat } from "@/components/ui/pill-stat";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatPercent, formatLatency } from "@/lib/utils";

const EVENT_ID = "evt_neon_pulse_2026";

export function AdminTopBar() {
  const { data: metrics } = useQuery({
    queryKey: ["admin-metrics", EVENT_ID],
    queryFn: () => api.getMetrics(EVENT_ID),
    refetchInterval: 2000,
  });

  const lastReqSec =
    metrics?.req_per_sec[metrics.req_per_sec.length - 1]?.total ?? 0;

  return (
    <header className="sticky top-0 z-40 bg-fd-bg/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="flex items-center justify-between px-6 h-14">
        {/* Left: Pill stats */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <PillStat
            label="Sale"
            value={metrics?.inventory.available === 0 ? "Sold Out" : "Live"}
            color={
              metrics?.inventory.available === 0 ? "red" : "green"
            }
            pulse
          />
          <PillStat
            label="Queue"
            value={metrics?.queue_counts.waiting ?? 0}
            color="default"
          />
          <PillStat
            label="Admitted"
            value={metrics?.queue_counts.admitted ?? 0}
            color="blue"
          />
          <PillStat
            label="Booked"
            value={`${metrics?.inventory.booked ?? 0}/500`}
            color="green"
          />
          <PillStat
            label="Req/s"
            value={lastReqSec}
            color={lastReqSec > 500 ? "amber" : "default"}
          />
          <PillStat
            label="Errors"
            value={formatPercent(metrics?.error_rate ?? 0)}
            color={
              (metrics?.error_rate ?? 0) > 0.05 ? "red" : "default"
            }
          />
          <PillStat
            label="P95"
            value={formatLatency(metrics?.latency.p95 ?? 0)}
            color={
              (metrics?.latency.p95 ?? 0) > 500 ? "amber" : "default"
            }
          />
        </div>

        {/* Right: Search, Notifications, Avatar */}
        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
          {/* Search */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-white/40 text-sm cursor-pointer hover:bg-white/[0.08] transition-colors">
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
            <kbd className="ml-2 px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono">
              ⌘K
            </kbd>
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-xl hover:bg-white/[0.06] transition-colors">
            <Bell className="w-4 h-4 text-white/60" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-fd-red rounded-full" />
          </button>

          {/* Avatar */}
          <button className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-white/[0.06] transition-colors">
            <div className="w-7 h-7 rounded-full bg-fd-primary/20 flex items-center justify-center text-xs font-bold text-fd-primary">
              AD
            </div>
            <ChevronDown className="w-3 h-3 text-white/40" />
          </button>
        </div>
      </div>
    </header>
  );
}
