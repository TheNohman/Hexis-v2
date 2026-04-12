import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { listRecentWorkouts } from "@/lib/workouts/queries";
import { createWorkoutAction } from "@/app/sessions/actions";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await auth();
  const userId = await getCurrentUserId();
  const workouts = await listRecentWorkouts(userId, 10);

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-8">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight">
              HEXIS
            </h1>
            <p className="text-sm text-muted mt-1">
              Bonjour {session?.user?.name ?? session?.user?.email ?? ""}
            </p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="text-xs text-subtle hover:text-foreground transition-colors cursor-pointer px-3 py-2 rounded-lg hover:bg-surface-hover"
            >
              Se d&eacute;connecter
            </button>
          </form>
        </header>

        <form action={createWorkoutAction}>
          <button
            type="submit"
            className="w-full rounded-2xl bg-accent text-background py-4 text-base font-bold tracking-wide hover:bg-accent-dark transition-colors cursor-pointer uppercase"
          >
            + Nouvelle s&eacute;ance
          </button>
        </form>

        <section className="space-y-4">
          <h2 className="text-xs font-bold text-subtle uppercase tracking-widest">
            Derni&egrave;res s&eacute;ances
          </h2>

          {workouts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-surface-border p-8 text-center">
              <p className="text-muted">
                Aucune s&eacute;ance pour le moment.
              </p>
              <p className="text-sm text-subtle mt-2">
                Lance ta premi&egrave;re s&eacute;ance avec le bouton ci-dessus.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {workouts.map((workout) => (
                <li key={workout.id}>
                  <Link
                    href={`/sessions/${workout.id}`}
                    className="group block rounded-2xl border border-surface-border bg-surface hover:bg-surface-hover hover:border-surface-border-hover transition-all p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate group-hover:text-accent transition-colors">
                          {workout.name}
                        </p>
                        <p className="text-xs text-subtle mt-1">
                          {new Intl.DateTimeFormat("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(workout.startedAt)}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-sm font-semibold tabular-nums">
                          {workout.entryCount} entr&eacute;e
                          {workout.entryCount > 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-subtle mt-1">
                          {workout.blockCount} bloc
                          {workout.blockCount > 1 ? "s" : ""}
                          {workout.finishedAt ? null : (
                            <span className="ml-1.5 inline-flex items-center gap-1 text-accent">
                              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                              en cours
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
