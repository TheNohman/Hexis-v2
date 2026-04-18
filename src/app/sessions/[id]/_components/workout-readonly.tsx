import Link from "next/link";
import { formatDuration } from "@/lib/format";
import type { WorkoutDetail } from "@/lib/workouts/types";
import { Card } from "@/app/_components/card";
import { Stat } from "@/app/_components/stat";
import { SaveAsTemplateButton } from "./save-as-template-button";
import { RedoWorkoutButton } from "./redo-workout-button";
import { WorkoutReadonlyActions } from "./workout-readonly-actions";

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
    .join(" · ");
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

  const hasStrength = workout.blocks
    .flatMap((b) => b.entries)
    .some((e) => e.exercise.type === "STRENGTH");

  return (
    <main id="main-content" className="flex-1 flex flex-col px-4 py-6">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted font-semibold">
              Séance terminée
            </p>
            <h1 className="font-display font-extrabold text-[28px] sm:text-[32px] tracking-tight mt-1 truncate">
              {workout.name}
            </h1>
            <p className="text-xs text-muted mt-1">{dateLabel}</p>
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-muted hover:text-foreground whitespace-nowrap px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors"
          >
            ← Retour
          </Link>
        </header>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          {durationMins != null && (
            <Stat
              value={formatDuration(durationMins * 60)}
              label="Durée"
              variant="accent"
              dense
            />
          )}
          <Stat value={totalSets} label="Séries" dense />
          {totalVolume > 0 && (
            <Stat
              value={`${Math.round(totalVolume).toLocaleString("fr-FR")} kg`}
              label="Volume"
              variant="accent"
              dense
            />
          )}
        </div>

        <div className="space-y-3">
          {workout.blocks.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">
              Cette séance est vide.
            </p>
          ) : (
            workout.blocks.map((block) => (
              <Card
                key={block.id}
                as="section"
                padding="none"
                rounded="2xl"
                className="overflow-hidden"
              >
                <header className="px-4 py-3 border-b border-border">
                  <h2 className="font-display font-bold text-[10px] uppercase tracking-widest">
                    {block.name}
                  </h2>
                </header>
                <ul className="p-2">
                  {block.entries.map((entry) => {
                    const values = formatValues(entry.values);
                    return (
                      <li
                        key={entry.id}
                        className={`flex items-start justify-between py-2.5 px-3 rounded-lg ${entry.status === "SKIPPED" ? "opacity-50" : ""}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold truncate ${entry.status === "SKIPPED" ? "line-through" : ""}`}>
                            {entry.exercise.name}
                          </p>
                          {values && (
                            <p className="text-xs text-muted mt-0.5 tabular-nums">
                              {values}
                            </p>
                          )}
                        </div>
                        {entry.status === "SKIPPED" && (
                          <span className="text-[10px] text-muted ml-2 uppercase tracking-widest font-semibold">
                            passée
                          </span>
                        )}
                        {entry.status === "DONE" && (
                          <span className="text-accent-ink ml-2" aria-label="Validée">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="2,8 5,11 12,3" />
                            </svg>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))
          )}
        </div>

        {/* Actions */}
        <RedoWorkoutButton sourceWorkoutId={workout.id} hasStrengthExercises={hasStrength} />
        <SaveAsTemplateButton workoutId={workout.id} workoutName={workout.name} />
        <WorkoutReadonlyActions workoutId={workout.id} />
      </div>
    </main>
  );
}
