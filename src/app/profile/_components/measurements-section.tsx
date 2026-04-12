"use client";

import { useState, useTransition, useMemo } from "react";
import { addMeasurementAction, deleteMeasurementAction } from "@/app/measurements/actions";
import {
  MEASUREMENT_TYPES,
  MEASUREMENT_LABELS,
  type MeasurementType,
  type MeasurementData,
} from "@/lib/measurements/types";

type Props = {
  entries: MeasurementData[];
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

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const dateFmtFull = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export function MeasurementsSection({ entries }: Props) {
  const [isPending, startTransition] = useTransition();
  const [addingType, setAddingType] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

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

  const trackedTypes = Array.from(byType.keys());
  const untrackedTypes = MEASUREMENT_TYPES.filter((t) => !trackedTypes.includes(t));

  function toggleSection(type: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>, type: string) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const valueCm = parseFloat(form.get("valueCm") as string);
    const date = form.get("date") as string;
    const notes = (form.get("notes") as string) || undefined;
    if (!valueCm || Number.isNaN(valueCm) || !date) return;

    startTransition(async () => {
      await addMeasurementAction({ type, date, valueCm, notes });
      setAddingType(null);
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
          Mesures corporelles
        </h2>
      </div>

      {/* Tracked measurement types */}
      {trackedTypes.map((type) => (
        <MeasurementTypeSection
          key={type}
          type={type}
          label={MEASUREMENT_LABELS[type as MeasurementType] ?? type}
          entries={byType.get(type) ?? []}
          isOpen={openSections.has(type)}
          onToggle={() => toggleSection(type)}
          isPending={isPending}
          showForm={addingType === type}
          onShowForm={() => setAddingType(addingType === type ? null : type)}
          onAdd={(e) => handleAdd(e, type)}
          onDelete={(id) => startTransition(() => deleteMeasurementAction(id))}
        />
      ))}

      {/* Add new measurement type */}
      {addingType && !trackedTypes.includes(addingType) && (
        <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
          <p className="text-sm font-medium">
            {MEASUREMENT_LABELS[addingType as MeasurementType] ?? addingType}
          </p>
          <form onSubmit={(e) => handleAdd(e, addingType)} className="space-y-3">
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
                <span className="text-xs text-muted">Mesure (cm)</span>
                <input
                  type="number"
                  name="valueCm"
                  step="0.1"
                  min={0}
                  required
                  autoFocus
                  placeholder="ex: 85.0"
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
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 rounded-lg bg-accent text-white py-2.5 text-sm font-semibold hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Ajout\u2026" : "Ajouter"}
              </button>
              <button
                type="button"
                onClick={() => setAddingType(null)}
                className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dropdown to add a new type */}
      {untrackedTypes.length > 0 && addingType === null && (
        <div className="flex flex-wrap gap-2">
          {untrackedTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setAddingType(type);
                setOpenSections((prev) => new Set(prev).add(type));
              }}
              className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted hover:text-accent hover:border-accent transition-colors cursor-pointer"
            >
              + {MEASUREMENT_LABELS[type]}
            </button>
          ))}
        </div>
      )}

      {trackedTypes.length === 0 && addingType === null && (
        <p className="text-sm text-muted text-center py-2">
          Aucune mesure. Ajoutez votre premier suivi ci-dessous.
        </p>
      )}
    </section>
  );
}

// ─── Sub-section per measurement type ───

function MeasurementTypeSection({
  type,
  label,
  entries,
  isOpen,
  onToggle,
  isPending,
  showForm,
  onShowForm,
  onAdd,
  onDelete,
}: {
  type: string;
  label: string;
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
      {/* Header — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-background/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{label}</span>
          {latest && (
            <span className="text-xs text-accent tabular-nums font-medium">
              {latest.valueCm.toFixed(1)} cm
            </span>
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
          {chartData.length >= 2 && <MeasurementChart data={chartData} />}

          {chartData.length === 1 && (
            <div className="text-center py-2">
              <p className="text-lg font-display font-bold tabular-nums">{chartData[0].valueCm.toFixed(1)} cm</p>
              <p className="text-xs text-muted mt-1">{dateFmtFull.format(new Date(chartData[0].date))}</p>
            </div>
          )}

          {chartData.length === 0 && (
            <p className="text-xs text-muted text-center py-2">Aucune donnée sur cette période.</p>
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
                  <span className="text-xs text-muted">Mesure (cm)</span>
                  <input
                    type="number"
                    name="valueCm"
                    step="0.1"
                    min={0}
                    required
                    autoFocus
                    placeholder="ex: 85.0"
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
                const delta = prev ? entry.valueCm - prev.valueCm : null;
                return (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between rounded-lg bg-background px-3 py-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-medium tabular-nums shrink-0">
                        {entry.valueCm.toFixed(1)} cm
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

// ─── SVG chart (same logic as WeightChart but for cm) ───

function MeasurementChart({ data }: { data: MeasurementData[] }) {
  const leftPad = 44;
  const rightPad = 16;
  const topPad = 16;
  const bottomPad = 28;
  const totalW = 400;
  const totalH = 160;
  const plotW = totalW - leftPad - rightPad;
  const plotH = totalH - topPad - bottomPad;

  const minV = Math.min(...data.map((e) => e.valueCm));
  const maxV = Math.max(...data.map((e) => e.valueCm));
  const vRange = maxV - minV;
  const pad = vRange > 0 ? vRange * 0.2 : 1;
  const yMin = Math.floor((minV - pad) * 2) / 2;
  const yMax = Math.ceil((maxV + pad) * 2) / 2;
  const yRange = yMax - yMin || 1;

  const yTickCount = 4;
  const yTicks: number[] = [];
  for (let i = 0; i <= yTickCount; i++) {
    yTicks.push(Math.round((yMin + (i * yRange) / yTickCount) * 10) / 10);
  }

  const t0 = new Date(data[0].date).getTime();
  const t1 = new Date(data[data.length - 1].date).getTime();
  const tRange = t1 - t0 || 1;

  const toX = (d: Date) => leftPad + ((new Date(d).getTime() - t0) / tRange) * plotW;
  const toY = (v: number) => topPad + plotH - ((v - yMin) / yRange) * plotH;

  const maxLabels = Math.min(data.length, 5);
  const step = Math.max(1, Math.floor((data.length - 1) / (maxLabels - 1)));
  const xLabelIdxs: number[] = [];
  for (let i = 0; i < data.length; i += step) xLabelIdxs.push(i);
  if (xLabelIdxs[xLabelIdxs.length - 1] !== data.length - 1) xLabelIdxs.push(data.length - 1);

  const areaPoints = [
    `${toX(new Date(data[0].date))},${topPad + plotH}`,
    ...data.map((e) => `${toX(new Date(e.date))},${toY(e.valueCm)}`),
    `${toX(new Date(data[data.length - 1].date))},${topPad + plotH}`,
  ].join(" ");

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full" style={{ aspectRatio: `${totalW}/${totalH}` }}>
      <defs>
        <linearGradient id={`mFill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

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

      <polygon points={areaPoints} fill={`url(#mFill)`} />

      <polyline
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={data.map((e) => `${toX(new Date(e.date))},${toY(e.valueCm)}`).join(" ")}
      />

      {data.map((e, i) => {
        const cx = toX(new Date(e.date));
        const cy = toY(e.valueCm);
        const prevCy = i > 0 ? toY(data[i - 1].valueCm) : cy + 20;
        const labelY = cy <= prevCy ? cy - 8 : cy + 13;
        return (
          <g key={e.id}>
            <circle cx={cx} cy={cy} r="3" fill="var(--accent)" />
            <text x={cx} y={labelY} textAnchor="middle" fill="var(--foreground)" fontSize="8" fontFamily="var(--font-mono, monospace)" fontWeight="600">
              {e.valueCm.toFixed(1)}
            </text>
          </g>
        );
      })}

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
  );
}
