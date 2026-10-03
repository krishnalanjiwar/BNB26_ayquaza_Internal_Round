"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TimeSeriesPoint } from "@/lib/types";

interface TrafficChartProps {
  data: TimeSeriesPoint[];
  height?: number;
}

export function TrafficChart({ data, height = 280 }: TrafficChartProps) {
  const chartData = useMemo(
    () =>
      data.map((p) => ({
        time: new Date(p.timestamp).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
        genuine: p.genuine,
        automated: p.automated,
        total: p.total,
      })),
    [data]
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={chartData}
        margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="genuineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6D5BD0" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#6D5BD0" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="automatedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E5564B" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#E5564B" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.04)"
          vertical={false}
        />
        <XAxis
          dataKey="time"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
        />
        <Tooltip
          contentStyle={{
            background: "#1C1C1F",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "12px",
            fontSize: "12px",
            color: "rgba(255,255,255,0.92)",
          }}
          itemStyle={{ color: "rgba(255,255,255,0.7)" }}
          labelStyle={{ color: "rgba(255,255,255,0.5)" }}
        />
        <Area
          type="monotone"
          dataKey="genuine"
          stroke="#6D5BD0"
          strokeWidth={2}
          fill="url(#genuineGrad)"
          name="Genuine"
        />
        <Area
          type="monotone"
          dataKey="automated"
          stroke="#E5564B"
          strokeWidth={1.5}
          fill="url(#automatedGrad)"
          name="Automated"
          strokeDasharray="4 4"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
