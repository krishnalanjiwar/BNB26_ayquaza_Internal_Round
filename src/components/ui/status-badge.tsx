"use client";

import { cn } from "@/lib/utils";
import type { QueueState, ClientLabel } from "@/lib/types";

interface StatusBadgeProps {
  status: QueueState | ClientLabel | string;
  size?: "sm" | "md";
  className?: string;
}

const statusConfig: Record<
  string,
  { bg: string; text: string; dot: string; label: string }
> = {
  WAITING: {
    bg: "bg-white/[0.06]",
    text: "text-white/60",
    dot: "bg-white/40",
    label: "Waiting",
  },
  ADMITTED: {
    bg: "bg-fd-blue/15",
    text: "text-fd-blue",
    dot: "bg-fd-blue",
    label: "Admitted",
  },
  RESERVATION_HELD: {
    bg: "bg-fd-amber/15",
    text: "text-fd-amber",
    dot: "bg-fd-amber",
    label: "Held",
  },
  BOOKED: {
    bg: "bg-fd-green/15",
    text: "text-fd-green",
    dot: "bg-fd-green",
    label: "Booked",
  },
  EXPIRED: {
    bg: "bg-white/[0.04]",
    text: "text-white/40",
    dot: "bg-white/30",
    label: "Expired",
  },
  REJECTED: {
    bg: "bg-fd-red/15",
    text: "text-fd-red",
    dot: "bg-fd-red",
    label: "Rejected",
  },
  GENUINE: {
    bg: "bg-fd-green/15",
    text: "text-fd-green",
    dot: "bg-fd-green",
    label: "Genuine",
  },
  SUSPICIOUS: {
    bg: "bg-fd-amber/15",
    text: "text-fd-amber",
    dot: "bg-fd-amber",
    label: "Suspicious",
  },
  BOT: {
    bg: "bg-fd-red/15",
    text: "text-fd-red",
    dot: "bg-fd-red",
    label: "Bot",
  },
  UPCOMING: {
    bg: "bg-fd-blue/15",
    text: "text-fd-blue",
    dot: "bg-fd-blue",
    label: "Upcoming",
  },
  LIVE: {
    bg: "bg-fd-green/15",
    text: "text-fd-green",
    dot: "bg-fd-green",
    label: "Live",
  },
  SOLD_OUT: {
    bg: "bg-fd-red/15",
    text: "text-fd-red",
    dot: "bg-fd-red",
    label: "Sold Out",
  },
  CONFIRMED: {
    bg: "bg-fd-green/15",
    text: "text-fd-green",
    dot: "bg-fd-green",
    label: "Confirmed",
  },
  RUNNING: {
    bg: "bg-fd-blue/15",
    text: "text-fd-blue",
    dot: "bg-fd-blue",
    label: "Running",
  },
  COMPLETED: {
    bg: "bg-fd-green/15",
    text: "text-fd-green",
    dot: "bg-fd-green",
    label: "Completed",
  },
  FAILED: {
    bg: "bg-fd-red/15",
    text: "text-fd-red",
    dot: "bg-fd-red",
    label: "Failed",
  },
  PENDING: {
    bg: "bg-white/[0.06]",
    text: "text-white/60",
    dot: "bg-white/40",
    label: "Pending",
  },
  ALLOWED: {
    bg: "bg-fd-green/15",
    text: "text-fd-green",
    dot: "bg-fd-green",
    label: "Allowed",
  },
  THROTTLED: {
    bg: "bg-fd-amber/15",
    text: "text-fd-amber",
    dot: "bg-fd-amber",
    label: "Throttled",
  },
  CHALLENGED: {
    bg: "bg-fd-purple/15",
    text: "text-fd-purple",
    dot: "bg-fd-purple",
    label: "Challenged",
  },
  BLOCKED: {
    bg: "bg-fd-red/15",
    text: "text-fd-red",
    dot: "bg-fd-red",
    label: "Blocked",
  },
};

export function StatusBadge({
  status,
  size = "sm",
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    bg: "bg-white/[0.06]",
    text: "text-white/60",
    dot: "bg-white/40",
    label: status,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        config.bg,
        config.text,
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
        className
      )}
    >
      <span className={cn("fd-dot", config.dot)} />
      {config.label}
    </span>
  );
}
