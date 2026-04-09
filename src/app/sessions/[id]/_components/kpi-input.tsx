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

/**
 * Inputs that adapt to the KPI data type.
 * - INTEGER/DECIMAL => numeric input stored in valueNumeric
 * - DURATION => text input parsed into seconds stored in valueNumeric
 * - TEXT => free text stored in valueText
 */
export function KpiInput({ kpi, valueNumeric, valueText, onChange, autoFocus }: Props) {
  if (kpi.dataType === "DURATION") {
    return (
      <label className="flex flex-col gap-1 min-w-0">
        <span className="text-[10px] uppercase tracking-wide text-foreground/50">
          {kpi.name}
          {kpi.isRequired ? "" : " ·"}
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
          className="rounded-lg bg-foreground/5 border border-foreground/10 px-3 py-2 text-sm focus:outline-none focus:border-foreground/40"
        />
      </label>
    );
  }

  if (kpi.dataType === "TEXT") {
    return (
      <label className="flex flex-col gap-1 min-w-0">
        <span className="text-[10px] uppercase tracking-wide text-foreground/50">
          {kpi.name}
          {kpi.isRequired ? "" : " ·"}
        </span>
        <input
          type="text"
          defaultValue={valueText ?? ""}
          autoFocus={autoFocus}
          onBlur={(e) =>
            onChange({ valueNumeric: null, valueText: e.target.value || null })
          }
          className="rounded-lg bg-foreground/5 border border-foreground/10 px-3 py-2 text-sm focus:outline-none focus:border-foreground/40"
        />
      </label>
    );
  }

  // INTEGER / DECIMAL
  const step = kpi.dataType === "INTEGER" ? "1" : "any";
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-[10px] uppercase tracking-wide text-foreground/50">
        {kpi.name}
        {kpi.unit ? ` (${kpi.unit})` : ""}
        {kpi.isRequired ? "" : " ·"}
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
        className="rounded-lg bg-foreground/5 border border-foreground/10 px-3 py-2 text-sm focus:outline-none focus:border-foreground/40"
      />
    </label>
  );
}
