"use client";

import { useMemo } from "react";
import type { InventoryMetrics } from "@/lib/types";

interface SeatGridProps {
  inventory: InventoryMetrics;
}

interface SeatInfo {
  index: number;
  status: "available" | "held" | "booked";
}

export function SeatGrid({ inventory }: SeatGridProps) {
  const seats: SeatInfo[] = useMemo(() => {
    const arr: SeatInfo[] = [];
    for (let i = 0; i < inventory.total; i++) {
      let status: SeatInfo["status"];
      if (i < inventory.booked) {
        status = "booked";
      } else if (i < inventory.booked + inventory.held) {
        status = "held";
      } else {
        status = "available";
      }
      arr.push({ index: i, status });
    }
    return arr;
  }, [inventory]);

  return (
    <div className="flex flex-wrap gap-[3px]">
      {seats.map((seat) => (
        <div
          key={seat.index}
          className={`fd-seat fd-seat-${seat.status}`}
          title={`Seat ${seat.index + 1}: ${seat.status}`}
        />
      ))}
    </div>
  );
}
