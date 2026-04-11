"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { formatDuration } from "@/lib/format";
import { secondsToTimeString, timeStringToSeconds } from "@/lib/format";
import type { WorkoutDetail } from "@/lib/workouts/types";
import {
  finishWorkoutAction,
  skipEntryAction,
  validateEntryAction,
} from "@/app/sessions/actions";
import { RestTimer } from "./rest-timer";

type Entry = WorkoutDetail["blocks"][number]["entries"][number];

type Props = {
  workout: WorkoutDetail;
};

export function SessionExecutor({ workout }: Props) {
  const [isPending, startTransition] = useTransition();
  const [restEntry, setRestEntry] = useState<Entry | null>(null);

  // Flatten all entries across blocks to find the current one
  const allEntries = workout.blocks.flatMap((b) =>
    b.entries.map((e) => ({ ...e, blockName: b.name })),
  );
  const currentEntry = allEntries.find((e) => e.status === "PLANNED");
  const completedCount = allEntries.filter(
    (e) => e.status === "DONE" || e.status === "SKIPPED",
  ).length;
  const totalCount = allEntries.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  function handleFinish() {
    const remaining = allEntries.filter((e) => e.status === "PLANNED").length;
    if (remaining > 0) {
      if (
        !confirm(`Il reste ${remaining} entrée(s) non validée(s). Terminer ?`)
      )
        return;
    }
    startTransition(() => finishWorkoutAction(workout.id));
  }

  // Show rest timer after validating an entry
  const handleRestComplete = useCallback(() => {
    setRestEntry(null);
  }, []);

  if (restEntry) {
    return (
      <main className="flex-1 flex flex-col px-4 py-6">
        <div className="max-w-2xl w-full mx-auto space-y-5">
          <Header workout={workout} progress={progress} completedCount={completedCount} totalCount={totalCount} />
          <RestTimer
            durationSecs={restEntry.restDurationSecs!}
            onComplete={handleRestComplete}
          />
        </div>
      </main>
    );
  }

  if (!currentEntry) {
    // All entries done
    return (
      <main className="flex-1 flex flex-col px-4 py-6">
        <div className="max-w-2xl w-full mx-auto space-y-5">
          <Header workout={workout} progress={1} completedCount={completedCount} totalCount={totalCount} />
          <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-6 text-center space-y-2">
            <p className="text-lg font-semibold">Séance terminée !</p>
            <p className="text-sm text-foreground/60">
              {completedCount} entrée(s) complétée(s)
            </p>
          </div>
          <button
            type="button"
            onClick={handleFinish}
            disabled={isPending}
            className="w-full rounded-xl bg-green-600 text-white py-3 font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            Terminer la séance
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col px-4 py-6">
      <div className="max-w-2xl w-full mx-auto space-y-5">
        <Header workout={workout} progress={progress} completedCount={completedCount} totalCount={totalCount} />

        <ExecutionCard
          entry={currentEntry}
          blockName={currentEntry.blockName}
          workoutId={workout.id}
          isPending={isPending}
          startTransition={startTransition}
          onValidated={(entry) => {
            if (entry.restDurationSecs && entry.restDurationSecs > 0) {
              setRestEntry(entry);
            }
          }}
        />

        {/* Summary of completed entries */}
        <CompletedSummary entries={allEntries} />

        <button
          type="button"
          onClick={handleFinish}
          disabled={isPending}
          className="w-full rounded-xl border border-foreground/20 text-foreground/60 py-2 text-sm font-medium hover:bg-foreground/5 transition-colors cursor-pointer disabled:opacity-50"
        >
          Terminer la séance maintenant
        </button>
      </div>
    </main>
  );
}

function Header({
  workout,
  progress,
  completedCount,
  totalCount,
}: {
  workout: WorkoutDetail;
  progress: number;
  completedCount: number;
  totalCount: number;
}) {
  return (
    <>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{workout.name}</h1>
          <p className="text-xs text-foreground/60 mt-1">
            {completedCount} / {totalCount} entrées
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-xs text-foreground/60 hover:text-foreground whitespace-nowrap"
        >
          ← Dashboard
        </Link>
      </header>
      <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </>
  );
}

function ExecutionCard({
  entry,
  blockName,
  workoutId,
  isPending,
  startTransition,
  onValidated,
}: {
  entry: Entry & { blockName: string };
  blockName: string;
  workoutId: string;
  isPending: boolean;
  startTransition: (fn: () => void) => void;
  onValidated: (entry: Entry) => void;
}) {
  // Local state for editable values
  const valuesRef = useRef<
    Record<
      string,
      { valueNumeric: number | null; valueText: string | null }
    >
  >(
    Object.fromEntries(
      entry.values.map((v) => [
        v.kpiDefinitionId,
        { valueNumeric: v.valueNumeric, valueText: v.valueText },
      ]),
    ),
  );

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
      onValidated(entry);
    });
  }

  function handleSkip() {
    startTransition(async () => {
      await skipEntryAction(workoutId, entry.id);
    });
  }

  return (
    <div className="rounded-xl border border-foreground/10 overflow-hidden">
      <div className="p-3 border-b border-foreground/10 bg-foreground/[0.02]">
        <p className="text-xs text-foreground/50 uppercase tracking-wide">
          {blockName}
        </p>
        <p className="text-lg font-semibold mt-1">{entry.exercise.name}</p>
      </div>

      <div className="p-4 space-y-4">
        {entry.values.map((v, i) => (
          <KpiField
            key={v.kpiDefinitionId}
            value={v}
            autoFocus={i === 0}
            onChange={(next) => {
              valuesRef.current = {
                ...valuesRef.current,
                [v.kpiDefinitionId]: next,
              };
            }}
          />
        ))}
      </div>

      <div className="flex border-t border-foreground/10">
        <button
          type="button"
          onClick={handleSkip}
          disabled={isPending}
          className="flex-1 py-3 text-sm text-foreground/50 hover:bg-foreground/5 cursor-pointer disabled:opacity-50 transition-colors"
        >
          Passer
        </button>
        <button
          type="button"
          onClick={handleValidate}
          disabled={isPending}
          className="flex-1 py-3 text-sm font-semibold bg-green-600 text-white hover:opacity-90 cursor-pointer disabled:opacity-50 transition-opacity"
        >
          Valider
        </button>
      </div>
    </div>
  );
}

function KpiField({
  value,
  autoFocus,
  onChange,
}: {
  value: Entry["values"][number];
  autoFocus: boolean;
  onChange: (next: {
    valueNumeric: number | null;
    valueText: string | null;
  }) => void;
}) {
  const [numericVal, setNumericVal] = useState(value.valueNumeric);
  const [textVal, setTextVal] = useState(value.valueText ?? "");

  const planned =
    value.plannedNumeric != null
      ? value.dataType === "DURATION"
        ? formatDuration(value.plannedNumeric)
        : `${value.plannedNumeric}${value.unit ? ` ${value.unit}` : ""}`
      : value.plannedText;

  if (value.dataType === "DURATION") {
    return (
      <label className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-foreground/50 uppercase tracking-wide">
            {value.kpiName}
          </span>
          {planned && (
            <span className="text-xs text-foreground/30">
              Prévu : {planned}
            </span>
          )}
        </div>
        <input
          type="time"
          step={1}
          value={secondsToTimeString(numericVal)}
          autoFocus={autoFocus}
          onChange={(e) => {
            const secs = timeStringToSeconds(e.target.value);
            setNumericVal(secs);
            onChange({ valueNumeric: secs, valueText: null });
          }}
          className="rounded-lg bg-foreground/5 border border-foreground/10 px-3 py-2.5 text-lg focus:outline-none focus:border-foreground/40"
        />
      </label>
    );
  }

  if (
    value.dataType === "INTEGER" ||
    value.dataType === "DECIMAL"
  ) {
    return (
      <label className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-foreground/50 uppercase tracking-wide">
            {value.kpiName}
            {value.unit ? ` (${value.unit})` : ""}
          </span>
          {planned && (
            <span className="text-xs text-foreground/30">
              Prévu : {planned}
            </span>
          )}
        </div>
        <input
          type="number"
          step={value.dataType === "DECIMAL" ? "0.1" : "1"}
          value={numericVal ?? ""}
          autoFocus={autoFocus}
          onChange={(e) => {
            const num = e.target.value === "" ? null : parseFloat(e.target.value);
            setNumericVal(num);
            onChange({ valueNumeric: num, valueText: null });
          }}
          className="rounded-lg bg-foreground/5 border border-foreground/10 px-3 py-2.5 text-lg focus:outline-none focus:border-foreground/40"
        />
      </label>
    );
  }

  // TEXT type
  return (
    <label className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground/50 uppercase tracking-wide">
          {value.kpiName}
        </span>
        {planned && (
          <span className="text-xs text-foreground/30">Prévu : {planned}</span>
        )}
      </div>
      <input
        type="text"
        value={textVal}
        autoFocus={autoFocus}
        onChange={(e) => {
          setTextVal(e.target.value);
          onChange({
            valueNumeric: null,
            valueText: e.target.value || null,
          });
        }}
        className="rounded-lg bg-foreground/5 border border-foreground/10 px-3 py-2.5 text-lg focus:outline-none focus:border-foreground/40"
      />
    </label>
  );
}

function CompletedSummary({
  entries,
}: {
  entries: (Entry & { blockName: string })[];
}) {
  const completed = entries.filter(
    (e) => e.status === "DONE" || e.status === "SKIPPED",
  );
  if (completed.length === 0) return null;

  return (
    <section className="space-y-1">
      <h3 className="text-xs text-foreground/40 uppercase tracking-wide font-medium">
        Complétées
      </h3>
      <ul className="space-y-1">
        {completed.map((e) => (
          <li
            key={e.id}
            className={`text-sm px-3 py-1.5 rounded-lg ${
              e.status === "SKIPPED"
                ? "text-foreground/30 line-through"
                : "text-foreground/60"
            }`}
          >
            {e.exercise.name}
            {e.values
              .filter((v) => v.valueNumeric != null || v.valueText)
              .map((v) => {
                if (v.dataType === "DURATION" && v.valueNumeric != null)
                  return formatDuration(v.valueNumeric);
                if (v.valueNumeric != null) {
                  const unit = v.unit ? ` ${v.unit}` : "";
                  return `${v.valueNumeric}${unit}`;
                }
                return v.valueText;
              })
              .filter(Boolean)
              .join(" · ")
              ? ` — ${e.values
                  .filter((v) => v.valueNumeric != null || v.valueText)
                  .map((v) => {
                    if (v.dataType === "DURATION" && v.valueNumeric != null)
                      return formatDuration(v.valueNumeric);
                    if (v.valueNumeric != null) {
                      const unit = v.unit ? ` ${v.unit}` : "";
                      return `${v.valueNumeric}${unit}`;
                    }
                    return v.valueText;
                  })
                  .filter(Boolean)
                  .join(" · ")}`
              : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}
