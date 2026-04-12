import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { listWorkoutHistory } from "@/lib/history/queries";
import { formatDuration } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageStr } = await searchParams;
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
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">
              Historique
            </h1>
            <p className="text-xs text-muted mt-1">{total} s&eacute;ance{total > 1 ? "s" : ""}</p>
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-muted hover:text-foreground transition-colors py-1"
          >
            &larr; Retour
          </Link>
        </header>

        {/* Search */}
        <form className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Rechercher une s&eacute;ance..."
            className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors"
          />
          <button
            type="submit"
            className="rounded-xl bg-accent text-white px-5 text-sm font-medium hover:bg-accent-hover transition-colors cursor-pointer"
          >
            Chercher
          </button>
        </form>

        {/* Results */}
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-muted">
              {q ? "Aucun r\u00e9sultat." : "Aucune s\u00e9ance pour le moment."}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((workout) => (
              <li key={workout.id}>
                <Link
                  href={`/sessions/${workout.id}`}
                  className="block rounded-xl border border-border bg-surface hover:bg-surface-hover transition-colors p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{workout.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted">
                          {new Intl.DateTimeFormat("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }).format(workout.startedAt)}
                        </span>
                        {workout.durationMins != null && (
                          <span className="text-xs text-subtle">
                            &bull; {formatDuration(workout.durationMins * 60)}
                          </span>
                        )}
                      </div>
                      {workout.exerciseNames.length > 0 && (
                        <p className="text-xs text-subtle mt-1.5 truncate">
                          {workout.exerciseNames.slice(0, 4).join(", ")}
                          {workout.exerciseNames.length > 4 && ` +${workout.exerciseNames.length - 4}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium tabular-nums">
                        {workout.entryCount} s&eacute;rie{workout.entryCount > 1 ? "s" : ""}
                      </p>
                      {workout.totalVolume > 0 && (
                        <p className="text-xs text-accent font-medium mt-0.5 tabular-nums">
                          {Math.round(workout.totalVolume).toLocaleString("fr-FR")} kg
                        </p>
                      )}
                      {!workout.finishedAt && (
                        <p className="text-xs text-accent font-medium mt-0.5">
                          &bull; en cours
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            {page > 1 && (
              <Link
                href={`/history?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) })}`}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface transition-colors"
              >
                &larr; Pr&eacute;c&eacute;dent
              </Link>
            )}
            <span className="text-sm text-muted tabular-nums">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/history?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) })}`}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface transition-colors"
              >
                Suivant &rarr;
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
