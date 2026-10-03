"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { Settings, Save, RefreshCw, CheckCircle2, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import type { PlatformSettings } from "@/lib/types";

export default function PlatformSettingsPage() {
  const { data: currentSettings, refetch } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => api.getSettings(),
  });

  const [form, setForm] = useState<PlatformSettings>({
    admission_rate_per_second: 10,
    hold_duration_seconds: 120,
    rate_limit_requests_per_minute: 60,
    rate_limit_burst: 10,
    per_account_ticket_limit: 1,
    mitigation_enabled: true,
  });

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentSettings) {
      setForm(currentSettings);
    }
  }, [currentSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateSettings(form);
      await refetch();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white/[0.92]">Platform Settings & Config Engine</h1>
          <p className="text-sm text-white/40 mt-1">
            Configure system admission rates, reservation hold durations, rate limits, and per-account limits.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="fd-card space-y-6 p-6 max-w-2xl">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-fd-primary" /> Core Engine Rules
        </h2>

        <div className="space-y-4 text-xs">
          <div>
            <label className="text-white/60 block mb-1 font-medium">
              Queue Admission Rate (users admitted per second)
            </label>
            <input
              type="number"
              value={form.admission_rate_per_second}
              onChange={(e) => setForm({ ...form, admission_rate_per_second: Number(e.target.value) })}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-fd-primary"
            />
          </div>

          <div>
            <label className="text-white/60 block mb-1 font-medium">
              Reservation Hold Duration (seconds)
            </label>
            <input
              type="number"
              value={form.hold_duration_seconds}
              onChange={(e) => setForm({ ...form, hold_duration_seconds: Number(e.target.value) })}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-fd-primary"
            />
          </div>

          <div>
            <label className="text-white/60 block mb-1 font-medium">
              Rate Limit Threshold (requests / minute / IP)
            </label>
            <input
              type="number"
              value={form.rate_limit_requests_per_minute}
              onChange={(e) => setForm({ ...form, rate_limit_requests_per_minute: Number(e.target.value) })}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-fd-primary"
            />
          </div>

          <div>
            <label className="text-white/60 block mb-1 font-medium">
              Per-Account Max Ticket Limit
            </label>
            <input
              type="number"
              value={form.per_account_ticket_limit}
              onChange={(e) => setForm({ ...form, per_account_ticket_limit: Number(e.target.value) })}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-fd-primary"
            />
          </div>

          <div className="pt-2 border-t border-white/[0.06]">
            <label className="flex items-center gap-3 text-white/80 cursor-pointer">
              <input
                type="checkbox"
                checked={form.mitigation_enabled}
                onChange={(e) => setForm({ ...form, mitigation_enabled: e.target.checked })}
                className="w-4 h-4 accent-fd-primary"
              />
              <span className="font-semibold">Enable Anti-Bot Defense Engine</span>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-full bg-fd-primary text-fd-bg font-bold text-xs hover:bg-fd-primary-hover transition-all flex items-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration Changes
          </button>

          {saved && (
            <span className="text-xs text-fd-green font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Platform settings updated!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
