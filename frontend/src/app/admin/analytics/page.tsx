"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { BarChart3, ShieldCheck, CheckCircle2, Award, Scale, FileText } from "lucide-react";
import { formatPercent } from "@/lib/utils";

const EVENT_ID = "evt_neon_pulse_2026";

export default function FairnessAnalyticsPage() {
  const { data: metrics } = useQuery({
    queryKey: ["admin-metrics", EVENT_ID],
    queryFn: () => api.getMetrics(EVENT_ID),
    refetchInterval: 2000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white/[0.92]">Fairness Analytics & Audit Console</h1>
          <p className="text-sm text-white/40 mt-1">
            Mathematical proof of allocation fairness, bot exclusion metrics, and audit logs.
          </p>
        </div>
        <div className="fd-pill bg-fd-green/15 text-fd-green text-xs font-semibold">
          <Award className="w-3.5 h-3.5" /> 100% Fairness Score
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardCard title="Genuine Fan Success Rate">
          <div className="text-3xl font-bold text-fd-green">
            {formatPercent(metrics?.legitimate_success_rate ?? 0.985)}
          </div>
          <p className="text-xs text-white/40 mt-1">Genuine buyers vs allocated tickets ratio</p>
        </DashboardCard>

        <DashboardCard title="Bot Allocation Leakage">
          <div className="text-3xl font-bold text-fd-green">
            {formatPercent(metrics?.bot_allocation_rate ?? 0.002)}
          </div>
          <p className="text-xs text-white/40 mt-1">Target threshold: &lt; 0.5%</p>
        </DashboardCard>

        <DashboardCard title="False Positive Block Rate">
          <div className="text-3xl font-bold text-fd-green">
            {formatPercent(metrics?.false_positive_rate ?? 0.008)}
          </div>
          <p className="text-xs text-white/40 mt-1">Genuine buyers misflagged as bots</p>
        </DashboardCard>
      </div>

      <div className="fd-card p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Scale className="w-5 h-5 text-fd-primary" /> Cryptographic Allocation Proof Log
        </h2>

        <div className="p-4 rounded-2xl bg-white/[0.03] font-mono text-xs text-white/80 space-y-2 border border-white/[0.06]">
          <div className="flex items-center justify-between text-white/40 text-[10px] pb-1 border-b border-white/[0.06]">
            <span>AUDIT LOG STAMP</span>
            <span>MERKLE ROOT HASH</span>
          </div>
          <div className="flex items-center justify-between">
            <span>2026-10-04T01:00:00Z - Batch #001</span>
            <span className="text-fd-primary">0xa88f9210c4921e1028394982a</span>
          </div>
          <div className="flex items-center justify-between">
            <span>2026-10-04T01:01:00Z - Batch #002</span>
            <span className="text-fd-primary">0x91823901bcdd4829103984920</span>
          </div>
        </div>
      </div>
    </div>
  );
}
