"use client";

import { secondsToTimeString, timeStringToSeconds } from "@/lib/format";
import type { ExerciseListItem } from "@/lib/workouts/types";

type Kpi = ExerciseListItem["kpis"][number];

type Props = {
  kpi: Kpi;
  valueNumeric: number | null;
  valueText: string | null;
  onChange: (next: { valueNumeric: number | null; valueText: string | null }) => void;
  autoFocus?: boolean;
};

const inputClasses =
  "rounded-lg bg-surface border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-accent tabular-nums transition-colors";

export function KpiInput({ kpi, valueNumeric, valueText, onChange, autoFocus }: Props) {
  if (kpi.dataType === "DURATION") {
    return (
      <label className="flex flex-col gap-1.5 min-w-0">
        <span className="text-[10px] uppercase text-muted">
          {kpi.name}
          {kpi.isRequired ? "" : " \u00b7"}
        </span>
        <input
          type="time"
          step={1}
          value={secondsToTimeString(valueNumeric)}
          autoFocus={autoFocus}
          onChange={(e) =>
            onChange({
              valueNumeric: timeStringToSeconds(e.target.value),
              valueText: null,
            })
          }
          className={inputClasses}
        />
      </label>
    );
  }

  if (kpi.dataType === "TEXT") {
    return (
      <label className="flex flex-col gap-1.5 min-w-0">
        <span className="text-[10px] uppercase text-muted">
          {kpi.name}
          {kpi.isRequired ? "" : " \u00b7"}
        </span>
        <input
          type="text"
          defaultValue={valueText ?? ""}
          autoFocus={autoFocus}
          onBlur={(e) =>
            onChange({ valueNumeric: null, valueText: e.target.value || null })
          }
          className={inputClasses}
        />
      </label>
    );
  }

  const step = kpi.dataType === "INTEGER" ? "1" : "any";
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[10px] uppercase text-muted">
        {kpi.name}
        {kpi.unit ? ` (${kpi.unit})` : ""}
        {kpi.isRequired ? "" : " \u00b7"}
      </span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        defaultValue={valueNumeric ?? ""}
        autoFocus={autoFocus}
        onBlur={(e) => {
          const v = e.target.value.trim();
          const parsed = v === "" ? null : parseFloat(v);
          onChange({
            valueNumeric: parsed != null && !Number.isNaN(parsed) ? parsed : null,
            valueText: null,
          });
        }}
        className={inputClasses}
      />
    </label>
  );
}
