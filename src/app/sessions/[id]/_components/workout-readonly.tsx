import Link from "next/link";
import { formatDuration } from "@/lib/format";
import type { WorkoutDetail } from "@/lib/workouts/types";

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

  return (
    <main className="flex-1 flex flex-col px-4 py-6">
      <div className="max-w-2xl w-full mx-auto space-y-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{workout.name}</h1>
            <p className="text-xs text-foreground/60 mt-1">{dateLabel}</p>
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-foreground/60 hover:text-foreground whitespace-nowrap"
          >
            ← Dashboard
          </Link>
        </header>

        <div className="space-y-3">
          {workout.blocks.length === 0 ? (
            <p className="text-sm text-foreground/50 text-center py-6">
              Cette séance est vide.
            </p>
          ) : (
            workout.blocks.map((block) => (
              <section
                key={block.id}
                className="rounded-xl border border-foreground/10 overflow-hidden"
              >
                <header className="p-3 border-b border-foreground/10 bg-foreground/[0.02]">
                  <h2 className="text-sm font-semibold">{block.name}</h2>
                </header>
                <ul className="p-2">
                  {block.entries.map((entry) => {
                    const values = formatValues(entry.values);
                    return (
                      <li
                        key={entry.id}
                        className={`flex items-start justify-between py-2 px-3 ${entry.status === "SKIPPED" ? "opacity-40" : ""}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${entry.status === "SKIPPED" ? "line-through" : ""}`}>
                            {entry.exercise.name}
                          </p>
                          {values && (
                            <p className="text-xs text-foreground/60 mt-0.5">
                              {values}
                            </p>
                          )}
                        </div>
                        {entry.status === "SKIPPED" && (
                          <span className="text-xs text-foreground/40 ml-2">passée</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
