import Link from "next/link";
import { History, Search } from "lucide-react";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { listWorkoutHistory } from "@/lib/history/queries";
import { formatDuration } from "@/lib/format";
import { EmptyState } from "@/app/_components/empty-state";
import { DeleteWorkoutButton } from "./_components/delete-workout-button";
import { HistoryFlash } from "./_components/history-flash";

export const dynamic = "force-dynamic";

type ThumbTone = "lime" | "lavender" | "butter" | "peach";

function thumbTone(name: string): ThumbTone {
  const n = name.toLowerCase();
  if (/run|course|v[ée]lo|bike|cardio|swim|nat|endur/.test(n)) return "lavender";
  if (/hiit|wod|crossfit|tabata|emom|amrap/.test(n)) return "butter";
  if (/mobilit|yoga|stretch/.test(n)) return "peach";
  return "lime";
}

const THUMB_CLASS: Record<ThumbTone, string> = {
  lime: "bg-accent text-accent-foreground",
  lavender: "bg-[var(--lavender)] text-foreground",
  butter: "bg-[var(--butter)] text-foreground",
  peach: "bg-[var(--peach)] text-foreground",
};

function workoutInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; flash?: string }>;
}) {
  const { q, page: pageStr, flash } = await searchParams;
  const userId = await getCurrentUserId();
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const pageSize = 20;

  const { items, total } = await listWorkoutHistory(
    userId,
    { search: q || undefined },
    page,
    pageSize,
  );

  const totalPages = Math.ceil(total / pageSize);

  return (
    <main id="main-content" className="flex-1 flex flex-col items-center px-4 py-6 pb-28">
      <HistoryFlash flash={flash} />
      <div className="max-w-2xl w-full space-y-5">
        <header className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display font-extrabold tracking-tight text-[28px] sm:text-[32px] leading-tight">
              Historique
            </h1>
            <p className="text-xs text-muted mt-1 tabular-nums">
              {total} séance{total > 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-muted hover:text-foreground transition-colors py-1"
          >
            ← Retour
          </Link>
        </header>

        {/* Search */}
        <form className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Rechercher une séance..."
            aria-label="Rechercher une séance"
            className="flex-1 rounded-xl bg-surface shadow-card px-4 py-3 text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/60 transition-shadow"
          />
          <button
            type="submit"
            className="rounded-xl bg-foreground text-background px-5 text-sm font-semibold hover:bg-foreground/90 transition-colors cursor-pointer"
          >
            Chercher
          </button>
        </form>

        {/* Results */}
        {items.length === 0 ? (
          q ? (
            <EmptyState
              icon={Search}
              title="Aucun résultat"
              description={`Aucune séance ne correspond à « ${q} ».`}
            />
          ) : (
            <EmptyState
              icon={History}
              title="Aucune séance"
              description="Tes séances terminées apparaîtront ici."
              cta={{ label: "Lancer une séance", href: "/dashboard" }}
            />
          )
        ) : (
          <ul className="space-y-2.5">
            {items.map((workout) => {
              const tone = thumbTone(workout.name);
              const isLive = !workout.finishedAt;
              return (
                <li key={workout.id} className="relative">
                  <Link
                    href={`/sessions/${workout.id}`}
                    className="group flex items-start gap-3 rounded-2xl bg-surface shadow-card p-3 pr-16 hover:shadow-hero hover:-translate-y-0.5 transition-all"
                  >
                    <div
                      className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center font-display font-extrabold text-base ${THUMB_CLASS[tone]}`}
                      aria-hidden="true"
                    >
                      {workoutInitials(workout.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-display font-bold text-[15px] truncate">
                          {workout.name}
                        </p>
                        {isLive && (
                          <span className="shrink-0 inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-accent-foreground">
                            Live
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[11px] text-muted">
                          {new Intl.DateTimeFormat("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }).format(workout.startedAt)}
                        </span>
                        {workout.durationMins != null && (
                          <span className="inline-flex items-center rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold text-muted tabular-nums">
                            {formatDuration(workout.durationMins * 60)}
                          </span>
                        )}
                        <span className="inline-flex items-center rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold text-muted tabular-nums">
                          {workout.entryCount} série{workout.entryCount > 1 ? "s" : ""}
                        </span>
                        {workout.totalVolume > 0 && (
                          <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent-ink tabular-nums">
                            {Math.round(workout.totalVolume).toLocaleString("fr-FR")} kg
                          </span>
                        )}
                      </div>
                      {workout.exerciseNames.length > 0 && (
                        <p className="text-[11px] text-subtle mt-1.5 truncate">
                          {workout.exerciseNames.slice(0, 4).join(", ")}
                          {workout.exerciseNames.length > 4 &&
                            ` +${workout.exerciseNames.length - 4}`}
                        </p>
                      )}
                    </div>
                  </Link>
                  <div className="absolute top-2 right-2">
                    <DeleteWorkoutButton
                      workoutId={workout.id}
                      workoutName={workout.name}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            {page > 1 && (
              <Link
                href={`/history?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) })}`}
                className="rounded-full bg-surface shadow-card px-4 py-2 text-sm font-semibold hover:shadow-hero transition-shadow"
              >
                ← Précédent
              </Link>
            )}
            <span className="text-sm text-muted tabular-nums">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/history?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) })}`}
                className="rounded-full bg-surface shadow-card px-4 py-2 text-sm font-semibold hover:shadow-hero transition-shadow"
              >
                Suivant →
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
