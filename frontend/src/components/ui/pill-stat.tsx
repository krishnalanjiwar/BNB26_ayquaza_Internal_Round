"use client";

import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./animated-number";
import type { ReactNode } from "react";

interface PillStatProps {
  label: string;
  value: number | string;
  icon?: ReactNode;
  color?: "default" | "green" | "amber" | "red" | "blue" | "primary";
  format?: (n: number) => string;
  pulse?: boolean;
  className?: string;
}

const colorMap = {
  default: "bg-white/[0.06] text-white/[0.92]",
  green: "bg-fd-green/15 text-fd-green",
  amber: "bg-fd-amber/15 text-fd-amber",
  red: "bg-fd-red/15 text-fd-red",
  blue: "bg-fd-blue/15 text-fd-blue",
  primary: "bg-fd-primary/15 text-fd-primary",
};

const dotColorMap = {
  default: "bg-white/40",
  green: "bg-fd-green",
  amber: "bg-fd-amber",
  red: "bg-fd-red",
  blue: "bg-fd-blue",
  primary: "bg-fd-primary",
};

export function PillStat({
  label,
  value,
  icon,
  color = "default",
  format,
  pulse = false,
  className,
}: PillStatProps) {
  return (
    <div
      className={cn(
        "fd-pill",
        colorMap[color],
        className
      )}
    >
      {icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : (
        <span
          className={cn(
            "fd-dot",
            dotColorMap[color],
            pulse && "fd-dot-pulse"
          )}
        />
      )}
      <span className="text-white/60 text-xs">{label}</span>
      <span className="font-semibold text-sm tabular-nums">
        {typeof value === "number" ? (
          <AnimatedNumber value={value} format={format} />
        ) : (
          value
        )}
      </span>
    </div>
  );
}
