import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { formatDuration, formatExerciseType } from "@/lib/format";
import { getExercisePersonalRecords, getExerciseProgression } from "@/lib/stats/exercise-stats";
import { prisma } from "@/lib/prisma";
import { ExerciseProgressionChart } from "./_components/progression-chart";

export const dynamic = "force-dynamic";

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const exercise = await prisma.exercise.findFirst({
    where: {
      id,
      OR: [{ isSystem: true }, { userId }],
    },
    include: {
      exerciseKpis: {
        orderBy: { displayOrder: "asc" },
        include: { kpiDefinition: true },
      },
    },
  });

  if (!exercise) notFound();

  const [prs, progression] = await Promise.all([
    getExercisePersonalRecords(userId, id),
    getExerciseProgression(userId, id, 6),
  ]);

  const prIcons: Record<string, string> = {
    max_weight: "\u{1F3CB}\u{FE0F}",
    max_volume: "\u{1F4AA}",
    max_reps: "\u{1F504}",
    best_time: "\u{23F1}\u{FE0F}",
  };

  const prLabels: Record<string, string> = {
    max_weight: "Poids max",
    max_volume: "Volume max",
    max_reps: "Reps max",
    best_time: "Meilleur temps",
  };

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">
              {exercise.name}
            </h1>
            <p className="text-xs text-muted mt-1">
              {formatExerciseType(exercise.type)}
              {exercise.description && ` \u2014 ${exercise.description}`}
            </p>
          </div>
          <Link
            href="/exercises"
            className="text-xs text-muted hover:text-foreground transition-colors py-1"
          >
            &larr; Retour
          </Link>
        </header>

        {/* KPIs */}
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            M&eacute;triques
          </h2>
          <div className="flex flex-wrap gap-2">
            {exercise.exerciseKpis.map((ek) => (
              <span
                key={ek.id}
                className={`text-xs px-2.5 py-1 rounded-lg ${
                  ek.isRequired
                    ? "bg-accent/10 text-accent font-medium"
                    : "bg-surface-hover text-muted"
                }`}
              >
                {ek.kpiDefinition.name}
                {ek.kpiDefinition.unit && ` (${ek.kpiDefinition.unit})`}
              </span>
            ))}
          </div>
        </section>

        {/* Personal Records */}
        {prs.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Records personnels
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {prs.map((pr) => (
                <div
                  key={pr.type}
                  className="rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{prIcons[pr.type] ?? ""}</span>
                    <span className="text-xs text-muted font-medium">{prLabels[pr.type] ?? pr.type}</span>
                  </div>
                  <p className="text-xl font-display font-bold text-accent tabular-nums">
                    {pr.type === "best_time"
                      ? formatDuration(pr.value)
                      : `${pr.value}${pr.unit ? ` ${pr.unit}` : ""}`}
                  </p>
                  <p className="text-[10px] text-subtle mt-1">
                    {new Intl.DateTimeFormat("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }).format(pr.date)}
                    {" \u2014 "}
                    {pr.workoutName}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Progression chart */}
        {progression.length >= 2 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Progression (6 mois)
            </h2>
            <ExerciseProgressionChart data={progression} exerciseType={exercise.type} />
          </section>
        )}

        {progression.length === 0 && prs.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-muted text-sm">
              Aucune donn&eacute;e de performance.
            </p>
            <p className="text-xs text-subtle mt-1">
              Enregistre des s&eacute;ances avec cet exercice pour voir ta progression.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
