"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { Shield, ShieldAlert, ShieldCheck, Lock, Sliders, Zap, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { formatPercent } from "@/lib/utils";

const EVENT_ID = "evt_neon_pulse_2026";

export default function SecurityEnginePage() {
  const { data: metrics } = useQuery({
    queryKey: ["admin-metrics", EVENT_ID],
    queryFn: () => api.getMetrics(EVENT_ID),
    refetchInterval: 2000,
  });

  const { data: settings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => api.getSettings(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white/[0.92]">Security Engine & Bot Defense</h1>
          <p className="text-sm text-white/40 mt-1">
            Active anti-bot rules, turnstile verification, token validation, and rate limit defense layers.
          </p>
        </div>
        <div className="fd-pill bg-fd-green/15 text-fd-green text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" /> Security Shield Active
        </div>
      </div>

      {/* Security Rule Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <DashboardCard title="Token Forgery Defense">
          <div className="text-2xl font-bold text-fd-green">100% Blocked</div>
          <p className="text-xs text-white/40 mt-1">HMAC Signed Queue Tokens</p>
        </DashboardCard>

        <DashboardCard title="CAPTCHA Challenge Rate">
          <div className="text-2xl font-bold text-fd-purple">1.2%</div>
          <p className="text-xs text-white/40 mt-1">Silent Turnstile Fingerprinting</p>
        </DashboardCard>

        <DashboardCard title="Rate Limit Throttled">
          <div className="text-2xl font-bold text-fd-amber">
            {metrics?.decisions.throttled.toLocaleString() ?? 0} req
          </div>
          <p className="text-xs text-white/40 mt-1">Exceeded 60 req/min limit</p>
        </DashboardCard>

        <DashboardCard title="Bypass Attempts">
          <div className="text-2xl font-bold text-fd-green">
            {formatPercent(metrics?.bypass_rate ?? 0)}
          </div>
          <p className="text-xs text-white/40 mt-1">Direct endpoint injection blocked</p>
        </DashboardCard>
      </div>

      {/* Security Rules Engine Controls */}
      <div className="fd-card space-y-6 p-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-fd-primary" /> Active Defense Rule Engine
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 rounded-2xl bg-white/[0.03] space-y-3 border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white text-sm">Behavioral Fingerprint Analyzer</span>
              <span className="fd-pill bg-fd-green/15 text-fd-green text-xs">ENABLED</span>
            </div>
            <p className="text-xs text-white/50">
              Detects identical click patterns, zero-mouse movement, and headless Chromium User-Agents.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] space-y-3 border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white text-sm">Idempotency Key Guard</span>
              <span className="fd-pill bg-fd-green/15 text-fd-green text-xs">ENABLED</span>
            </div>
            <p className="text-xs text-white/50">
              Prevents duplicate reservation claims during network retries or parallel tab requests.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] space-y-3 border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white text-sm">Randomized Admission Window</span>
              <span className="fd-pill bg-fd-green/15 text-fd-green text-xs">ACTIVE</span>
            </div>
            <p className="text-xs text-white/50">
              Randomizes 50ms admission batches to prevent automated sub-millisecond network race wins.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] space-y-3 border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white text-sm">IP Subnet Burst Limiter</span>
              <span className="fd-pill bg-fd-amber/15 text-fd-amber text-xs">STRICT</span>
            </div>
            <p className="text-xs text-white/50">
              Limits max 3 active checkout sessions per residential IP range.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
