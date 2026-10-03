"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Zap, ShieldCheck, Lock, CreditCard, Loader2, Clock, Check } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatCountdown } from "@/lib/utils";
import type { ReserveResponse } from "@/lib/types";

export default function PaymentPage() {
  const router = useRouter();
  const [reservation, setReservation] = useState<ReserveResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holdRemaining, setHoldRemaining] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi">("card");

  useEffect(() => {
    const stored = sessionStorage.getItem("fd_reservation");
    if (!stored) {
      router.push("/waiting-room");
      return;
    }
    const parsed: ReserveResponse = JSON.parse(stored);
    setReservation(parsed);
  }, [router]);

  useEffect(() => {
    if (!reservation?.expires_at) return;

    const update = () => {
      const remaining = Math.max(
        0,
        (new Date(reservation.expires_at).getTime() - Date.now()) / 1000
      );
      setHoldRemaining(remaining);
      if (remaining <= 0) {
        setError("Your reservation hold expired. Please rejoin the queue.");
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [reservation]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservation || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.pay(reservation.reservation_id);
      sessionStorage.setItem("fd_booking", JSON.stringify(res));
      sessionStorage.removeItem("fd_reservation");
      router.push(`/confirmation?booking_id=${res.booking_id}`);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message ?? "Payment failed. Retrying cleanly is safe.");
    } finally {
      setLoading(false);
    }
  };

  if (!reservation) return null;

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

          {holdRemaining !== null && (
            <div className="fd-pill bg-fd-amber/15 text-fd-amber text-xs">
              <Clock className="w-3.5 h-3.5" />
              Hold expires in {formatCountdown(holdRemaining)}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-6"
        >
          {/* Order Summary Card */}
          <div className="fd-card space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div>
                <h2 className="font-bold text-base">Neon Pulse World Tour</h2>
                <p className="text-xs text-white/40">General Admission Access</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-white/40 block">Seat Assigned</span>
                <span className="text-sm font-semibold text-fd-primary">
                  #{reservation.seat_number ?? 42}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">1x VIP Entry Ticket</span>
              <span className="font-medium">$149.00</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Fair Drop Anti-Bot Verification</span>
              <span className="text-fd-green text-xs font-medium">FREE</span>
            </div>
            <div className="flex items-center justify-between text-sm pt-2 border-t border-white/[0.06] font-bold text-base">
              <span>Total</span>
              <span className="text-fd-primary">$149.00</span>
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handlePayment} className="fd-card space-y-5">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-fd-primary" />
              Secure Checkout
            </h3>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                  paymentMethod === "card"
                    ? "border-fd-primary bg-fd-primary/10 text-white"
                    : "border-white/[0.08] text-white/50 hover:border-white/20"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Credit / Debit Card
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("upi")}
                className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                  paymentMethod === "upi"
                    ? "border-fd-primary bg-fd-primary/10 text-white"
                    : "border-white/[0.08] text-white/50 hover:border-white/20"
                }`}
              >
                <Zap className="w-4 h-4" />
                Instant UPI / One-Click
              </button>
            </div>

            {paymentMethod === "card" ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/40 block mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Genuine Buyer"
                    required
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-fd-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 block mb-1">
                    Card Number (Mock Sandbox)
                  </label>
                  <input
                    type="text"
                    defaultValue="4242 •••• •••• 4242"
                    required
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-fd-primary transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/40 block mb-1">
                      Expiry
                    </label>
                    <input
                      type="text"
                      defaultValue="12/28"
                      required
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-fd-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 block mb-1">
                      CVC
                    </label>
                    <input
                      type="text"
                      defaultValue="888"
                      required
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-fd-primary transition-colors"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/[0.03] text-center space-y-2">
                <p className="text-xs text-white/60">
                  Instant Payment ID: <span className="font-mono text-fd-primary">fairdrop@upi</span>
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fd-green/15 text-fd-green text-xs font-semibold">
                  <Check className="w-3.5 h-3.5" /> Fast Verification Active
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-fd-red/10 border border-fd-red/20 text-fd-red text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (holdRemaining !== null && holdRemaining <= 0)}
              className="w-full py-3.5 px-4 rounded-full bg-fd-primary text-fd-bg font-semibold text-sm hover:bg-fd-primary-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing Payment…
                </>
              ) : (
                `Pay $149.00 & Claim Seat #${reservation.seat_number}`
              )}
            </button>
          </form>

          <div className="flex items-center justify-center gap-2 text-xs text-white/30">
            <ShieldCheck className="w-3.5 h-3.5 text-fd-green" />
            256-bit Encrypted Tokenized Transaction
          </div>
        </motion.div>
      </main>
    </div>
  );
}
