import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getWorkoutById } from "@/lib/workouts/queries";
import { prisma } from "@/lib/prisma";
import { getTodayWellnessLog } from "@/lib/wellness/queries";
import { formatDuration } from "@/lib/format";
import { Stat } from "@/app/_components/stat";
import { Card } from "@/app/_components/card";

export const dynamic = "force-dynamic";

/**
 * Post-workout summary screen. Shown right after finishing a session
 * instead of going straight back to the dashboard — gives the user a
 * celebratory, glanceable recap with:
 *   - total duration
 *   - total volume (for strength work)
 *   - session vs planned delta
 *   - HIIT rounds done / total
 *   - newly detected PRs (if any)
 *   - today's wellness snapshot for context
 * Designed to be shared-worthy (screenshot-friendly).
 */
export default async function SessionSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const workout = await getWorkoutById(id, userId);
  if (!workout) notFound();

  // If the workout isn't finished yet, kick back to the live session.
  if (!workout.finishedAt) redirect(`/sessions/${id}`);

  const durationSecs =
    workout.finishedAt && workout.startedAt
      ? Math.max(
          0,
          Math.round((workout.finishedAt.getTime() - workout.startedAt.getTime()) / 1000),
        )
      : 0;

  // Aggregate strength metrics from DONE, non-warmup entries.
  const strengthEntries = workout.blocks
    .filter((b) => b.mode !== "INTERVAL")
    .flatMap((b) => b.entries)
    .filter((e) => e.status === "DONE" && !e.isWarmup && e.exercise.type === "STRENGTH");

  let totalVolume = 0;
  for (const e of strengthEntries) {
    const weight = e.values.find((v) => v.kpiSlug === "weight_kg")?.valueNumeric ?? 0;
    const reps = e.values.find((v) => v.kpiSlug === "reps")?.valueNumeric ?? 0;
    totalVolume += weight * reps;
  }

  // Count planned vs done (excluding HIIT, which is tracked differently).
  const plannedEntries = workout.blocks
    .filter((b) => b.mode !== "INTERVAL")
    .flatMap((b) => b.entries);
  const plannedCount = plannedEntries.length;
  const doneCount = plannedEntries.filter(
    (e) => e.status === "DONE" || e.status === "SKIPPED",
  ).length;

  // HIIT totals.
  const intervalBlocks = workout.blocks.filter((b) => b.mode === "INTERVAL");
  const intervalTotals = intervalBlocks.reduce(
    (acc, b) => ({
      done: acc.done + (b.completedRounds ?? 0),
      total: acc.total + (b.roundCount ?? 0),
    }),
    { done: 0, total: 0 },
  );

  // PRs detected during this session.
  const newPRs = await prisma.exerciseMax.findMany({
    where: { userId, workoutId: id, source: "INFERRED" },
    include: { exercise: { select: { name: true } } },
    orderBy: { estimated1RM: "desc" },
  });

  // Today's wellness for context.
  const wellness = await getTodayWellnessLog(userId);

  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(workout.startedAt);

  return (
    <main id="main-content" className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-accent-ink font-semibold">
              Séance terminée
            </p>
            <h1 className="font-display font-extrabold text-[28px] sm:text-[32px] tracking-tight truncate mt-1">
              {workout.name}
            </h1>
            <p className="text-xs text-muted mt-1">{dateLabel}</p>
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-muted hover:text-foreground whitespace-nowrap py-1 transition-colors"
          >
            Accueil →
          </Link>
        </header>

        {/* Hero stats */}
        <section className="grid grid-cols-3 gap-3" aria-label="Récapitulatif">
          <Stat value={formatDuration(durationSecs)} label="Durée" variant="accent" />
          <Stat value={`${doneCount}/${plannedCount || "—"}`} label="Séries" />
          <Stat
            value={
              totalVolume > 0
                ? `${Math.round(totalVolume).toLocaleString("fr-FR")} kg`
                : "—"
            }
            label="Volume"
            variant={totalVolume > 0 ? "accent" : "default"}
          />
        </section>

        {intervalTotals.total > 0 && (
          <Card as="section" variant="accent" rounded="2xl" padding="md" className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold">
                Intervalles HIIT
              </p>
              <p className="text-sm mt-1 font-medium">
                {intervalTotals.done} / {intervalTotals.total} rounds complétés
              </p>
            </div>
            <span className="text-2xl" aria-hidden="true">🔥</span>
          </Card>
        )}

        {newPRs.length > 0 && (
          <Card as="section" variant="hero" rounded="2xl" padding="lg" className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">🏆</span>
              <h2 className="font-display font-bold text-lg tracking-tight">
                {newPRs.length === 1
                  ? "Nouveau record !"
                  : `${newPRs.length} nouveaux records !`}
              </h2>
            </div>
            <ul className="space-y-2">
              {newPRs.map((pr) => (
                <li
                  key={pr.id}
                  className="rounded-xl bg-background/10 border border-background/20 p-3"
                >
                  <p className="text-sm font-semibold">{pr.exercise.name}</p>
                  <p className="text-xs text-background/70 tabular-nums mt-0.5">
                    {pr.weightKg} kg × {pr.reps} rep{pr.reps > 1 ? "s" : ""}
                    {pr.reps > 1 && ` · ≈ ${pr.estimated1RM} kg 1RM`}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {wellness && (
          <Card as="section" padding="md">
            <p className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-2">
              Bien-être du jour
            </p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <WellnessReadout label="Humeur" level={wellness.mood} />
              <WellnessReadout label="Sommeil" level={wellness.sleep} />
              <WellnessReadout label="Énergie" level={wellness.energy} />
              <WellnessReadout label="Stress" level={wellness.stress} />
            </div>
          </Card>
        )}

        {/* Blocks recap */}
        <section className="space-y-2" aria-label="Détail des blocs">
          <h2 className="text-[10px] font-semibold text-muted uppercase tracking-widest">
            Détail
          </h2>
          <ul className="space-y-2">
            {workout.blocks.map((block) => {
              const done = block.entries.filter(
                (e) => e.status === "DONE" || e.status === "SKIPPED",
              ).length;
              return (
                <Card
                  as="li"
                  padding="sm"
                  key={block.id}
                  className="flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{block.name}</p>
                    <p className="text-xs text-muted">
                      {block.mode === "INTERVAL"
                        ? `${block.completedRounds ?? 0}/${block.roundCount ?? 0} rounds`
                        : `${done}/${block.entries.length} entrée${block.entries.length > 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-accent-ink font-semibold">
                    {block.mode === "INTERVAL" ? "HIIT" : "Muscu"}
                  </span>
                </Card>
              );
            })}
          </ul>
        </section>

        <section className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href={`/sessions/${id}`}
            className="rounded-xl bg-surface border border-border text-center py-3 text-sm font-medium hover:shadow-hero hover:-translate-y-0.5 transition-all shadow-card"
          >
            Voir la séance en détail
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl bg-foreground text-background text-center py-3 text-sm font-semibold hover:shadow-hero hover:-translate-y-0.5 transition-all shadow-card"
          >
            Retour à l’accueil
          </Link>
        </section>
      </div>
    </main>
  );
}

const MOOD_EMOJI = ["", "😫", "😟", "😐", "🙂", "😄"] as const;
const SLEEP_EMOJI = ["", "😵", "😪", "😴", "😌", "✨"] as const;
const ENERGY_EMOJI = ["", "🥴", "😪", "😐", "⚡", "🔥"] as const;
const STRESS_EMOJI = ["", "😰", "😣", "😐", "😌", "🧘"] as const;

function WellnessReadout({ label, level }: { label: string; level: number }) {
  const bank = label === "Humeur"
    ? MOOD_EMOJI
    : label === "Sommeil"
      ? SLEEP_EMOJI
      : label === "Énergie"
        ? ENERGY_EMOJI
        : STRESS_EMOJI;
  const safe = Math.max(1, Math.min(5, Math.round(level)));
  return (
    <div>
      <p className="text-lg leading-none" aria-hidden="true">{bank[safe]}</p>
      <p className="text-[10px] text-muted mt-1 uppercase tracking-widest font-semibold">
        {label} {safe}/5
      </p>
    </div>
  );
}
