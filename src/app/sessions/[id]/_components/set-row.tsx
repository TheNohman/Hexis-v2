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
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
        isDone
          ? "bg-green-500/5"
          : isSkipped
            ? "bg-foreground/5 opacity-50"
            : isPlanned
              ? "bg-blue-500/5"
              : ""
      }`}
    >
      {/* Set number */}
      <span className="text-xs text-foreground/40 w-6 text-center shrink-0 tabular-nums">
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
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-foreground/30 hover:text-foreground/60 hover:bg-foreground/5 cursor-pointer disabled:opacity-50 transition-colors"
            title="Passer"
          >
            <span className="text-sm">✕</span>
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleValidate}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-green-500 hover:bg-green-500/10 cursor-pointer disabled:opacity-50 transition-colors"
            title="Valider"
          >
            <span className="text-lg font-bold">✓</span>
          </button>
        </div>
      ) : isDone ? (
        <span className="min-h-[44px] min-w-[44px] flex items-center justify-center text-green-500">
          <span className="text-lg">✓</span>
        </span>
      ) : isSkipped ? (
        <span className="min-h-[44px] min-w-[44px] flex items-center justify-center text-foreground/30 line-through text-xs">
          passée
        </span>
      ) : (
        // DONE status for free-form sessions (no check needed)
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

  if (value.dataType === "DURATION") {
    return (
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-xs text-foreground/40 truncate">
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
          className="w-full rounded bg-foreground/5 border border-foreground/10 px-2 py-1.5 text-sm focus:outline-none focus:border-foreground/40 disabled:opacity-60 tabular-nums"
        />
      </div>
    );
  }

  if (value.dataType === "TEXT") {
    return (
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-xs text-foreground/40 truncate">
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
          className="w-full rounded bg-foreground/5 border border-foreground/10 px-2 py-1.5 text-sm focus:outline-none focus:border-foreground/40 disabled:opacity-60"
        />
      </div>
    );
  }

  // INTEGER / DECIMAL
  const step = value.dataType === "INTEGER" ? "1" : "any";
  const label = value.unit
    ? `${value.kpiName} (${value.unit})`
    : value.kpiName;

  return (
    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
      <span className="text-xs text-foreground/40 truncate">{label}</span>
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
        className="w-full rounded bg-foreground/5 border border-foreground/10 px-2 py-1.5 text-sm focus:outline-none focus:border-foreground/40 disabled:opacity-60 tabular-nums"
      />
    </div>
  );
}
