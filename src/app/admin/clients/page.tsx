"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ShieldAlert, ShieldCheck, Search, Filter, AlertCircle, Ban, Zap } from "lucide-react";
import { useState } from "react";
import type { ClientEntry } from "@/lib/types";

const EVENT_ID = "evt_neon_pulse_2026";

export default function ClientsInspectorPage() {
  const [filterTab, setFilterTab] = useState<"ALL" | "GENUINE" | "SUSPICIOUS" | "BOT">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientEntry | null>(null);

  const { data: clientsData, refetch } = useQuery({
    queryKey: ["admin-clients", EVENT_ID],
    queryFn: () => api.getClients(EVENT_ID),
    refetchInterval: 2000,
  });

  const clients = clientsData?.clients ?? [];

  const filteredClients = clients.filter((c) => {
    if (filterTab !== "ALL" && c.label !== filterTab) return false;
    if (searchTerm && !c.session_id.toLowerCase().includes(searchTerm.toLowerCase()) && !c.id.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleAction = async (action: "throttle" | "block" | "release", clientId: string) => {
    if (action === "throttle") await api.throttleClient(clientId);
    if (action === "block") await api.blockClient(clientId);
    if (action === "release") await api.releaseFlag(clientId);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white/[0.92]">Client Threat & Session Inspector</h1>
          <p className="text-sm text-white/40 mt-1">
            Real-time session risk analysis, request velocity tracking, and manual intervention controls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="fd-pill bg-white/[0.06] text-xs">
            Total Sessions: <span className="font-bold text-white">{clients.length}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-fd-card p-4 rounded-2xl border border-white/[0.06]">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {(["ALL", "GENUINE", "SUSPICIOUS", "BOT"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                filterTab === tab
                  ? "bg-fd-primary text-fd-bg font-semibold"
                  : "bg-white/[0.04] text-white/60 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search session ID or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-full pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:border-fd-primary text-white"
          />
        </div>
      </div>

      {/* Clients Table */}
      <div className="fd-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.03] text-white/40 border-b border-white/[0.06]">
              <tr>
                <th className="px-6 py-3 font-semibold">Client Session</th>
                <th className="px-6 py-3 font-semibold">Threat Label</th>
                <th className="px-6 py-3 font-semibold">Queue State</th>
                <th className="px-6 py-3 font-semibold">Risk Score</th>
                <th className="px-6 py-3 font-semibold">Req / Min</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-white/80">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 font-mono font-medium text-white flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center font-bold text-[10px]">
                      {client.avatar_initials}
                    </div>
                    {client.session_id}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`fd-pill text-[11px] font-bold ${
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
                  <td className="px-6 py-4">
                    <StatusBadge status={client.state} size="sm" />
                  </td>
                  <td className="px-6 py-4 font-semibold tabular-nums">
                    <span className={client.risk_score > 70 ? "text-fd-red" : client.risk_score > 30 ? "text-fd-amber" : "text-fd-green"}>
                      {client.risk_score} / 100
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-white/60">{client.request_count} req</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleAction("throttle", client.id)}
                      className="px-2.5 py-1 rounded bg-fd-amber/10 border border-fd-amber/20 text-fd-amber text-[10px] font-medium hover:bg-fd-amber/20"
                    >
                      Throttle
                    </button>
                    <button
                      onClick={() => handleAction("block", client.id)}
                      className="px-2.5 py-1 rounded bg-fd-red/10 border border-fd-red/20 text-fd-red text-[10px] font-medium hover:bg-fd-red/20"
                    >
                      Block
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
