"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  ShieldCheck,
  Ticket,
  Clock,
  QrCode,
  Users,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Sparkles,
  Download,
  Share2,
  Lock,
  Search,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { CapacityBar } from "@/components/ui/capacity-bar";
import type { UserSession } from "@/lib/types";

export default function ClientDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "tickets" | "drops" | "fairness">("overview");

  useEffect(() => {
    const stored = sessionStorage.getItem("fd_session");
    if (stored) {
      setSession(JSON.parse(stored));
    } else {
      // Set default demo buyer session if not signed in
      const demo: UserSession = {
        user_id: "usr_genuine_8829",
        username: "Alex_GenuineBuyer",
        token: "tok_demo_client_991823",
      };
      setSession(demo);
      sessionStorage.setItem("fd_session", JSON.stringify(demo));
    }
  }, []);

  return (
    <div className="min-h-screen bg-fd-bg text-fd-text flex flex-col font-sans">
      {/* ─── Top Navigation Header ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#0B0B0D]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-fd-primary flex items-center justify-center text-fd-bg shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-white block leading-none">
                  Fair Drop
                </span>
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">
                  Buyer Dashboard
                </span>
              </div>
            </Link>

            {/* Navigation tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-white/[0.03] p-1 rounded-full border border-white/[0.06]">
              {(
                [
                  { id: "overview", label: "Overview" },
                  { id: "tickets", label: "My Passes & Tickets" },
                  { id: "drops", label: "Live & Upcoming Drops" },
                  { id: "fairness", label: "Fairness Log" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-fd-primary text-fd-bg font-semibold shadow-md"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Anti-Bot Verification Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-fd-green/10 border border-fd-green/20 text-fd-green text-xs font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>98.4% Trust Rating</span>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-white/[0.08]">
              <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center text-xs font-bold text-white/80 border border-white/[0.1]">
                {session?.username ? session.username.substring(0, 2).toUpperCase() : "GB"}
              </div>
              <span className="text-xs font-medium text-white/80 hidden lg:inline">
                {session?.username ?? "Genuine Buyer"}
              </span>
            </div>

            {/* Switch to Admin View */}
            <Link
              href="/admin"
              className="px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs font-medium text-white/60 hover:text-white hover:bg-white/[0.1] transition-all flex items-center gap-1.5"
            >
              Ops Console
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Main Content Area ────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Buyer Welcome Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#18181b] via-[#141416] to-[#0d0d0e] border border-white/[0.08] p-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-fd-primary/10 blur-[100px] pointer-events-none rounded-full" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="fd-pill bg-fd-primary/15 text-fd-primary text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  VERIFIED HUMAN BUYER
                </span>
                <span className="text-xs text-white/40">ID: {session?.user_id ?? "usr_genuine_8829"}</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                Welcome back, {session?.username ?? "Genuine Buyer"}!
              </h1>
              <p className="text-sm text-white/60 leading-relaxed">
                Your Anti-Bot Trust Engine profile is verified. You get priority fair queue routing, zero CAPTCHA delays, and cryptographic proof-of-fairness on all ticket drops.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/waiting-room")}
                className="px-6 py-3.5 rounded-full bg-fd-primary text-fd-bg font-bold text-sm hover:bg-fd-primary-hover transition-all shadow-[0_0_25px_rgba(255,255,255,0.25)] flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Join Live Drop Queue
              </button>
              <button
                onClick={() => setActiveTab("tickets")}
                className="px-5 py-3.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs font-semibold text-white hover:bg-white/[0.12] transition-all flex items-center gap-2"
              >
                <Ticket className="w-4 h-4 text-fd-primary" />
                View Passes
              </button>
            </div>
          </div>
        </div>

        {/* Client KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="fd-card p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-white/40">
              <span>Anti-Bot Verification</span>
              <ShieldCheck className="w-4 h-4 text-fd-green" />
            </div>
            <div className="text-2xl font-bold text-fd-green tabular-nums">98.4%</div>
            <p className="text-[11px] text-white/50">Passed fingerprint & behavioral analysis</p>
          </div>

          <div className="fd-card p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-white/40">
              <span>Active Tickets Owned</span>
              <Ticket className="w-4 h-4 text-fd-primary" />
            </div>
            <div className="text-2xl font-bold text-white tabular-nums">1 Seat</div>
            <p className="text-[11px] text-fd-primary font-medium">Seat #42 (VIP Section)</p>
          </div>

          <div className="fd-card p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-white/40">
              <span>Best Queue Rank</span>
              <TrendingUp className="w-4 h-4 text-fd-blue" />
            </div>
            <div className="text-2xl font-bold text-fd-blue tabular-nums">#14</div>
            <p className="text-[11px] text-white/50">Out of 50,000 competing requests</p>
          </div>

          <div className="fd-card p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-white/40">
              <span>Fairness Audit</span>
              <CheckCircle2 className="w-4 h-4 text-fd-green" />
            </div>
            <div className="text-2xl font-bold text-white font-mono text-sm truncate">
              0x9f82...a38e
            </div>
            <p className="text-[11px] text-fd-green font-medium">Cryptographically Validated</p>
          </div>
        </div>

        {/* ─── TAB 1: OVERVIEW ────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Featured Live Drop Card (2 cols) */}
            <div className="lg:col-span-2 fd-card space-y-6 p-6">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="fd-dot fd-dot-pulse bg-fd-green" />
                    <span className="text-xs font-semibold text-fd-green uppercase tracking-wider">
                      LIVE LIMITED SEAT DROP
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">Neon Pulse World Tour 2026</h2>
                </div>
                <div className="text-right">
                  <span className="text-xs text-white/40 block">Capacity</span>
                  <span className="text-sm font-bold text-fd-primary">500 Seats Available</span>
                </div>
              </div>

              {/* Event Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-white/[0.03] space-y-1">
                  <span className="text-white/40 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-fd-primary" /> Event Date
                  </span>
                  <span className="font-semibold text-white block">Nov 15, 2026 • 8:00 PM</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.03] space-y-1">
                  <span className="text-white/40 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-fd-blue" /> Competing Traffic
                  </span>
                  <span className="font-semibold text-white block">~50,000 Live Requests</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.03] space-y-1">
                  <span className="text-white/40 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-fd-green" /> Allocation Rule
                  </span>
                  <span className="font-semibold text-fd-green block">Randomized Window (Fair)</span>
                </div>
              </div>

              {/* Live Inventory Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Real-time Seat Allocation</span>
                  <span className="text-white/40 font-mono">500 / 500 Remaining</span>
                </div>
                <CapacityBar
                  total={500}
                  segments={[
                    { value: 120, color: "var(--fd-green)", label: "Booked" },
                    { value: 45, color: "var(--fd-amber)", label: "Held" },
                    { value: 335, color: "rgba(255,255,255,0.08)", label: "Available" },
                  ]}
                  height={10}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <Clock className="w-4 h-4 text-fd-amber" />
                  <span>Hold duration: 120s upon admission</span>
                </div>
                <button
                  onClick={() => router.push("/waiting-room")}
                  className="px-6 py-3 rounded-full bg-fd-primary text-fd-bg font-bold text-xs hover:bg-fd-primary-hover transition-all flex items-center gap-2"
                >
                  Enter Waiting Room
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Verification & Trust Badge Card */}
            <div className="fd-card p-6 space-y-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-fd-green/15 text-fd-green flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Verification Status</h3>
                  <p className="text-xs text-white/40">Anti-Bot Shield Active</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Browser Fingerprint</span>
                  <span className="text-fd-green font-medium">PASSED</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Request Variance Test</span>
                  <span className="text-fd-green font-medium">HUMAN LATENCY</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Per-Account Ticket Limit</span>
                  <span className="text-white/80">Max 1 Seat</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">CAPTCHA Status</span>
                  <span className="text-fd-green font-medium">BYPASSED (Trusted)</span>
                </div>
              </div>

              <p className="text-[11px] text-white/40 leading-normal">
                Fair Drop continuously scores traffic in real-time. Automated scripts and bot farms are throttled to ensure genuine fans get equal access.
              </p>
            </div>
          </div>
        )}

        {/* ─── TAB 2: MY TICKETS & PASSES ─────────────────────────────────── */}
        {activeTab === "tickets" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">My Digital Wallet & Ticket Passes</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ticket Pass Visual */}
              <div className="fd-card relative overflow-hidden bg-gradient-to-br from-[#1c1c20] to-[#121214] border border-white/[0.1] p-6 space-y-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-fd-primary text-fd-bg flex items-center justify-center font-bold">
                      <Zap className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs tracking-wider uppercase text-white/60">
                      Verified Pass
                    </span>
                  </div>
                  <span className="fd-pill bg-fd-green/15 text-fd-green text-xs font-semibold">
                    CONFIRMED
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Neon Pulse World Tour 2026</h3>
                  <p className="text-xs text-white/50">Meridian Arena, Mumbai • Nov 15, 2026</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] flex items-center justify-between">
                  <div>
                    <span className="text-xs text-white/40 block">Assigned Seat</span>
                    <span className="text-xl font-bold text-fd-primary">SEAT #42</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-white/40 block">Booking Reference</span>
                    <span className="text-xs font-mono text-white/80">BK-9921-FAIR</span>
                  </div>
                </div>

                <div className="flex items-center justify-center p-4 bg-white rounded-xl">
                  <QrCode className="w-32 h-32 text-black" />
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    onClick={() => alert("Downloading Apple Wallet .pkpass")}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-white/[0.06] text-xs font-medium hover:bg-white/[0.1] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Save to Passbook
                  </button>
                  <button
                    onClick={() => alert("Shareable verification link copied!")}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-white/[0.06] text-xs font-medium hover:bg-white/[0.1] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share Pass
                  </button>
                </div>
              </div>

              {/* Venue Map & Policy */}
              <div className="fd-card p-6 space-y-5 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-base text-white mb-2">Venue & Entry Information</h3>
                  <p className="text-xs text-white/50 mb-4">
                    Gate 4 Access • VIP Zone A • Fast-track Entry with Fair Drop QR
                  </p>

                  <div className="h-48 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-center p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-fd-primary/10 to-transparent pointer-events-none" />
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-full bg-fd-primary/20 text-fd-primary flex items-center justify-center mx-auto">
                        <Ticket className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold text-white block">Arena Layout: VIP Section Row A</span>
                      <span className="text-[11px] text-white/40 block">Seat #42 reserved specifically for your verified account</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-fd-primary/10 border border-fd-primary/20 text-xs text-white/80 space-y-1">
                  <div className="font-semibold text-fd-primary">Anti-Scalping Guarantee</div>
                  <p className="text-white/60">
                    This ticket is non-transferable to automated bot resellers. Name matches session identity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: UPCOMING DROPS ──────────────────────────────────────── */}
        {activeTab === "drops" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Upcoming Limited-Seat Drops</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: "Neon Pulse World Tour 2026",
                  date: "Nov 15, 2026",
                  capacity: "500 Seats",
                  status: "LIVE NOW",
                  competing: "50,000 Live",
                  statusColor: "text-fd-green bg-fd-green/15",
                },
                {
                  title: "Cyberpunk Symphony Live",
                  date: "Dec 02, 2026",
                  capacity: "500 Seats",
                  status: "STARTS IN 2D",
                  competing: "32,100 Pre-registered",
                  statusColor: "text-fd-amber bg-fd-amber/15",
                },
                {
                  title: "Starlight Festival Midnight Set",
                  date: "Dec 20, 2026",
                  capacity: "500 Seats",
                  status: "UPCOMING",
                  competing: "18,400 Pre-registered",
                  statusColor: "text-fd-blue bg-fd-blue/15",
                },
              ].map((drop, idx) => (
                <div key={idx} className="fd-card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`fd-pill ${drop.statusColor} text-xs font-bold`}>
                      {drop.status}
                    </span>
                    <span className="text-xs text-white/40">{drop.capacity}</span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white">{drop.title}</h3>
                    <p className="text-xs text-white/50">{drop.date} • {drop.competing}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                    <span className="text-xs text-white/40">Fair Drop Protected</span>
                    <button
                      onClick={() => router.push("/waiting-room")}
                      className="px-4 py-2 rounded-full bg-fd-primary text-fd-bg font-bold text-xs hover:bg-fd-primary-hover transition-all"
                    >
                      Join Queue
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 4: FAIRNESS LOG ────────────────────────────────────────── */}
        {activeTab === "fairness" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Cryptographic Proof-of-Fairness Log</h2>
                <p className="text-xs text-white/40">Every drop allocation is recorded with an immutable audit hash.</p>
              </div>
              <div className="fd-pill bg-fd-green/15 text-fd-green text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Audit Verified
              </div>
            </div>

            <div className="fd-card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.03] text-white/40 border-b border-white/[0.06]">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Drop Event</th>
                      <th className="px-6 py-3 font-semibold">Queue Rank</th>
                      <th className="px-6 py-3 font-semibold">Allocated Seat</th>
                      <th className="px-6 py-3 font-semibold">Proof Hash</th>
                      <th className="px-6 py-3 font-semibold">Mitigation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-white/80">
                    <tr>
                      <td className="px-6 py-4 font-semibold text-white">Neon Pulse 2026</td>
                      <td className="px-6 py-4 font-mono text-fd-primary">#14 / 50,000</td>
                      <td className="px-6 py-4 font-bold">Seat #42</td>
                      <td className="px-6 py-4 font-mono text-white/40">0x9f82a38e119b4c09</td>
                      <td className="px-6 py-4">
                        <span className="fd-pill bg-fd-green/15 text-fd-green text-[11px]">ALLOWED (Genuine)</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-semibold text-white">Cyberpunk Prelude</td>
                      <td className="px-6 py-4 font-mono text-fd-blue">#88 / 42,000</td>
                      <td className="px-6 py-4 font-bold">Seat #108</td>
                      <td className="px-6 py-4 font-mono text-white/40">0x44c1209e88aa1192</td>
                      <td className="px-6 py-4">
                        <span className="fd-pill bg-fd-green/15 text-fd-green text-[11px]">ALLOWED (Genuine)</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
