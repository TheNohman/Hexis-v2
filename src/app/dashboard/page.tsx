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
      <div className="max-w-2xl w-full space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">
              Hexis
            </h1>
            <p className="text-sm text-muted mt-0.5">
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
              className="text-xs text-muted hover:text-foreground transition-colors cursor-pointer py-1"
            >
              Se d&eacute;connecter
            </button>
          </form>
        </header>

        <form action={createWorkoutAction}>
          <button
            type="submit"
            className="w-full rounded-xl bg-accent text-white py-3.5 font-semibold hover:bg-accent-hover transition-colors cursor-pointer shadow-sm"
          >
            + Nouvelle s&eacute;ance
          </button>
        </form>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Derni&egrave;res s&eacute;ances
          </h2>

          {workouts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-muted">
                Aucune s&eacute;ance pour le moment.
              </p>
              <p className="text-sm text-subtle mt-1">
                Lance ta premi&egrave;re s&eacute;ance avec le bouton ci-dessus.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {workouts.map((workout) => (
                <li key={workout.id}>
                  <Link
                    href={`/sessions/${workout.id}`}
                    className="block rounded-xl border border-border bg-surface hover:bg-surface-hover transition-colors p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{workout.name}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {new Intl.DateTimeFormat("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(workout.startedAt)}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-sm font-medium tabular-nums">
                          {workout.entryCount} entr&eacute;e
                          {workout.entryCount > 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {workout.blockCount} bloc
                          {workout.blockCount > 1 ? "s" : ""}
                          {workout.finishedAt ? null : (
                            <span className="ml-1.5 text-accent font-medium">
                              &bull; en cours
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
