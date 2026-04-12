"use client";

import { formatDuration } from "@/lib/format";
import type { ExerciseType } from "@/generated/prisma/enums";

type ProgressionPoint = {
  date: Date;
  value: number;
  volume: number | null;
  reps: number | null;
  workoutId: string;
};

type Props = {
  data: ProgressionPoint[];
  exerciseType: ExerciseType;
};

export function ExerciseProgressionChart({ data, exerciseType }: Props) {
  if (data.length < 2) return null;

  const isCardio = exerciseType === "CARDIO";
  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const width = 600;
  const height = 200;
  const padX = 40;
  const padY = 30;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const points = data.map((d, i) => ({
    x: padX + (i / (data.length - 1)) * chartW,
    y: padY + chartH - ((d.value - minVal) / range) * chartH,
    ...d,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Area fill
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padY + chartH} L ${points[0].x} ${padY + chartH} Z`;

  // Y axis labels (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = minVal + (range * i) / 4;
    const y = padY + chartH - (i / 4) * chartH;
    return { val, y };
  });

  const primaryLabel = isCardio ? "Distance / Dur\u00e9e" : "Poids (kg)";

  // Trend: first vs last
  const firstVal = data[0].value;
  const lastVal = data[data.length - 1].value;
  const trendPct = firstVal > 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;
  const trendUp = trendPct > 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      {/* Trend indicator */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{primaryLabel}</span>
        <span className={`text-xs font-medium tabular-nums ${trendUp ? "text-done" : trendPct < 0 ? "text-danger" : "text-muted"}`}>
          {trendUp ? "+" : ""}{trendPct.toFixed(1)}%
        </span>
      </div>

      {/* SVG Chart */}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: 180 }}>
        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={padX}
              y1={tick.y}
              x2={width - padX}
              y2={tick.y}
              stroke="var(--border)"
              strokeWidth="0.5"
              strokeDasharray="4,4"
            />
            <text
              x={padX - 6}
              y={tick.y + 3}
              textAnchor="end"
              fill="var(--muted)"
              fontSize="9"
              fontFamily="var(--font-geist-mono, monospace)"
            >
              {isCardio ? formatDuration(tick.val) : Math.round(tick.val)}
            </text>
          </g>
        ))}

        {/* X axis labels */}
        {points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 6)) === 0 || i === points.length - 1).map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={height - 4}
            textAnchor="middle"
            fill="var(--subtle)"
            fontSize="8"
            fontFamily="var(--font-geist-mono, monospace)"
          >
            {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
              new Date(p.date),
            )}
          </text>
        ))}

        {/* Area fill */}
        <path d={areaD} fill="var(--accent)" opacity="0.08" />

        {/* Line */}
        <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--accent)" />
        ))}
      </svg>

      {/* Volume secondary chart if applicable */}
      {!isCardio && data.some((d) => d.volume != null && d.volume > 0) && (
        <div className="pt-2 border-t border-border/50">
          <span className="text-xs text-muted">Volume (kg \u00d7 reps)</span>
          <div className="flex items-end gap-1 h-16 mt-2">
            {data.map((d, i) => {
              const vol = d.volume ?? 0;
              const maxVol = Math.max(...data.map((dd) => dd.volume ?? 0), 1);
              const pct = (vol / maxVol) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className="w-full rounded-sm bg-accent/60 transition-all"
                    style={{ height: `${Math.max(pct, 3)}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
