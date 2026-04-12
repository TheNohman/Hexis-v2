"use client";

import { useRef, useTransition } from "react";
import { formatDuration, secondsToTimeString, timeStringToSeconds } from "@/lib/format";
import type { WorkoutDetail } from "@/lib/workouts/types";
import {
  skipEntryAction,
  updateEntryValuesAction,
  validateEntryAction,
} from "@/app/sessions/actions";

type Entry = WorkoutDetail["blocks"][number]["entries"][number];

type Props = {
  workoutId: string;
  entry: Entry;
  setNumber: number;
  onValidated?: (entry: Entry) => void;
};

export function SetRow({ workoutId, entry, setNumber, onValidated }: Props) {
  const [isPending, startTransition] = useTransition();
  const valuesRef = useRef<
    Record<string, { valueNumeric: number | null; valueText: string | null }>
  >(
    Object.fromEntries(
      entry.values.map((v) => [
        v.kpiDefinitionId,
        { valueNumeric: v.valueNumeric, valueText: v.valueText },
      ]),
    ),
  );

  function updateValue(
    kpiDefinitionId: string,
    next: { valueNumeric: number | null; valueText: string | null },
  ) {
    valuesRef.current = { ...valuesRef.current, [kpiDefinitionId]: next };
  }

  function handleSaveValues() {
    const kpiValues = Object.entries(valuesRef.current).map(
      ([kpiDefinitionId, val]) => ({
        kpiDefinitionId,
        valueNumeric: val.valueNumeric,
        valueText: val.valueText,
      }),
    );
    startTransition(() =>
      updateEntryValuesAction(workoutId, entry.id, kpiValues),
    );
  }

  function handleValidate() {
    const kpiValues = Object.entries(valuesRef.current).map(
      ([kpiDefinitionId, val]) => ({
        kpiDefinitionId,
        valueNumeric: val.valueNumeric,
        valueText: val.valueText,
      }),
    );
    startTransition(async () => {
      await validateEntryAction(workoutId, entry.id, kpiValues);
      onValidated?.(entry);
    });
  }

  function handleSkip() {
    startTransition(() => skipEntryAction(workoutId, entry.id));
  }

  const isDone = entry.status === "DONE";
  const isSkipped = entry.status === "SKIPPED";
  const isPlanned = entry.status === "PLANNED";

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 transition-colors ${
        isDone
          ? "bg-done/[0.06]"
          : isSkipped
            ? "bg-surface opacity-50"
            : isPlanned
              ? "bg-planned/[0.06]"
              : ""
      }`}
    >
      {/* Set number */}
      <span className="text-xs text-subtle w-6 text-center shrink-0 tabular-nums font-bold">
        {setNumber}
      </span>

      {/* KPI fields */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {entry.values.map((v) => (
          <KpiField
            key={v.kpiDefinitionId}
            value={v}
            disabled={isDone || isSkipped}
            onChange={(next) => {
              updateValue(v.kpiDefinitionId, next);
            }}
            onBlurSave={handleSaveValues}
          />
        ))}
      </div>

      {/* Action buttons */}
      {isPlanned ? (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={isPending}
            onClick={handleSkip}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-subtle hover:text-foreground hover:bg-surface-hover cursor-pointer disabled:opacity-50 transition-colors"
            aria-label="Passer cette s\u00e9rie"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="2" x2="12" y2="12" />
              <line x1="12" y1="2" x2="2" y2="12" />
            </svg>
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleValidate}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-accent hover:bg-accent/10 cursor-pointer disabled:opacity-50 transition-colors"
            aria-label="Valider cette s\u00e9rie"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3,10 7,14 15,4" />
            </svg>
          </button>
        </div>
      ) : isDone ? (
        <span className="min-h-[44px] min-w-[44px] flex items-center justify-center text-done">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3,10 7,14 15,4" />
          </svg>
        </span>
      ) : isSkipped ? (
        <span className="min-h-[44px] min-w-[44px] flex items-center justify-center text-subtle text-[10px] uppercase tracking-wide font-medium">
          pass&eacute;e
        </span>
      ) : (
        <div className="w-[44px] shrink-0" />
      )}
    </div>
  );
}

function KpiField({
  value,
  disabled,
  onChange,
  onBlurSave,
}: {
  value: Entry["values"][number];
  disabled: boolean;
  onChange: (next: {
    valueNumeric: number | null;
    valueText: string | null;
  }) => void;
  onBlurSave: () => void;
}) {
  const planned =
    value.plannedNumeric != null
      ? value.dataType === "DURATION"
        ? formatDuration(value.plannedNumeric)
        : `${value.plannedNumeric}${value.unit ? value.unit : ""}`
      : value.plannedText;

  const inputClasses =
    "w-full rounded-lg bg-surface-hover border border-transparent px-2.5 py-2 text-sm focus:outline-none focus:border-accent/40 disabled:opacity-50 tabular-nums transition-colors";

  if (value.dataType === "DURATION") {
    return (
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="text-[10px] text-subtle truncate uppercase tracking-wide font-medium">
          {value.kpiName}
        </span>
        <input
          type="time"
          step={1}
          defaultValue={secondsToTimeString(value.valueNumeric)}
          disabled={disabled}
          placeholder={planned ?? undefined}
          onChange={(e) => {
            const secs = timeStringToSeconds(e.target.value);
            onChange({ valueNumeric: secs, valueText: null });
          }}
          onBlur={onBlurSave}
          className={inputClasses}
        />
      </div>
    );
  }

  if (value.dataType === "TEXT") {
    return (
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="text-[10px] text-subtle truncate uppercase tracking-wide font-medium">
          {value.kpiName}
        </span>
        <input
          type="text"
          defaultValue={value.valueText ?? ""}
          disabled={disabled}
          placeholder={planned ?? undefined}
          onBlur={(e) => {
            onChange({
              valueNumeric: null,
              valueText: e.target.value || null,
            });
            onBlurSave();
          }}
          className={inputClasses.replace("tabular-nums", "")}
        />
      </div>
    );
  }

  const step = value.dataType === "INTEGER" ? "1" : "any";
  const label = value.unit
    ? `${value.kpiName} (${value.unit})`
    : value.kpiName;

  return (
    <div className="flex flex-col gap-1 min-w-0 flex-1">
      <span className="text-[10px] text-subtle truncate uppercase tracking-wide font-medium">
        {label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        defaultValue={value.valueNumeric ?? ""}
        disabled={disabled}
        placeholder={planned ?? undefined}
        onBlur={(e) => {
          const v = e.target.value.trim();
          const parsed = v === "" ? null : parseFloat(v);
          onChange({
            valueNumeric:
              parsed != null && !Number.isNaN(parsed) ? parsed : null,
            valueText: null,
          });
          onBlurSave();
        }}
        className={inputClasses}
      />
    </div>
  );
}
