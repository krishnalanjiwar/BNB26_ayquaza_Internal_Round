import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a UUID v4 for idempotency keys
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

/**
 * Format a number with commas
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/**
 * Format milliseconds to a readable latency string
 */
export function formatLatency(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format seconds to mm:ss countdown
 */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Get initials from a username
 */
export function getInitials(name: string): string {
  return name
    .split(/[\s_-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Sleep for given ms
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random number between min and max inclusive
 */
export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Status color mapping for queue states
 */
export function getStateColor(state: string): string {
  switch (state) {
    case "WAITING":
      return "text-white/60";
    case "ADMITTED":
      return "text-fd-blue";
    case "RESERVATION_HELD":
      return "text-fd-amber";
    case "BOOKED":
      return "text-fd-green";
    case "EXPIRED":
      return "text-white/40";
    case "REJECTED":
      return "text-fd-red";
    default:
      return "text-white/60";
  }
}

export function getStateBgColor(state: string): string {
  switch (state) {
    case "WAITING":
      return "bg-white/10";
    case "ADMITTED":
      return "bg-fd-blue/15";
    case "RESERVATION_HELD":
      return "bg-fd-amber/15";
    case "BOOKED":
      return "bg-fd-green/15";
    case "EXPIRED":
      return "bg-white/5";
    case "REJECTED":
      return "bg-fd-red/15";
    default:
      return "bg-white/10";
  }
}

export function getLabelColor(label: string): {
  text: string;
  bg: string;
  dot: string;
} {
  switch (label) {
    case "GENUINE":
      return {
        text: "text-fd-green",
        bg: "bg-fd-green/15",
        dot: "bg-fd-green",
      };
    case "SUSPICIOUS":
      return {
        text: "text-fd-amber",
        bg: "bg-fd-amber/15",
        dot: "bg-fd-amber",
      };
    case "BOT":
      return { text: "text-fd-red", bg: "bg-fd-red/15", dot: "bg-fd-red" };
    default:
      return {
        text: "text-white/60",
        bg: "bg-white/10",
        dot: "bg-white/40",
      };
  }
}
