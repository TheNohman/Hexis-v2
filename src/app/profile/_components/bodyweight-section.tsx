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

      {/* Mini chart */}
      {chartData.length >= 2 && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <svg viewBox={`0 0 ${chartData.length * 12} 80`} className="w-full h-20" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={chartData
                .map(
                  (e, i) =>
                    `${i * 12 + 6},${75 - ((e.weightKg - minWeight) / range) * 65}`,
                )
                .join(" ")}
            />
            {chartData.map((e, i) => (
              <circle
                key={e.id}
                cx={i * 12 + 6}
                cy={75 - ((e.weightKg - minWeight) / range) * 65}
                r="2.5"
                fill="var(--accent)"
              />
            ))}
          </svg>
          <div className="flex justify-between text-[10px] text-subtle mt-1">
            <span>
              {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
                new Date(chartData[0].date),
              )}
            </span>
            <span>
              {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
                new Date(chartData[chartData.length - 1].date),
              )}
            </span>
          </div>
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
            {isPending ? "Ajout\u2026" : "Ajouter"}
          </button>
        </form>
      )}

      {/* History list */}
      {entries.length > 0 && (
        <ul className="space-y-1.5">
          {entries.slice(0, 20).map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2.5"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium tabular-nums">
                  {entry.weightKg.toFixed(1)} kg
                </span>
                <span className="text-xs text-muted">
                  {new Intl.DateTimeFormat("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(entry.date))}
                </span>
                {entry.notes && (
                  <span className="text-xs text-subtle">{entry.notes}</span>
                )}
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => deleteBodyWeightAction(entry.id))}
                className="text-xs text-subtle hover:text-danger cursor-pointer transition-colors disabled:opacity-50"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="1" y1="1" x2="11" y2="11" />
                  <line x1="11" y1="1" x2="1" y2="11" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
