"use client";

import { useState, useTransition, useMemo } from "react";
import { addMeasurementAction, deleteMeasurementAction } from "@/app/measurements/actions";
import { TimeSeriesChart } from "@/app/profile/_components/time-series-chart";
import type { MeasurementData, MeasurementTypeConfigData } from "@/lib/measurements/types";

type Props = {
  entries: MeasurementData[];
  typeConfigs: MeasurementTypeConfigData[];
};

type Period = "1m" | "3m" | "6m" | "1y" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "1m", label: "1M" },
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "1y", label: "1A" },
  { key: "all", label: "Tout" },
];

function monthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

function filterByPeriod(entries: MeasurementData[], period: Period): MeasurementData[] {
  if (period === "all") return entries;
  const since =
    period === "1m" ? monthsAgo(1) :
    period === "3m" ? monthsAgo(3) :
    period === "6m" ? monthsAgo(6) :
    monthsAgo(12);
  return entries.filter((e) => new Date(e.date) >= since);
}

const dateFmtFull = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function MeasurementsList({ entries, typeConfigs }: Props) {
  const [isPending, startTransition] = useTransition();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [addingType, setAddingType] = useState<string | null>(null);

  // Group entries by type
  const byType = useMemo(() => {
    const map = new Map<string, MeasurementData[]>();
    for (const e of entries) {
      const list = map.get(e.type) ?? [];
      list.push(e);
      map.set(e.type, list);
    }
    return map;
  }, [entries]);

  function toggleSection(slug: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>, type: string, unit: string) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const value = parseFloat(form.get("value") as string);
    const date = form.get("date") as string;
    const notes = (form.get("notes") as string) || undefined;
    if (!value || Number.isNaN(value) || !date) return;

    startTransition(async () => {
      await addMeasurementAction({ type, date, value, notes });
      setAddingType(null);
    });
  }

  return (
    <div className="space-y-3">
      {typeConfigs.map((config) => (
        <MeasurementTypeSection
          key={config.slug}
          config={config}
          entries={byType.get(config.slug) ?? []}
          isOpen={openSections.has(config.slug)}
          onToggle={() => toggleSection(config.slug)}
          isPending={isPending}
          showForm={addingType === config.slug}
          onShowForm={() => setAddingType(addingType === config.slug ? null : config.slug)}
          onAdd={(e) => handleAdd(e, config.slug, config.unit)}
          onDelete={(id) => startTransition(() => deleteMeasurementAction(id, config.slug))}
        />
      ))}

      {typeConfigs.length === 0 && (
        <p className="text-sm text-muted text-center py-6">
          Aucun type de mesure configure. Ajoutez-en un pour commencer le suivi.
        </p>
      )}
    </div>
  );
}

// ─── Sub-section per measurement type ───

function MeasurementTypeSection({
  config,
  entries,
  isOpen,
  onToggle,
  isPending,
  showForm,
  onShowForm,
  onAdd,
  onDelete,
}: {
  config: MeasurementTypeConfigData;
  entries: MeasurementData[];
  isOpen: boolean;
  onToggle: () => void;
  isPending: boolean;
  showForm: boolean;
  onShowForm: () => void;
  onAdd: (e: React.FormEvent<HTMLFormElement>) => void;
  onDelete: (id: string) => void;
}) {
  const [period, setPeriod] = useState<Period>("6m");

  const filtered = useMemo(() => filterByPeriod(entries, period), [entries, period]);
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [filtered],
  );

  const latest = filtered.length > 0 ? filtered[0] : null;
  const chartData = sorted.slice(-30);

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-background/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{config.label}</span>
          {latest && (
            <span className="text-xs text-accent tabular-nums font-medium">
              {latest.value.toFixed(1)} {config.unit}
            </span>
          )}
          {!latest && (
            <span className="text-xs text-subtle">Aucune donnee</span>
          )}
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={`text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <polyline points="4,6 8,10 12,6" />
        </svg>
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          {/* Period selector */}
          <div className="flex gap-1 rounded-lg bg-background p-1">
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

          {/* Chart */}
          {chartData.length >= 2 && (
            <TimeSeriesChart
              data={chartData}
              unit={config.unit}
              gradientId={`mFill-${config.slug}`}
              color={config.color ?? undefined}
              height={160}
            />
          )}

          {chartData.length === 1 && (
            <div className="text-center py-2">
              <p className="text-lg font-display font-bold tabular-nums">
                {chartData[0].value.toFixed(1)} {config.unit}
              </p>
              <p className="text-xs text-muted mt-1">
                {dateFmtFull.format(new Date(chartData[0].date))}
              </p>
            </div>
          )}

          {chartData.length === 0 && (
            <p className="text-xs text-muted text-center py-2">
              Aucune donnee sur cette periode.
            </p>
          )}

          {/* Add button / form */}
          <button
            type="button"
            onClick={onShowForm}
            className="text-xs text-accent hover:text-accent-hover cursor-pointer transition-colors"
          >
            {showForm ? "Annuler" : "+ Ajouter une mesure"}
          </button>

          {showForm && (
            <form onSubmit={onAdd} className="space-y-3">
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
                  <span className="text-xs text-muted">
                    Mesure ({config.unit})
                  </span>
                  <input
                    type="number"
                    name="value"
                    step="0.1"
                    min={0}
                    required
                    autoFocus
                    placeholder={`ex: 85.0`}
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

          {/* History list with delta */}
          {filtered.length > 0 && (
            <ul className="space-y-1">
              {filtered.map((entry, idx) => {
                const prev = filtered[idx + 1];
                const delta = prev ? entry.value - prev.value : null;
                return (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between rounded-lg bg-background px-3 py-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-medium tabular-nums shrink-0">
                        {entry.value.toFixed(1)} {config.unit}
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
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => onDelete(entry.id)}
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
        </div>
      )}
    </div>
  );
}
