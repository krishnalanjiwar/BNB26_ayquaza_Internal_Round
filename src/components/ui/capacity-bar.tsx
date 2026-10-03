"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface CapacityBarProps {
  total: number;
  segments: { value: number; color: string; label: string }[];
  height?: number;
  className?: string;
  showLabels?: boolean;
}

export function CapacityBar({
  total,
  segments,
  height = 8,
  className,
  showLabels = true,
}: CapacityBarProps) {
  return (
    <div className={cn("w-full", className)}>
      <div
        className="w-full rounded-full overflow-hidden bg-white/[0.06] flex"
        style={{ height }}
      >
        {segments.map((seg, i) => {
          const pct = total > 0 ? (seg.value / total) * 100 : 0;
          return (
            <motion.div
              key={i}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.1 }}
              style={{ backgroundColor: seg.color }}
              className="h-full"
            />
          );
        })}
      </div>
      {showLabels && (
        <div className="flex items-center gap-4 mt-2">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-xs text-white/40">
                {seg.label}: {seg.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
