"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Zap, CheckCircle2, QrCode, Calendar, MapPin, Ticket, ShieldCheck, ArrowRight, Download } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { BookingResponse } from "@/lib/types";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get("booking_id");
  const [booking, setBooking] = useState<BookingResponse | null>(null);

  useEffect(() => {
    // Read from session or fetch via API
    const stored = sessionStorage.getItem("fd_booking");
    if (stored) {
      const parsed: BookingResponse = JSON.parse(stored);
      setBooking(parsed);
    } else if (bookingIdParam) {
      api.getBooking(bookingIdParam).then(setBooking).catch(console.error);
    }
  }, [bookingIdParam]);

  if (!booking) {
    return (
      <div className="fd-card text-center space-y-4 max-w-md w-full">
        <CheckCircle2 className="w-12 h-12 text-fd-green mx-auto animate-pulse" />
        <h2 className="text-xl font-bold">Retrieving Ticket Confirmation…</h2>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md space-y-6"
    >
      {/* Success Banner */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-fd-green/15 text-fd-green flex items-center justify-center mx-auto mb-3 border border-fd-green/30 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <span className="fd-pill bg-fd-green/15 text-fd-green text-xs font-semibold">
          BOOKING CONFIRMED & VERIFIED
        </span>
        <h1 className="text-2xl font-bold text-white/[0.92]">You&apos;re Going to Neon Pulse!</h1>
        <p className="text-xs text-white/50">
          Your seat was fairly reserved amidst high traffic and protected from automated bots.
        </p>
      </div>

      {/* Ticket Card Aesthetic */}
      <div className="fd-card relative overflow-hidden border border-white/[0.1] bg-gradient-to-b from-[#18181b] to-[#121214] p-6 space-y-6 shadow-2xl">
        {/* Decorative Ticket Stub Edges */}
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-fd-bg border border-white/[0.06]" />
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-fd-bg border border-white/[0.06]" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-fd-primary flex items-center justify-center text-fd-bg">
              <Zap className="w-4 h-4" />
            </div>
            <span className="font-bold text-xs tracking-wider uppercase text-white/60">
              Fair Drop Digital Ticket
            </span>
          </div>
          <span className="text-[11px] font-mono text-fd-primary bg-fd-primary/10 px-2.5 py-1 rounded-md">
            SEAT #{booking.seat_number}
          </span>
        </div>

        {/* Event Meta */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-white">Neon Pulse World Tour 2026</h2>
          
          <div className="grid grid-cols-2 gap-3 text-xs text-white/60">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-fd-primary" />
              <span>Nov 15, 2026 • 8:00 PM</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-fd-primary" />
              <span>Meridian Arena, Mumbai</span>
            </div>
          </div>
        </div>

        {/* Dotted separator */}
        <div className="border-t border-dashed border-white/[0.12] my-4" />

        {/* QR Code & IDs */}
        <div className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-xl border border-white/[0.04]">
          <div className="w-24 h-24 bg-white rounded-lg p-2 flex items-center justify-center flex-shrink-0 shadow-md">
            {/* Visual SVG QR Code */}
            <div className="w-full h-full border-2 border-black p-1 flex flex-col justify-between">
              <div className="flex justify-between">
                <div className="w-4 h-4 bg-black" />
                <div className="w-4 h-4 bg-black" />
              </div>
              <div className="flex items-center justify-center">
                <QrCode className="w-6 h-6 text-black" />
              </div>
              <div className="flex justify-between">
                <div className="w-4 h-4 bg-black" />
                <div className="w-2 h-2 bg-black" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <div>
              <span className="text-white/40 block text-[10px]">BOOKING ID</span>
              <span className="font-mono text-white/90 font-medium">{booking.booking_id}</span>
            </div>
            <div>
              <span className="text-white/40 block text-[10px]">TXN ID</span>
              <span className="font-mono text-white/50 text-[11px] truncate block max-w-[160px]">
                {booking.transaction_id}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-fd-green font-medium pt-1">
              <ShieldCheck className="w-3 h-3" /> Proof of Fairness Validated
            </div>
          </div>
        </div>

        {/* Download / Save */}
        <button
          onClick={() => alert("Ticket pass downloaded successfully!")}
          className="w-full py-2.5 px-4 rounded-xl bg-white/[0.06] text-xs font-medium text-white/80 hover:bg-white/[0.1] transition-all flex items-center justify-center gap-2"
        >
          <Download className="w-3.5 h-3.5" /> Save Digital Ticket Pass (.pkpass)
        </button>
      </div>

      {/* Action Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex-1 py-3 px-4 rounded-full border border-white/[0.08] text-xs font-medium text-center hover:bg-white/[0.04] transition-colors"
        >
          Back to Home
        </Link>
        <Link
          href="/admin"
          className="flex-1 py-3 px-4 rounded-full bg-fd-primary/10 border border-fd-primary/30 text-fd-primary text-xs font-medium text-center hover:bg-fd-primary/20 transition-all flex items-center justify-center gap-1.5"
        >
          View Live Ops Console
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </motion.div>
  );
}

export default function ConfirmationPage() {
  return (
    <div className="min-h-screen bg-fd-bg flex flex-col text-fd-text">
      {/* Header */}
      <header className="border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-fd-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-fd-bg" />
            </div>
            <span className="font-bold text-sm">Fair Drop</span>
          </Link>

          <Link href="/admin" className="text-xs text-white/50 hover:text-white transition-colors">
            Admin Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <Suspense fallback={<div className="text-white/40">Loading booking...</div>}>
          <ConfirmationContent />
        </Suspense>
      </main>
    </div>
  );
}
