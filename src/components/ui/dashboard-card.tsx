"use client";

import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface DashboardCardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  headerRight?: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function DashboardCard({
  title,
  subtitle,
  children,
  onRefresh,
  isRefreshing,
  headerRight,
  className,
  noPadding = false,
}: DashboardCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("fd-card", noPadding && "p-0", className)}
    >
      {(title || onRefresh || headerRight) && (
        <div
          className={cn(
            "flex items-center justify-between mb-4",
            noPadding && "px-5 pt-5"
          )}
        >
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-white/[0.92]">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {headerRight}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                aria-label="Refresh"
              >
                <RefreshCw
                  className={cn(
                    "w-3.5 h-3.5 text-white/40",
                    isRefreshing && "animate-spin"
                  )}
                />
              </button>
            )}
          </div>
        </div>
      )}
      <div className={cn(noPadding && "px-5 pb-5")}>{children}</div>
    </motion.div>
  );
}
