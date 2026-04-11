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
            <h1 className="text-2xl font-bold">Hexis</h1>
            <p className="text-sm text-foreground/60 mt-1">
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
              className="text-xs text-foreground/60 hover:text-foreground transition-colors cursor-pointer"
            >
              Se déconnecter
            </button>
          </form>
        </header>

        <div className="space-y-3">
          <form action={createWorkoutAction}>
            <button
              type="submit"
              className="w-full rounded-xl bg-foreground text-background py-4 text-lg font-semibold hover:opacity-90 transition-opacity cursor-pointer"
            >
              + Nouvelle séance
            </button>
          </form>
          <Link
            href="/templates"
            className="block w-full rounded-xl border border-foreground/20 py-3 text-center text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors"
          >
            Mes templates
          </Link>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground/60 uppercase tracking-wide">
            Dernières séances
          </h2>

          {workouts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-foreground/20 p-8 text-center">
              <p className="text-foreground/60">
                Aucune séance pour le moment.
              </p>
              <p className="text-sm text-foreground/40 mt-1">
                Lance ta première séance avec le bouton ci-dessus.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {workouts.map((workout) => (
                <li key={workout.id}>
                  <Link
                    href={`/sessions/${workout.id}`}
                    className="block rounded-xl border border-foreground/10 hover:border-foreground/30 hover:bg-foreground/5 transition-colors p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{workout.name}</p>
                        <p className="text-xs text-foreground/60 mt-0.5">
                          {new Intl.DateTimeFormat("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(workout.startedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {workout.entryCount} entrée
                          {workout.entryCount > 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-foreground/60 mt-0.5">
                          {workout.blockCount} bloc
                          {workout.blockCount > 1 ? "s" : ""}
                          {workout.finishedAt ? null : " • en cours"}
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
