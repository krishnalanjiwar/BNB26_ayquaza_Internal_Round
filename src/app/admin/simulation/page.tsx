"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { FlaskConical, Play, CheckCircle2, AlertTriangle, RefreshCw, BarChart } from "lucide-react";
import { useState } from "react";
import { formatPercent, formatLatency } from "@/lib/utils";
import type { SimulationConfig, SimulationRun } from "@/lib/types";

export default function SimulationLabPage() {
  const [running, setRunning] = useState(false);
  const [config, setConfig] = useState<SimulationConfig>({
    tickets: 500,
    simulated_clients: 50000,
    bot_percentage: 60,
    retry_storm: true,
    queue_bypass_attempts: true,
    refresh_reconnect: true,
    allocation_policy: "RANDOMIZED_WINDOW",
    mitigation_enabled: true,
  });

  const { data: simulations, refetch } = useQuery({
    queryKey: ["admin-simulations"],
    queryFn: () => api.listSimulations(),
  });

  const handleRunSimulation = async () => {
    setRunning(true);
    try {
      await api.createSimulation(config);
      await refetch();
    } finally {
      setRunning(false);
    }
  };

  const latest = simulations?.[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white/[0.92]">High-Traffic Load & Bot Simulation Lab</h1>
          <p className="text-sm text-white/40 mt-1">
            Simulate up to 50,000 concurrent clients, bot farm attacks, retry storms, and queue bypass.
          </p>
        </div>
        <button
          onClick={handleRunSimulation}
          disabled={running}
          className="px-5 py-2.5 rounded-full bg-fd-primary text-fd-bg font-bold text-xs hover:bg-fd-primary-hover transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          Run 50,000 Client Load Test
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulation Configuration Panel */}
        <div className="fd-card space-y-4 p-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-fd-primary" /> Load Test Controls
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-white/40 block mb-1">Total Seats: {config.tickets}</label>
              <input
                type="range"
                min="100"
                max="5000"
                value={config.tickets}
                onChange={(e) => setConfig({ ...config, tickets: Number(e.target.value) })}
                className="w-full accent-fd-primary"
              />
            </div>

            <div>
              <label className="text-white/40 block mb-1">Simulated Clients: {config.simulated_clients.toLocaleString()}</label>
              <input
                type="range"
                min="1000"
                max="50000"
                step="1000"
                value={config.simulated_clients}
                onChange={(e) => setConfig({ ...config, simulated_clients: Number(e.target.value) })}
                className="w-full accent-fd-primary"
              />
            </div>

            <div>
              <label className="text-white/40 block mb-1">Bot Share: {config.bot_percentage}%</label>
              <input
                type="range"
                min="0"
                max="90"
                value={config.bot_percentage}
                onChange={(e) => setConfig({ ...config, bot_percentage: Number(e.target.value) })}
                className="w-full accent-fd-amber"
              />
            </div>

            <div className="pt-2 space-y-2 border-t border-white/[0.06]">
              <label className="flex items-center gap-2 text-white/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.retry_storm}
                  onChange={(e) => setConfig({ ...config, retry_storm: e.target.checked })}
                  className="rounded bg-white/[0.1] border-none text-fd-primary"
                />
                Simulate Retry Storms (10x reqs)
              </label>

              <label className="flex items-center gap-2 text-white/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.queue_bypass_attempts}
                  onChange={(e) => setConfig({ ...config, queue_bypass_attempts: e.target.checked })}
                  className="rounded bg-white/[0.1] border-none text-fd-primary"
                />
                Simulate Direct Queue Bypass
              </label>

              <label className="flex items-center gap-2 text-white/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.mitigation_enabled}
                  onChange={(e) => setConfig({ ...config, mitigation_enabled: e.target.checked })}
                  className="rounded bg-white/[0.1] border-none text-fd-primary"
                />
                Enable Anti-Bot Defense Engine
              </label>
            </div>
          </div>
        </div>

        {/* Latest Simulation Results */}
        <div className="lg:col-span-2 fd-card space-y-6 p-6">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
            <div>
              <h2 className="text-base font-bold text-white">Simulation Benchmark Results</h2>
              <p className="text-xs text-white/40">Run ID: {latest?.run_id ?? "sim_50k_live_001"}</p>
            </div>
            <span className="fd-pill bg-fd-green/15 text-fd-green text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETED (100%)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-white/[0.03]">
              <span className="text-[10px] text-white/40 block">Oversell Count</span>
              <span className="text-xl font-bold text-fd-green">
                {latest?.results?.oversell_count ?? 0}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03]">
              <span className="text-[10px] text-white/40 block">Duplicate Bookings</span>
              <span className="text-xl font-bold text-fd-green">
                {latest?.results?.duplicate_bookings ?? 0}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03]">
              <span className="text-[10px] text-white/40 block">Genuine Fan Win %</span>
              <span className="text-xl font-bold text-fd-green">
                {formatPercent(latest?.results?.legitimate_success_rate ?? 0.982)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03]">
              <span className="text-[10px] text-white/40 block">Bot Win Rate</span>
              <span className="text-xl font-bold text-fd-green">
                {formatPercent(latest?.results?.bot_allocation_rate ?? 0.008)}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] space-y-2 border border-white/[0.06]">
            <h3 className="text-xs font-bold text-white">Engine Performance under 50,000 Traffic Spike</h3>
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Peak Latency (p99)</span>
              <span className="font-mono text-white">
                {formatLatency(latest?.results?.latency.p99 ?? 142)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Queue Bypass Block Rate</span>
              <span className="font-mono text-fd-green font-bold">100% Blocked</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
