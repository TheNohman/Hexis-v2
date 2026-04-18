"use client";

import { dateFmt } from "@/lib/date-utils";

type DataPoint = {
  id: string;
  date: Date;
  value: number;
};

type Props = {
  data: DataPoint[];
  gradientId: string;
  color?: string; // CSS color override (default: var(--accent))
  height?: number;
};

export function TimeSeriesChart({
  data,
  gradientId,
  color,
  height = 180,
}: Props) {
  if (data.length < 2) return null;

  const accentColor = color ?? "var(--accent)";

  const leftPad = 44;
  const rightPad = 16;
  const topPad = 16;
  const bottomPad = 28;
  const totalW = 400;
  const totalH = height;
  const plotW = totalW - leftPad - rightPad;
  const plotH = totalH - topPad - bottomPad;

  const values = data.map((e) => e.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const vRange = maxV - minV;
  const pad = vRange > 0 ? vRange * 0.2 : 1;
  const yMin = Math.floor((minV - pad) * 2) / 2;
  const yMax = Math.ceil((maxV + pad) * 2) / 2;
  const yRange = yMax - yMin || 1;

  // Y ticks
  const yTickCount = 4;
  const yTicks: number[] = [];
  for (let i = 0; i <= yTickCount; i++) {
    yTicks.push(Math.round((yMin + (i * yRange) / yTickCount) * 10) / 10);
  }

  // X positions based on date
  const t0 = new Date(data[0].date).getTime();
  const t1 = new Date(data[data.length - 1].date).getTime();
  const tRange = t1 - t0 || 1;

  const toX = (d: Date) => leftPad + ((new Date(d).getTime() - t0) / tRange) * plotW;
  const toY = (v: number) => topPad + plotH - ((v - yMin) / yRange) * plotH;

  // X-axis labels (max 5)
  const maxLabels = Math.min(data.length, 5);
  const step = Math.max(1, Math.floor((data.length - 1) / (maxLabels - 1)));
  const xLabelIdxs: number[] = [];
  for (let i = 0; i < data.length; i += step) xLabelIdxs.push(i);
  if (xLabelIdxs[xLabelIdxs.length - 1] !== data.length - 1)
    xLabelIdxs.push(data.length - 1);

  // Gradient area
  const areaPoints = [
    `${toX(new Date(data[0].date))},${topPad + plotH}`,
    ...data.map((e) => `${toX(new Date(e.date))},${toY(e.value)}`),
    `${toX(new Date(data[data.length - 1].date))},${topPad + plotH}`,
  ].join(" ");

  // Value formatting
  const formatVal = (v: number) => {
    if (Number.isInteger(v)) return v.toString();
    return v.toFixed(1);
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <svg
        viewBox={`0 0 ${totalW} ${totalH}`}
        className="w-full"
        style={{ aspectRatio: `${totalW}/${totalH}` }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid + Y labels */}
        {yTicks.map((tick) => {
          const y = toY(tick);
          return (
            <g key={tick}>
              <line
                x1={leftPad}
                x2={totalW - rightPad}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeWidth="0.5"
              />
              <text
                x={leftPad - 6}
                y={y + 3.5}
                textAnchor="end"
                fill="var(--muted)"
                fontSize="9"
                fontFamily="var(--font-mono, monospace)"
              >
                {formatVal(tick)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <polygon points={areaPoints} fill={`url(#${gradientId})`} />

        {/* Line */}
        <polyline
          fill="none"
          stroke={accentColor}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={data
            .map((e) => `${toX(new Date(e.date))},${toY(e.value)}`)
            .join(" ")}
        />

        {/* Data points with value labels */}
        {data.map((e, i) => {
          const cx = toX(new Date(e.date));
          const cy = toY(e.value);
          const prevCy = i > 0 ? toY(data[i - 1].value) : cy + 20;
          const labelY = cy <= prevCy ? cy - 8 : cy + 13;
          return (
            <g key={e.id}>
              <circle cx={cx} cy={cy} r="3" fill={accentColor} />
              <text
                x={cx}
                y={labelY}
                textAnchor="middle"
                fill="var(--foreground)"
                fontSize="8"
                fontFamily="var(--font-mono, monospace)"
                fontWeight="600"
              >
                {formatVal(e.value)}
              </text>
            </g>
          );
        })}

        {/* X-axis date labels */}
        {xLabelIdxs.map((i) => {
          const e = data[i];
          const x = toX(new Date(e.date));
          return (
            <text
              key={`x-${i}`}
              x={x}
              y={totalH - 4}
              textAnchor="middle"
              fill="var(--muted)"
              fontSize="8.5"
            >
              {dateFmt.format(new Date(e.date))}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
