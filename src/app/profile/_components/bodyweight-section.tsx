"use client";

import { useState, useTransition } from "react";
import { addBodyWeightAction, deleteBodyWeightAction } from "@/app/bodyweight/actions";

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

  // Calculate 7-day rolling average
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const latestWeight = entries.length > 0 ? entries[0].weightKg : null;
  const weights = sortedEntries.map((e) => e.weightKg);
  const avg7d =
    weights.length >= 2
      ? weights.slice(-7).reduce((s, w) => s + w, 0) / Math.min(7, weights.length)
      : null;

  // Mini chart (last 30 entries)
  const chartData = sortedEntries.slice(-30);
  const minWeight = chartData.length > 0 ? Math.min(...chartData.map((e) => e.weightKg)) : 0;
  const maxWeight = chartData.length > 0 ? Math.max(...chartData.map((e) => e.weightKg)) : 1;
  const range = maxWeight - minWeight || 1;

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

      {/* Chart with axes */}
      {chartData.length >= 2 && (() => {
        const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
        // Layout constants
        const leftPad = 44;  // space for Y-axis labels
        const rightPad = 12;
        const topPad = 12;
        const bottomPad = 28; // space for X-axis labels
        const totalW = 400;
        const totalH = 180;
        const plotW = totalW - leftPad - rightPad;
        const plotH = totalH - topPad - bottomPad;

        // Y-axis: round to nice values with padding
        const weightPad = range * 0.15;
        const yMin = Math.floor((minWeight - weightPad) * 2) / 2;
        const yMax = Math.ceil((maxWeight + weightPad) * 2) / 2;
        const yRange = yMax - yMin || 1;

        // Build ~4 horizontal grid lines
        const yTickCount = 4;
        const yStep = yRange / yTickCount;
        const yTicks: number[] = [];
        for (let i = 0; i <= yTickCount; i++) {
          yTicks.push(Math.round((yMin + i * yStep) * 10) / 10);
        }

        // X positions based on actual dates (proportional spacing)
        const t0 = new Date(chartData[0].date).getTime();
        const t1 = new Date(chartData[chartData.length - 1].date).getTime();
        const tRange = t1 - t0 || 1;

        const toX = (d: Date) => leftPad + ((new Date(d).getTime() - t0) / tRange) * plotW;
        const toY = (w: number) => topPad + plotH - ((w - yMin) / yRange) * plotH;

        // Pick ~4-5 evenly spaced date labels
        const xLabelCount = Math.min(chartData.length, 5);
        const xLabelStep = Math.max(1, Math.floor((chartData.length - 1) / (xLabelCount - 1)));
        const xLabels: number[] = [];
        for (let i = 0; i < chartData.length; i += xLabelStep) xLabels.push(i);
        if (xLabels[xLabels.length - 1] !== chartData.length - 1) xLabels.push(chartData.length - 1);

        return (
          <div className="rounded-xl border border-border bg-surface p-4">
            <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full" style={{ height: "auto", aspectRatio: `${totalW}/${totalH}` }}>
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

              {/* Line */}
              <polyline
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={chartData.map((e) => `${toX(new Date(e.date))},${toY(e.weightKg)}`).join(" ")}
              />

              {/* Data points with weight labels */}
              {chartData.map((e) => {
                const cx = toX(new Date(e.date));
                const cy = toY(e.weightKg);
                return (
                  <g key={e.id}>
                    <circle cx={cx} cy={cy} r="3.5" fill="var(--accent)" />
                    <text x={cx} y={cy - 7} textAnchor="middle" fill="var(--foreground)" fontSize="8.5" fontFamily="var(--font-mono, monospace)" fontWeight="600">
                      {e.weightKg.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* X-axis date labels */}
              {xLabels.map((i) => {
                const e = chartData[i];
                const x = toX(new Date(e.date));
                return (
                  <text key={i} x={x} y={totalH - 4} textAnchor="middle" fill="var(--muted)" fontSize="9">
                    {dateFmt.format(new Date(e.date))}
                  </text>
                );
              })}
            </svg>
          </div>
        );
      })()}

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
            {isPending ? "Ajout\u2026" : "Ajouter"}
          </button>
        </form>
      )}

      {/* History list — all entries with delta */}
      {entries.length > 0 && (
        <ul className="space-y-1.5">
          {entries.map((entry, idx) => {
            const prev = entries[idx + 1]; // previous chronologically (entries are desc)
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
                    {new Intl.DateTimeFormat("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }).format(new Date(entry.date))}
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
