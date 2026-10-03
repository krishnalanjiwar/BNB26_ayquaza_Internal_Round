"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Zap, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function SignInPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const session = await api.signIn(username.trim());
      sessionStorage.setItem("fd_session", JSON.stringify(session));
      router.push("/waiting-room");
    } catch {
      setError("Failed to create session. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-fd-bg flex flex-col">
      <header className="border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-fd-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-fd-bg" />
            </div>
            <span className="font-bold text-sm">Fair Drop</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm"
        >
          <div className="fd-card space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-bold">Join the Sale</h1>
              <p className="text-sm text-white/40 mt-1">
                Enter your username to get your spot in the queue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block text-xs text-white/40 mb-2"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., alex_chen"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.06] text-white/[0.92] placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-fd-primary focus:border-transparent transition-all"
                  autoFocus
                  disabled={isLoading}
                />
                {error && (
                  <p className="text-fd-red text-xs mt-2">{error}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !username.trim()}
                className="w-full py-3 px-4 rounded-full bg-fd-primary text-fd-bg font-semibold text-sm hover:bg-fd-primary-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating session…
                  </>
                ) : (
                  <>
                    Enter Queue
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-[11px] text-white/30 text-center leading-relaxed">
              Your session is stored locally. One ticket per account.
              Refreshing the page will not lose your position.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
