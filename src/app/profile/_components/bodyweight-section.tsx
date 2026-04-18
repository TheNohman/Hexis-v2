"use client";

import { useState, useTransition, useMemo } from "react";
import { addBodyWeightAction, deleteBodyWeightAction } from "@/app/bodyweight/actions";
import { type Period, PERIODS, filterByPeriod, dateFmt, dateFmtFull } from "@/lib/date-utils";

type Entry = {
  id: string;
  date: Date;
  weightKg: number;
  notes: string | null;
};

type Props = {
  entries: Entry[];
};

export function BodyWeightSection({ entries }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [period, setPeriod] = useState<Period>("6m");

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const weightKg = parseFloat(form.get("weightKg") as string);
    const date = form.get("date") as string;
    const notes = (form.get("notes") as string) || undefined;

    if (!weightKg || Number.isNaN(weightKg) || !date) return;

    startTransition(async () => {
      await addBodyWeightAction({ date, weightKg, notes });
      setShowForm(false);
    });
  }

  // Filter entries by period
  const filtered = useMemo(() => filterByPeriod(entries, period), [entries, period]);

  // Sort chronologically for chart
  const sortedEntries = useMemo(
    () => [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [filtered],
  );

  const latestWeight = filtered.length > 0 ? filtered[0].weightKg : null;
  const weights = sortedEntries.map((e) => e.weightKg);
  const avg7d =
    weights.length >= 2
      ? weights.slice(-7).reduce((s, w) => s + w, 0) / Math.min(7, weights.length)
      : null;

  // Chart data
  const chartData = sortedEntries.slice(-30);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
          Poids corporel
        </h2>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-accent hover:text-accent-hover cursor-pointer transition-colors"
        >
          {showForm ? "Annuler" : "+ Ajouter"}
        </button>
      </div>

      {/* Summary cards */}
      {latestWeight != null && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-surface p-4 text-center">
            <p className="text-2xl font-display font-bold text-accent tabular-nums">
              {latestWeight.toFixed(1)}
            </p>
            <p className="text-xs text-muted mt-1">Dernier poids (kg)</p>
          </div>
          {avg7d != null && (
            <div className="rounded-xl border border-border bg-surface p-4 text-center">
              <p className="text-2xl font-display font-bold tabular-nums">
                {avg7d.toFixed(1)}
              </p>
              <p className="text-xs text-muted mt-1">Moy. 7j (kg)</p>
            </div>
          )}
        </div>
      )}

      {/* Period selector */}
      <div className="flex gap-1 rounded-lg bg-surface border border-border p-1">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors cursor-pointer ${
              period === p.key
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Chart with axes */}
      {chartData.length >= 2 && <WeightChart data={chartData} />}

      {chartData.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted">Aucune donnée sur cette période.</p>
        </div>
      )}

      {chartData.length === 1 && (
        <div className="rounded-xl border border-border bg-surface p-4 text-center">
          <p className="text-lg font-display font-bold tabular-nums">{chartData[0].weightKg.toFixed(1)} kg</p>
          <p className="text-xs text-muted mt-1">{dateFmtFull.format(new Date(chartData[0].date))}</p>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="rounded-xl border border-border bg-surface p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">Date</span>
              <input
                type="date"
                name="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">Poids (kg)</span>
              <input
                type="number"
                name="weightKg"
                step="0.1"
                min={0}
                required
                autoFocus
                placeholder="ex: 75.2"
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors tabular-nums"
              />
            </label>
          </div>
          <input
            type="text"
            name="notes"
            placeholder="Notes (optionnel)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
          />
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-accent text-white py-2.5 text-sm font-semibold hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50"
          >
            {isPending ? "Ajout…" : "Ajouter"}
          </button>
        </form>
      )}

      {/* History list — all entries with delta */}
      {filtered.length > 0 && (
        <ul className="space-y-1.5">
          {filtered.map((entry, idx) => {
            const prev = filtered[idx + 1]; // previous chronologically (entries are desc)
            const delta = prev ? entry.weightKg - prev.weightKg : null;
            return (
              <li
                key={entry.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-medium tabular-nums shrink-0">
                    {entry.weightKg.toFixed(1)} kg
                  </span>
                  {delta != null && (
                    <span
                      className={`text-xs font-medium tabular-nums shrink-0 ${
                        delta > 0 ? "text-danger" : delta < 0 ? "text-done" : "text-muted"
                      }`}
                    >
                      {delta > 0 ? "+" : ""}
                      {delta.toFixed(1)}
                    </span>
                  )}
                  <span className="text-xs text-muted shrink-0">
                    {dateFmtFull.format(new Date(entry.date))}
                  </span>
                  {entry.notes && (
                    <span className="text-xs text-subtle truncate">{entry.notes}</span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(() => deleteBodyWeightAction(entry.id))}
                  className="text-xs text-subtle hover:text-danger cursor-pointer transition-colors disabled:opacity-50 shrink-0 ml-2"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="1" y1="1" x2="11" y2="11" />
                    <line x1="11" y1="1" x2="1" y2="11" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** SVG chart with Y-axis (weight) and X-axis (dates) */
function WeightChart({ data }: { data: Entry[] }) {
  const leftPad = 44;
  const rightPad = 16;
  const topPad = 16;
  const bottomPad = 28;
  const totalW = 400;
  const totalH = 180;
  const plotW = totalW - leftPad - rightPad;
  const plotH = totalH - topPad - bottomPad;

  const minW = Math.min(...data.map((e) => e.weightKg));
  const maxW = Math.max(...data.map((e) => e.weightKg));
  const wRange = maxW - minW;
  const pad = wRange > 0 ? wRange * 0.2 : 1;
  const yMin = Math.floor((minW - pad) * 2) / 2;
  const yMax = Math.ceil((maxW + pad) * 2) / 2;
  const yRange = yMax - yMin || 1;

  // Y ticks (4 lines)
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
  const toY = (w: number) => topPad + plotH - ((w - yMin) / yRange) * plotH;

  // Pick evenly spaced date labels (max 5, avoid overlap)
  const maxLabels = Math.min(data.length, 5);
  const step = Math.max(1, Math.floor((data.length - 1) / (maxLabels - 1)));
  const xLabelIdxs: number[] = [];
  for (let i = 0; i < data.length; i += step) xLabelIdxs.push(i);
  if (xLabelIdxs[xLabelIdxs.length - 1] !== data.length - 1) xLabelIdxs.push(data.length - 1);

  // Gradient fill
  const areaPoints = [
    `${toX(new Date(data[0].date))},${topPad + plotH}`,
    ...data.map((e) => `${toX(new Date(e.date))},${toY(e.weightKg)}`),
    `${toX(new Date(data[data.length - 1].date))},${topPad + plotH}`,
  ].join(" ");

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full" style={{ aspectRatio: `${totalW}/${totalH}` }}>
        <defs>
          <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid + Y labels */}
        {yTicks.map((tick) => {
          const y = toY(tick);
          return (
            <g key={tick}>
              <line x1={leftPad} x2={totalW - rightPad} y1={y} y2={y} stroke="var(--border)" strokeWidth="0.5" />
              <text x={leftPad - 6} y={y + 3.5} textAnchor="end" fill="var(--muted)" fontSize="9" fontFamily="var(--font-mono, monospace)">
                {tick.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <polygon points={areaPoints} fill="url(#weightFill)" />

        {/* Line */}
        <polyline
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={data.map((e) => `${toX(new Date(e.date))},${toY(e.weightKg)}`).join(" ")}
        />

        {/* Data points with weight labels */}
        {data.map((e, i) => {
          const cx = toX(new Date(e.date));
          const cy = toY(e.weightKg);
          // Alternate label position to avoid overlap with neighbors
          const prevCy = i > 0 ? toY(data[i - 1].weightKg) : cy + 20;
          const labelAbove = cy <= prevCy;
          const labelY = labelAbove ? cy - 8 : cy + 13;
          return (
            <g key={e.id}>
              <circle cx={cx} cy={cy} r="3" fill="var(--accent)" />
              <text x={cx} y={labelY} textAnchor="middle" fill="var(--foreground)" fontSize="8" fontFamily="var(--font-mono, monospace)" fontWeight="600">
                {e.weightKg.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* X-axis date labels */}
        {xLabelIdxs.map((i) => {
          const e = data[i];
          const x = toX(new Date(e.date));
          return (
            <text key={`x-${i}`} x={x} y={totalH - 4} textAnchor="middle" fill="var(--muted)" fontSize="8.5">
              {dateFmt.format(new Date(e.date))}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
