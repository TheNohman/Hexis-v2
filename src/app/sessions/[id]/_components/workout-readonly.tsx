import Link from "next/link";
import { formatDuration } from "@/lib/format";
import type { WorkoutDetail } from "@/lib/workouts/types";
import { SaveAsTemplateButton } from "./save-as-template-button";

type Props = {
  workout: WorkoutDetail;
};

function formatValues(
  values: WorkoutDetail["blocks"][number]["entries"][number]["values"],
): string {
  return values
    .map((v) => {
      if (v.dataType === "DURATION" && v.valueNumeric != null) {
        return formatDuration(v.valueNumeric);
      }
      if (v.valueNumeric != null) {
        const unit = v.unit ? ` ${v.unit}` : "";
        return `${v.valueNumeric}${unit}`;
      }
      if (v.valueText) return v.valueText;
      return null;
    })
    .filter(Boolean)
    .join(" \u00b7 ");
}

export function WorkoutReadonly({ workout }: Props) {
  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(workout.startedAt);

  const durationMins =
    workout.finishedAt
      ? Math.round((workout.finishedAt.getTime() - workout.startedAt.getTime()) / 60000)
      : null;

  // Calculate total volume
  const totalVolume = workout.blocks
    .flatMap((b) => b.entries)
    .filter((e) => e.status === "DONE")
    .reduce((sum, entry) => {
      const weight = entry.values.find((v) => v.kpiSlug === "weight_kg")?.valueNumeric;
      const reps = entry.values.find((v) => v.kpiSlug === "reps")?.valueNumeric;
      return sum + (weight && reps ? weight * reps : 0);
    }, 0);

  const totalSets = workout.blocks
    .flatMap((b) => b.entries)
    .filter((e) => e.status === "DONE").length;

  return (
    <main className="flex-1 flex flex-col px-4 py-6">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold">{workout.name}</h1>
            <p className="text-xs text-subtle mt-1.5 font-medium">{dateLabel}</p>
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-subtle hover:text-foreground whitespace-nowrap px-3 py-2 rounded-lg hover:bg-surface transition-colors"
          >
            &larr; Retour
          </Link>
        </header>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          {durationMins != null && (
            <div className="rounded-xl border border-border bg-surface p-3 text-center">
              <p className="text-lg font-display font-bold text-accent tabular-nums">
                {formatDuration(durationMins * 60)}
              </p>
              <p className="text-[10px] text-muted mt-0.5">Dur&eacute;e</p>
            </div>
          )}
          <div className="rounded-xl border border-border bg-surface p-3 text-center">
            <p className="text-lg font-display font-bold tabular-nums">{totalSets}</p>
            <p className="text-[10px] text-muted mt-0.5">S&eacute;ries</p>
          </div>
          {totalVolume > 0 && (
            <div className="rounded-xl border border-border bg-surface p-3 text-center">
              <p className="text-lg font-display font-bold text-accent tabular-nums">
                {Math.round(totalVolume).toLocaleString("fr-FR")} kg
              </p>
              <p className="text-[10px] text-muted mt-0.5">Volume</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {workout.blocks.length === 0 ? (
            <p className="text-sm text-subtle text-center py-8">
              Cette s&eacute;ance est vide.
            </p>
          ) : (
            workout.blocks.map((block) => (
              <section
                key={block.id}
                className="rounded-2xl border border-border bg-surface overflow-hidden"
              >
                <header className="px-4 py-3 border-b border-border">
                  <h2 className="text-xs font-bold uppercase tracking-widest">{block.name}</h2>
                </header>
                <ul className="p-2">
                  {block.entries.map((entry) => {
                    const values = formatValues(entry.values);
                    return (
                      <li
                        key={entry.id}
                        className={`flex items-start justify-between py-2.5 px-3 rounded-lg ${entry.status === "SKIPPED" ? "opacity-40" : ""}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold truncate ${entry.status === "SKIPPED" ? "line-through" : ""}`}>
                            {entry.exercise.name}
                          </p>
                          {values && (
                            <p className="text-xs text-muted mt-0.5">
                              {values}
                            </p>
                          )}
                        </div>
                        {entry.status === "SKIPPED" && (
                          <span className="text-[10px] text-subtle ml-2 uppercase tracking-wide font-medium">pass&eacute;e</span>
                        )}
                        {entry.status === "DONE" && (
                          <span className="text-done ml-2">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="2,8 5,11 12,3" />
                            </svg>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>

        {/* Save as template */}
        <SaveAsTemplateButton workoutId={workout.id} workoutName={workout.name} />
      </div>
    </main>
  );
}
