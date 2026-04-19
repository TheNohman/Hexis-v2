import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { formatDuration, formatExerciseType } from "@/lib/format";
import { getExercisePersonalRecords, getExerciseProgression } from "@/lib/stats/exercise-stats";
import { prisma } from "@/lib/prisma";
import { ExerciseProgressionChart } from "./_components/progression-chart";
import { ManualPRForm } from "./_components/manual-pr-form";

export const dynamic = "force-dynamic";

const PR_ICONS: Record<string, string> = {
  max_weight: "\u{1F3CB}\u{FE0F}",
  max_volume: "\u{1F4AA}",
  max_reps: "\u{1F504}",
  best_time: "\u{23F1}\u{FE0F}",
};

const PR_LABELS: Record<string, string> = {
  max_weight: "Poids max",
  max_volume: "Volume max",
  max_reps: "Reps max",
  best_time: "Meilleur temps",
};

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

  const topPR = prs[0];

  return (
    <main id="main-content" className="flex-1 flex flex-col items-center px-4 py-6 pb-28">
      <div className="max-w-2xl w-full space-y-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted">
              {formatExerciseType(exercise.type)}
            </p>
            <h1 className="font-display font-extrabold tracking-tight text-[28px] sm:text-[32px] leading-tight mt-1">
              {exercise.name}
            </h1>
            {exercise.description && (
              <p className="text-xs text-muted mt-1.5">{exercise.description}</p>
            )}
            {exercise.equipment.length > 0 && (
              <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                <span
                  aria-hidden="true"
                  className="text-[10px] uppercase tracking-widest font-semibold text-accent-ink"
                >
                  Matériel
                </span>
                {exercise.equipment.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-surface border border-border px-2 py-0.5 text-[11px] font-medium text-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <Link
            href="/exercises"
            className="shrink-0 text-xs font-semibold text-muted hover:text-foreground transition-colors py-1"
          >
            ← Retour
          </Link>
        </header>

        {/* Hero PR card — show if we have at least one PR */}
        {topPR && (
          <section
            aria-label="Record personnel principal"
            className="rounded-3xl bg-foreground text-background p-6 shadow-hero"
          >
            <div className="flex items-center gap-2 mb-3">
              <span aria-hidden="true" className="text-lg">
                {PR_ICONS[topPR.type] ?? "\u{1F3C6}"}
              </span>
              <span className="text-[10px] uppercase tracking-widest font-semibold text-accent">
                {PR_LABELS[topPR.type] ?? topPR.type}
              </span>
            </div>
            <p className="font-display font-black text-5xl tabular-nums leading-none">
              {topPR.type === "best_time"
                ? formatDuration(topPR.value)
                : `${topPR.value}`}
              {topPR.type !== "best_time" && topPR.unit && (
                <span className="text-2xl text-background/70 font-bold ml-1">
                  {topPR.unit}
                </span>
              )}
            </p>
            <p className="text-xs text-background/70 mt-3 tabular-nums">
              {new Intl.DateTimeFormat("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(topPR.date)}
              {" · "}
              {topPR.workoutName}
            </p>
          </section>
        )}

        {/* KPIs */}
        <section aria-label="Métriques suivies" className="space-y-2.5">
          <h2 className="font-display font-bold text-lg tracking-tight">Métriques</h2>
          <div className="flex flex-wrap gap-2">
            {exercise.exerciseKpis.map((ek) => (
              <span
                key={ek.id}
                className={`text-[11px] px-3 py-1.5 rounded-full font-semibold ${
                  ek.isRequired
                    ? "bg-accent/10 text-accent-ink"
                    : "bg-surface shadow-card text-muted"
                }`}
              >
                {ek.kpiDefinition.name}
                {ek.kpiDefinition.unit && ` (${ek.kpiDefinition.unit})`}
              </span>
            ))}
          </div>
        </section>

        {/* Remaining personal records grid (if more than one) */}
        {prs.length > 1 && (
          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg tracking-tight">
              Records personnels
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {prs.slice(1).map((pr) => (
                <div
                  key={pr.type}
                  className="rounded-2xl bg-surface shadow-card p-4"
                >
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="text-base">
                      {PR_ICONS[pr.type] ?? ""}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-muted">
                      {PR_LABELS[pr.type] ?? pr.type}
                    </span>
                  </div>
                  <p className="font-display font-black text-3xl tabular-nums mt-2 leading-none">
                    {pr.type === "best_time"
                      ? formatDuration(pr.value)
                      : pr.value}
                    {pr.type !== "best_time" && pr.unit && (
                      <span className="text-sm text-muted font-bold ml-1">{pr.unit}</span>
                    )}
                  </p>
                  <p className="text-[10px] text-subtle mt-1.5 tabular-nums">
                    {new Intl.DateTimeFormat("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }).format(pr.date)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Manual PR entry (only meaningful for STRENGTH exercises) */}
        {exercise.type === "STRENGTH" && <ManualPRForm exerciseId={exercise.id} />}

        {/* Progression chart */}
        {progression.length >= 2 && (
          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg tracking-tight">
              Progression (6 mois)
            </h2>
            <ExerciseProgressionChart data={progression} exerciseType={exercise.type} />
          </section>
        )}

        {progression.length === 0 && prs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="font-display font-bold text-base">Aucune donnée</p>
            <p className="text-xs text-muted mt-1">
              Enregistre des séances avec cet exercice pour voir ta progression.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
