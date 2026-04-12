import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { listRecentWorkouts } from "@/lib/workouts/queries";
import { getActiveProgram } from "@/lib/programs/queries";
import { getTodayWellnessLog } from "@/lib/wellness/queries";
import { createWorkoutAction } from "@/app/sessions/actions";
import { formatDuration } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { NextWorkoutCard } from "./_components/next-workout-card";
import { WellnessCheckin } from "./_components/wellness-checkin";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await auth();
  const userId = await getCurrentUserId();
  const [workouts, activeProgram, todayWellness, userSettings] = await Promise.all([
    listRecentWorkouts(userId, 10),
    getActiveProgram(userId),
    getTodayWellnessLog(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { mentorEnabled: true } }),
  ]);

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

        <WellnessCheckin existingLog={todayWellness} />

        {activeProgram && <NextWorkoutCard info={activeProgram} />}

        <div className="flex gap-2">
          <form action={createWorkoutAction} className="flex-1">
            <button
              type="submit"
              className="w-full rounded-xl bg-accent text-white py-3.5 font-semibold hover:bg-accent-hover transition-colors cursor-pointer shadow-sm"
            >
              + Nouvelle s&eacute;ance libre
            </button>
          </form>
          {userSettings?.mentorEnabled && (
            <Link
              href="/mentor"
              className="shrink-0 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3.5 flex items-center gap-2 hover:bg-accent/10 transition-colors"
              title="Mentor IA"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a7 7 0 017 7c0 3-2 5.5-4 7l-1 2H10l-1-2c-2-1.5-4-4-4-7a7 7 0 017-7z" />
                <line x1="10" y1="22" x2="14" y2="22" />
              </svg>
            </Link>
          )}
        </div>

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
