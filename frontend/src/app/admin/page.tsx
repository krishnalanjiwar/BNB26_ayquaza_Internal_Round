"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatPercent, formatLatency } from "@/lib/utils";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { CircularGauge } from "@/components/ui/circular-gauge";
import { CapacityBar } from "@/components/ui/capacity-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { TrafficChart } from "@/components/charts/traffic-chart";
import { SeatGrid } from "@/components/admin/seat-grid";
import { ChartSkeleton, CardSkeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Calendar,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Search,
  Filter,
  Users,
} from "lucide-react";
import { useState } from "react";
import type { ClientEntry } from "@/lib/types";

const EVENT_ID = "evt_neon_pulse_2026";

export default function OperationsDashboard() {
  const [filterTab, setFilterTab] = useState<
    "all" | "genuine" | "suspicious" | "blocked"
  >("all");
  const [showAlerts, setShowAlerts] = useState(true);
  const [clientSearch, setClientSearch] = useState("");

  const {
    data: metrics,
    isLoading,
    refetch: refetchMetrics,
    isFetching,
  } = useQuery({
    queryKey: ["admin-metrics", EVENT_ID],
    queryFn: () => api.getMetrics(EVENT_ID),
    refetchInterval: 2000,
  });

  const {
    data: clientsData,
    refetch: refetchClients,
  } = useQuery({
    queryKey: ["admin-clients", EVENT_ID],
    queryFn: () => api.getClients(EVENT_ID),
    refetchInterval: 2000,
  });

  const clients = clientsData?.clients ?? [];

  if (isLoading || !metrics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Operations Dashboard</h1>
          <p className="text-sm text-white/40 mt-1">Loading data…</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartSkeleton className="lg:col-span-2" />
          <CardSkeleton />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ── Tab-based Filtering Logic ──────────────────────────────────────────────
  const rawPoints = metrics.req_per_sec;

  // Filter traffic points depending on active tab
  const displayTrafficPoints = rawPoints.map((p) => {
    if (filterTab === "genuine") return { ...p, automated: 0, total: p.genuine };
    if (filterTab === "suspicious" || filterTab === "blocked")
      return { ...p, genuine: 0, total: p.automated };
    return p;
  });

  const lastPoint = displayTrafficPoints[displayTrafficPoints.length - 1];
  const currentReqSec = lastPoint?.total ?? 0;
  const peakReqSec = Math.max(...displayTrafficPoints.map((p) => p.total), 1);

  // Filter Client sessions list based on tab & search
  const filteredClients = clients.filter((c) => {
    if (filterTab === "genuine" && c.label !== "GENUINE") return false;
    if (filterTab === "suspicious" && c.label !== "SUSPICIOUS") return false;
    if (filterTab === "blocked" && c.label !== "BOT") return false;

    if (
      clientSearch &&
      !c.session_id.toLowerCase().includes(clientSearch.toLowerCase()) &&
      !c.id.toLowerCase().includes(clientSearch.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleClientAction = async (
    action: "throttle" | "block" | "release",
    clientId: string
  ) => {
    if (action === "throttle") await api.throttleClient(clientId);
    if (action === "block") await api.blockClient(clientId);
    if (action === "release") await api.releaseFlag(clientId);
    refetchClients();
    refetchMetrics();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white/[0.92]">
            Operations Dashboard
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Calendar className="w-3.5 h-3.5 text-white/40" />
            <span className="text-sm text-white/40" suppressHydrationWarning>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="fd-dot fd-dot-pulse bg-fd-green ml-2" />
            <span className="text-sm text-fd-green font-medium">Live</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select className="px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-sm text-white/60 cursor-pointer">
            <option>Last 60s</option>
            <option>Last 5m</option>
            <option>Last 15m</option>
            <option>Last 1h</option>
          </select>
        </div>
      </div>

      {/* Alert Banner */}
      {showAlerts && currentReqSec > 150 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-fd-amber/10 border border-fd-amber/20">
          <AlertTriangle className="w-4 h-4 text-fd-amber flex-shrink-0" />
          <span className="text-sm text-fd-amber">
            Traffic spike detected:{" "}
            <span className="font-semibold tabular-nums">{currentReqSec}</span>{" "}
            req/s [{filterTab.toUpperCase()} filter active]
          </span>
          <button
            onClick={() => setShowAlerts(false)}
            className="ml-auto text-fd-amber/60 hover:text-fd-amber text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Interactive Filter Tabs */}
      <div className="flex items-center gap-6 border-b border-white/[0.06] pb-px">
        {(
          [
            { key: "all", label: "All", count: clients.length },
            {
              key: "genuine",
              label: "Genuine",
              count: metrics.decisions.allowed,
            },
            {
              key: "suspicious",
              label: "Suspicious",
              count: metrics.decisions.throttled + metrics.decisions.challenged,
            },
            {
              key: "blocked",
              label: "Blocked",
              count: metrics.decisions.blocked,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key)}
            className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
              filterTab === tab.key
                ? "text-white/[0.92] font-semibold"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {tab.label}
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                filterTab === tab.key
                  ? "bg-fd-primary/20 text-fd-primary"
                  : "bg-white/[0.06] text-white/40"
              }`}
            >
              {tab.count.toLocaleString()}
            </span>
            {filterTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-fd-primary rounded-full" />
            )}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-white/40 cursor-pointer">
            <div
              role="switch"
              aria-checked={showAlerts}
              onClick={() => setShowAlerts(!showAlerts)}
              className={`w-8 h-[18px] rounded-full relative transition-colors cursor-pointer ${
                showAlerts ? "bg-fd-primary" : "bg-white/[0.12]"
              }`}
            >
              <div
                className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${
                  showAlerts ? "left-[16px]" : "left-[2px]"
                }`}
              />
            </div>
            Show alerts
          </label>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Traffic Chart (2 cols) */}
        <DashboardCard
          title={`Traffic Overview (${filterTab.toUpperCase()})`}
          subtitle="Requests per second — Filtered by threat classification"
          onRefresh={() => refetchMetrics()}
          isRefreshing={isFetching}
          className="xl:col-span-2"
          headerRight={
            <div className="flex items-center gap-3">
              {(filterTab === "all" || filterTab === "genuine") && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-0.5 rounded-full bg-fd-purple" />
                  <span className="text-[10px] text-white/40">Genuine</span>
                </div>
              )}
              {(filterTab === "all" ||
                filterTab === "suspicious" ||
                filterTab === "blocked") && (
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-0.5 rounded-full bg-fd-red"
                    style={{ borderStyle: "dashed" }}
                  />
                  <span className="text-[10px] text-white/40">Automated</span>
                </div>
              )}
            </div>
          }
        >
          <TrafficChart data={displayTrafficPoints} />

          {/* Summary overlay */}
          <div className="mt-4 flex items-center gap-4">
            <div className="fd-pill bg-white/[0.04]">
              <TrendingUp className="w-3 h-3 text-fd-primary" />
              <span className="text-xs text-white/60">Peak</span>
              <span className="text-sm font-semibold tabular-nums">
                {peakReqSec.toLocaleString()} req/s
              </span>
            </div>
            <div className="fd-pill bg-white/[0.04]">
              <Clock className="w-3 h-3 text-fd-blue" />
              <span className="text-xs text-white/60">Current Rate</span>
              <span className="text-sm font-semibold tabular-nums">
                {currentReqSec.toLocaleString()} req/s
              </span>
            </div>
            <div className="fd-pill bg-white/[0.04] ml-auto">
              <span className="text-xs text-white/40">Active Filter:</span>
              <span className="text-xs font-bold text-fd-primary uppercase">
                {filterTab}
              </span>
            </div>
          </div>
        </DashboardCard>

        {/* System Summary Card */}
        <DashboardCard title="System Summary" subtitle="Real-time status">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/[0.03]">
                <div className="text-xs text-white/40 mb-1">Queue Size</div>
                <div className="text-xl font-bold tabular-nums">
                  <AnimatedNumber value={metrics.queue_counts.waiting} />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03]">
                <div className="text-xs text-white/40 mb-1">Admitted</div>
                <div className="text-xl font-bold tabular-nums text-fd-blue">
                  <AnimatedNumber value={metrics.queue_counts.admitted} />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03]">
                <div className="text-xs text-white/40 mb-1">Held</div>
                <div className="text-xl font-bold tabular-nums text-fd-amber">
                  <AnimatedNumber
                    value={metrics.queue_counts.reservation_held}
                  />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03]">
                <div className="text-xs text-white/40 mb-1">Booked</div>
                <div className="text-xl font-bold tabular-nums text-fd-green">
                  <AnimatedNumber value={metrics.inventory.booked} />
                </div>
              </div>
            </div>

            {/* Latency */}
            <div className="space-y-2">
              <div className="text-xs text-white/40 font-medium">Latency</div>
              <div className="flex items-center gap-3">
                {(["p50", "p95", "p99"] as const).map((key) => (
                  <div
                    key={key}
                    className="flex-1 p-2 rounded-lg bg-white/[0.03] text-center"
                  >
                    <div className="text-[10px] text-white/30 uppercase">
                      {key}
                    </div>
                    <div
                      className={`text-sm font-semibold tabular-nums ${
                        key === "p99" && metrics.latency[key] > 500
                          ? "text-fd-amber"
                          : ""
                      }`}
                    >
                      {formatLatency(metrics.latency[key])}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Decisions */}
            <div className="space-y-2">
              <div className="text-xs text-white/40 font-medium">
                Mitigation Decisions
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div
                  className={`flex items-center gap-2 p-1.5 rounded-lg transition-colors ${
                    filterTab === "genuine" ? "bg-fd-green/10 font-bold" : ""
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-fd-green" />
                  <span className="text-xs text-white/60">Allowed</span>
                  <span className="ml-auto text-xs font-semibold tabular-nums">
                    {metrics.decisions.allowed.toLocaleString()}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-2 p-1.5 rounded-lg transition-colors ${
                    filterTab === "suspicious" ? "bg-fd-amber/10 font-bold" : ""
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-fd-amber" />
                  <span className="text-xs text-white/60">Throttled</span>
                  <span className="ml-auto text-xs font-semibold tabular-nums">
                    {metrics.decisions.throttled.toLocaleString()}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-2 p-1.5 rounded-lg transition-colors ${
                    filterTab === "suspicious" ? "bg-fd-purple/10 font-bold" : ""
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-fd-purple" />
                  <span className="text-xs text-white/60">Challenged</span>
                  <span className="ml-auto text-xs font-semibold tabular-nums">
                    {metrics.decisions.challenged.toLocaleString()}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-2 p-1.5 rounded-lg transition-colors ${
                    filterTab === "blocked" ? "bg-fd-red/10 font-bold" : ""
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-fd-red" />
                  <span className="text-xs text-white/60">Blocked</span>
                  <span className="ml-auto text-xs font-semibold tabular-nums">
                    {metrics.decisions.blocked.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Filtered Active Client Sessions Section */}
      <DashboardCard
        title={`Active Sessions Inspector (${filteredClients.length} ${filterTab.toUpperCase()} sessions)`}
        subtitle="Filter tab active — manage threat levels and manual throttles directly"
        headerRight={
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search session..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-full pl-8 pr-3 py-1 text-xs focus:outline-none focus:border-fd-primary text-white"
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.03] text-white/40 border-b border-white/[0.06]">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Client Session</th>
                <th className="px-4 py-2.5 font-semibold">Threat Classification</th>
                <th className="px-4 py-2.5 font-semibold">Queue State</th>
                <th className="px-4 py-2.5 font-semibold">Risk Score</th>
                <th className="px-4 py-2.5 font-semibold">Req / Min</th>
                <th className="px-4 py-2.5 font-semibold text-right">Intervention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-white/80">
              {filteredClients.slice(0, 8).map((client) => (
                <tr
                  key={client.id}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-medium text-white flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/[0.08] flex items-center justify-center font-bold text-[10px]">
                      {client.avatar_initials}
                    </div>
                    {client.session_id}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`fd-pill text-[10px] font-bold ${
                        client.label === "BOT"
                          ? "bg-fd-red/15 text-fd-red border border-fd-red/20"
                          : client.label === "SUSPICIOUS"
                          ? "bg-fd-amber/15 text-fd-amber border border-fd-amber/20"
                          : "bg-fd-green/15 text-fd-green border border-fd-green/20"
                      }`}
                    >
                      {client.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={client.state} size="sm" />
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    <span
                      className={
                        client.risk_score > 70
                          ? "text-fd-red"
                          : client.risk_score > 30
                          ? "text-fd-amber"
                          : "text-fd-green"
                      }
                    >
                      {client.risk_score} / 100
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-white/60">
                    {client.request_count} req/min
                  </td>
                  <td className="px-4 py-3 text-right space-x-1.5">
                    {client.label !== "GENUINE" ? (
                      <button
                        onClick={() => handleClientAction("release", client.id)}
                        className="px-2 py-0.5 rounded bg-fd-green/10 border border-fd-green/20 text-fd-green text-[10px] font-medium hover:bg-fd-green/20"
                      >
                        Unflag
                      </button>
                    ) : (
                      <button
                        onClick={() => handleClientAction("throttle", client.id)}
                        className="px-2 py-0.5 rounded bg-fd-amber/10 border border-fd-amber/20 text-fd-amber text-[10px] font-medium hover:bg-fd-amber/20"
                      >
                        Throttle
                      </button>
                    )}
                    <button
                      onClick={() => handleClientAction("block", client.id)}
                      className="px-2 py-0.5 rounded bg-fd-red/10 border border-fd-red/20 text-fd-red text-[10px] font-medium hover:bg-fd-red/20"
                    >
                      Block
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      {/* Gauges & Inventory Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Gauges */}
        <DashboardCard title="System Gauges">
          <div className="flex items-center justify-around">
            <CircularGauge
              value={currentReqSec}
              max={1000}
              label="Req Rate"
              sublabel="per second"
              color="var(--fd-purple)"
            />
            <CircularGauge
              value={Math.round(
                ((metrics.decisions.throttled + metrics.decisions.blocked) /
                  Math.max(
                    1,
                    metrics.decisions.allowed +
                      metrics.decisions.throttled +
                      metrics.decisions.blocked
                  )) *
                  100
              )}
              max={100}
              label="Risk Level"
              sublabel="% mitigated"
              color="var(--fd-amber)"
              format={(v) => `${v}%`}
            />
            <CircularGauge
              value={metrics.inventory.available}
              max={metrics.inventory.total}
              label="Remaining"
              sublabel={`of ${metrics.inventory.total}`}
              color="var(--fd-green)"
            />
          </div>
        </DashboardCard>

        {/* Seat Grid */}
        <DashboardCard
          title="Inventory Seat Map"
          subtitle={`${metrics.inventory.total} seats`}
          className="xl:col-span-2"
          headerRight={
            <div className="flex items-center gap-3">
              <div
                className={`fd-pill text-xs font-semibold ${
                  metrics.oversell_count > 0
                    ? "bg-fd-red/15 text-fd-red"
                    : "bg-fd-green/15 text-fd-green"
                }`}
              >
                <span
                  className={`fd-dot ${
                    metrics.oversell_count > 0 ? "bg-fd-red" : "bg-fd-green"
                  }`}
                />
                Oversell: {metrics.oversell_count}
              </div>
              <div
                className={`fd-pill text-xs font-semibold ${
                  metrics.duplicate_count > 0
                    ? "bg-fd-red/15 text-fd-red"
                    : "bg-fd-green/15 text-fd-green"
                }`}
              >
                Dupes: {metrics.duplicate_count}
              </div>
            </div>
          }
        >
          <SeatGrid inventory={metrics.inventory} />
          <div className="mt-4">
            <CapacityBar
              total={metrics.inventory.total}
              segments={[
                {
                  value: metrics.inventory.booked,
                  color: "var(--fd-green)",
                  label: "Booked",
                },
                {
                  value: metrics.inventory.held,
                  color: "var(--fd-amber)",
                  label: "Held",
                },
                {
                  value: metrics.inventory.available,
                  color: "rgba(255,255,255,0.08)",
                  label: "Available",
                },
              ]}
              height={10}
            />
          </div>
        </DashboardCard>
      </div>

      {/* Bottom Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: "Legitimate Success",
            value: formatPercent(metrics.legitimate_success_rate),
            color: "text-fd-green",
          },
          {
            label: "Bot Allocation",
            value: formatPercent(metrics.bot_allocation_rate),
            color:
              metrics.bot_allocation_rate > 0.1
                ? "text-fd-red"
                : "text-fd-green",
          },
          {
            label: "False Positive",
            value: formatPercent(metrics.false_positive_rate),
            color:
              metrics.false_positive_rate > 0.05
                ? "text-fd-amber"
                : "text-fd-green",
          },
          {
            label: "Queue Bypass",
            value: formatPercent(metrics.bypass_rate),
            color:
              metrics.bypass_rate > 0.01 ? "text-fd-red" : "text-fd-green",
          },
          {
            label: "Recovery Rate",
            value: formatPercent(metrics.recovery_rate),
            color:
              metrics.recovery_rate > 0.9 ? "text-fd-green" : "text-fd-amber",
          },
        ].map((m) => (
          <DashboardCard key={m.label}>
            <div className="text-xs text-white/40 mb-1">{m.label}</div>
            <div className={`text-2xl font-bold tabular-nums ${m.color}`}>
              {m.value}
            </div>
          </DashboardCard>
        ))}
      </div>
    </div>
  );
}
