import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { listRecentWorkouts, getActiveWorkout } from "@/lib/workouts/queries";
import { getActiveProgram } from "@/lib/programs/queries";
import { getTodayWellnessLog } from "@/lib/wellness/queries";
import { getSportProfile, needsOnboarding } from "@/lib/profile/onboarding";
import { createWorkoutAction } from "@/app/sessions/actions";
import { formatDuration } from "@/lib/format";
import { NextWorkoutCard } from "./_components/next-workout-card";
import { WellnessCheckin } from "./_components/wellness-checkin";
import { SportHero } from "./_components/sport-hero";
import { BeginnerTip } from "./_components/beginner-tip";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await auth();
  const userId = await getCurrentUserId();
  if (await needsOnboarding(userId)) redirect("/onboarding");
  const [workouts, activeProgram, todayWellness, activeWorkout, profile] = await Promise.all([
    listRecentWorkouts(userId, 10),
    getActiveProgram(userId),
    getTodayWellnessLog(userId),
    getActiveWorkout(userId),
    getSportProfile(userId),
  ]);
  const firstName = session?.user?.name?.split(" ")[0] ?? null;
  const isBeginner = profile.sportLevel === "BEGINNER";

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
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="text-xs text-muted hover:text-foreground transition-colors cursor-pointer py-1"
            >
              Profil
            </Link>
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
          </div>
        </header>

        <SportHero
          firstName={firstName}
          primarySport={profile.primarySport}
          sportLevel={profile.sportLevel}
          sportObjective={profile.sportObjective}
        />

        <WellnessCheckin existingLog={todayWellness} />

        {isBeginner && (
          <BeginnerTip
            primarySport={profile.primarySport}
            hasWorkouts={workouts.length > 0}
          />
        )}

        {/* Active workout takes priority over next-workout suggestion */}
        {activeWorkout ? (
          <Link
            href={`/sessions/${activeWorkout.id}`}
            className="block rounded-2xl border border-accent/40 bg-accent/10 p-5 hover:bg-accent/15 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-accent">
                S&eacute;ance en cours
              </p>
            </div>
            <p className="text-lg font-display font-bold">{activeWorkout.name}</p>
            <p className="text-xs text-muted mt-0.5 tabular-nums">
              {activeWorkout.completedEntries} / {activeWorkout.totalEntries} s&eacute;ries valid&eacute;es
            </p>
            <p className="text-sm font-semibold text-accent mt-3">
              Reprendre la s&eacute;ance &rarr;
            </p>
          </Link>
        ) : activeProgram ? (
          <NextWorkoutCard info={activeProgram} />
        ) : (
          <Link
            href="/planning"
            className="block rounded-xl border border-dashed border-accent/30 bg-accent/5 p-4 text-center hover:bg-accent/10 transition-colors"
          >
            <p className="text-sm font-medium text-accent">Aucun programme actif</p>
            <p className="text-xs text-muted mt-1">
              Cr&eacute;e ou active un programme pour planifier tes s&eacute;ances
            </p>
          </Link>
        )}

        <form action={createWorkoutAction}>
          <button
            type="submit"
            className="w-full rounded-xl bg-accent text-white py-3.5 font-semibold hover:bg-accent-hover transition-colors cursor-pointer shadow-sm"
          >
            + Nouvelle s&eacute;ance libre
          </button>
        </form>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Derni&egrave;res s&eacute;ances
            </h2>
            <Link
              href="/history"
              className="text-xs text-accent hover:text-accent-hover transition-colors"
            >
              Tout voir &rarr;
            </Link>
          </div>

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
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted">
                            {new Intl.DateTimeFormat("fr-FR", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(workout.startedAt)}
                          </span>
                          {workout.durationMins != null && (
                            <span className="text-xs text-subtle">
                              &bull; {formatDuration(workout.durationMins * 60)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-sm font-medium tabular-nums">
                          {workout.entryCount} s&eacute;rie
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
