"use client";

import { cn } from "@/lib/utils";

interface CircularGaugeProps {
  value: number;
  max: number;
  label: string;
  sublabel?: string;
  color?: string;
  size?: number;
  strokeWidth?: number;
  format?: (v: number) => string;
  className?: string;
}

export function CircularGauge({
  value,
  max,
  label,
  sublabel,
  color = "var(--fd-primary)",
  size = 120,
  strokeWidth = 8,
  format = (v) => Math.round(v).toString(),
  className,
}: CircularGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const startAngle = 135;
  const endAngle = 405;
  const arcAngle = endAngle - startAngle;
  const arcLength = (arcAngle / 360) * circumference;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const filledLength = pct * arcLength;
  const offset = arcLength - filledLength;

  // Determine danger color
  const displayColor =
    pct > 0.9
      ? "var(--fd-red)"
      : pct > 0.7
      ? "var(--fd-amber)"
      : color;

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-[0deg]"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="fd-gauge-track"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={0}
          transform={`rotate(${startAngle} ${size / 2} ${size / 2})`}
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="fd-gauge-fill"
          stroke={displayColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={offset}
          transform={`rotate(${startAngle} ${size / 2} ${size / 2})`}
          style={{
            filter: `drop-shadow(0 0 6px ${displayColor}40)`,
          }}
        />
        {/* Value text */}
        <text
          x={size / 2}
          y={size / 2 - 4}
          textAnchor="middle"
          className="fill-white/[0.92] text-xl font-bold"
          style={{ fontFamily: "inherit", fontFeatureSettings: '"tnum"' }}
        >
          {format(value)}
        </text>
        <text
          x={size / 2}
          y={size / 2 + 14}
          textAnchor="middle"
          className="fill-white/40 text-[10px]"
          style={{ fontFamily: "inherit" }}
        >
          / {format(max)}
        </text>
      </svg>
      <div className="text-center">
        <div className="text-xs font-medium text-white/60">{label}</div>
        {sublabel && (
          <div className="text-[10px] text-white/40">{sublabel}</div>
        )}
      </div>
    </div>
  );
}
