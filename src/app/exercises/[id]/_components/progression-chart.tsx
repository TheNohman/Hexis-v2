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
  const padY = 24;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const points = data.map((d, i) => ({
    x: padX + (i / (data.length - 1)) * chartW,
    y: padY + chartH - ((d.value - minVal) / range) * chartH,
    ...d,
  }));

  // Smooth bezier path (same technique as Sparkline).
  let linePath = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    linePath += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padY + chartH} L ${points[0].x} ${padY + chartH} Z`;

  // Y axis labels (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = minVal + (range * i) / 4;
    const y = padY + chartH - (i / 4) * chartH;
    return { val, y };
  });

  const primaryLabel = isCardio ? "Distance / Durée" : "Poids (kg)";

  // Trend: first vs last
  const firstVal = data[0].value;
  const lastVal = data[data.length - 1].value;
  const trendPct = firstVal > 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;
  const trendUp = trendPct > 0;
  const trendDown = trendPct < 0;

  const formatVal = (v: number) => (isCardio ? formatDuration(v) : `${Math.round(v)}`);
  const ariaSummary = `Progression de ${primaryLabel} sur ${data.length} séances : de ${formatVal(firstVal)} à ${formatVal(lastVal)}, variation ${trendUp ? "+" : ""}${trendPct.toFixed(1)}%.`;

  return (
    <div className="rounded-2xl bg-surface shadow-card p-4 space-y-3">
      {/* Trend indicator */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-muted">
          {primaryLabel}
        </span>
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums rounded-full px-2 py-0.5 ${
            trendUp
              ? "bg-done/20 text-foreground"
              : trendDown
                ? "bg-danger-soft text-danger"
                : "bg-surface-hover text-muted"
          }`}
        >
          <span aria-hidden="true">{trendUp ? "↗" : trendDown ? "↘" : "→"}</span>
          {trendUp ? "+" : ""}
          {trendPct.toFixed(1)}%
        </span>
      </div>

      {/* SVG Chart */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: 180 }}
        role="img"
        aria-label={ariaSummary}
      >
        <defs>
          <linearGradient id="prog-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--lavender-ink)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--lavender-ink)" stopOpacity="0" />
          </linearGradient>
        </defs>

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
        {points
          .filter(
            (_, i) =>
              i % Math.max(1, Math.floor(points.length / 6)) === 0 ||
              i === points.length - 1,
          )
          .map((p, i) => (
            <text
              key={i}
              x={p.x}
              y={height - 4}
              textAnchor="middle"
              fill="var(--subtle)"
              fontSize="8"
              fontFamily="var(--font-geist-mono, monospace)"
            >
              {new Intl.DateTimeFormat("fr-FR", {
                day: "numeric",
                month: "short",
              }).format(new Date(p.date))}
            </text>
          ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#prog-grad)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--lavender-ink)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dots — highlight first/last for trend storytelling */}
        {points.map((p, i) => {
          const isEnd = i === 0 || i === points.length - 1;
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={isEnd ? 4 : 2.5}
              fill={isEnd ? "var(--accent)" : "var(--lavender-ink)"}
              stroke={isEnd ? "var(--background)" : "none"}
              strokeWidth={isEnd ? 2 : 0}
            />
          );
        })}
      </svg>

      {/* Volume secondary chart if applicable */}
      {!isCardio && data.some((d) => d.volume != null && d.volume > 0) && (
        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-muted">
              Volume (kg × reps)
            </span>
          </div>
          <div
            className="flex items-end gap-1 h-16"
            role="img"
            aria-label={`Volume par séance sur ${data.length} séances`}
          >
            {data.map((d, i) => {
              const vol = d.volume ?? 0;
              const maxVol = Math.max(...data.map((dd) => dd.volume ?? 0), 1);
              const pct = (vol / maxVol) * 100;
              const isLast = i === data.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className={`w-full rounded-md transition-all ${
                      isLast ? "bg-accent" : "bg-[var(--lavender)]"
                    }`}
                    style={{
                      height: `${Math.max(pct, 3)}%`,
                      opacity: vol > 0 ? 1 : 0.3,
                    }}
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
