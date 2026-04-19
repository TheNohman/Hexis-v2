import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { listWorkouts, getActiveWorkout } from "@/lib/workouts/queries";
import { getActiveProgram } from "@/lib/programs/queries";
import { getTodayWellnessLog } from "@/lib/wellness/queries";
import { getSportProfile, needsOnboarding } from "@/lib/profile/onboarding";
import { formatDuration } from "@/lib/format";
import { NextWorkoutCard } from "./_components/next-workout-card";
import { WellnessCheckin } from "./_components/wellness-checkin";
import { BeginnerTip } from "./_components/beginner-tip";
import { CreateWorkoutButton } from "./_components/create-workout-button";
import { DashboardTour } from "./_components/dashboard-tour";
import { Sparkline } from "@/app/_components/sparkline";
import { MiniBarChart } from "@/app/_components/mini-bar-chart";

export const dynamic = "force-dynamic";

type WorkoutItem = Awaited<ReturnType<typeof listWorkouts>>[number];

function initials(name: string | null | undefined): string {
  if (!name) return "H";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "H";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function workoutInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

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

/** Build a 7-slot "this week" bar series (Mon..Sun) from recent workouts. */
function weeklyBars(workouts: WorkoutItem[]): { bars: number[]; todayIdx: number; total: number } {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // 0=Mon..6=Sun
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - dow);
  const bars = [0, 0, 0, 0, 0, 0, 0];
  for (const w of workouts) {
    const d = new Date(w.startedAt);
    const diffDays = Math.floor((d.getTime() - monday.getTime()) / 86400000);
    if (diffDays >= 0 && diffDays < 7) bars[diffDays] += 1;
  }
  return { bars, todayIdx: dow, total: bars.reduce((a, b) => a + b, 0) };
}

/** Build a sparkline series of the last 6 workout durations (oldest→newest). */
function durationSeries(workouts: WorkoutItem[]): number[] {
  const last = workouts
    .filter((w) => w.durationMins != null)
    .slice(0, 6)
    .reverse()
    .map((w) => w.durationMins as number);
  return last;
}

export default async function Dashboard() {
  const session = await auth();
  const userId = await getCurrentUserId();
  if (await needsOnboarding(userId)) redirect("/onboarding");
  const [workouts, activeProgram, todayWellness, activeWorkout, profile] = await Promise.all([
    listWorkouts(userId, { limit: 10 }),
    getActiveProgram(userId),
    getTodayWellnessLog(userId),
    getActiveWorkout(userId),
    getSportProfile(userId),
  ]);
  const firstName = session?.user?.name?.split(" ")[0] ?? null;
  const displayName = session?.user?.name ?? session?.user?.email ?? "";
  const isBeginner = profile.sportLevel === "BEGINNER";
  // Brand-new user — no in-flight or past workout, no active program.
  // These users get a single strong CTA instead of competing buttons.
  const isBrandNew =
    !activeWorkout && !activeProgram && workouts.length === 0;

  const week = weeklyBars(workouts);
  const durations = durationSeries(workouts);
  const avgDuration =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-6 pb-28">
      <div className="max-w-2xl w-full space-y-5">
        {/* Welcome header */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/profile"
              aria-label="Voir mon profil"
              className="shrink-0 w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-display font-extrabold text-base hover:shadow-card transition-shadow"
            >
              <span aria-hidden="true">{initials(displayName)}</span>
            </Link>
            <div className="min-w-0">
              <h1 className="font-display font-extrabold tracking-tight text-[28px] sm:text-[32px] leading-tight truncate">
                Salut, {firstName ?? "toi"} <span aria-hidden="true">👋</span>
              </h1>
              <p className="text-xs text-muted mt-0.5">Prêt pour aujourd&rsquo;hui ?</p>
            </div>
          </div>

          <Link
            href="/mentor"
            aria-label="Ouvrir le Mentor IA"
            className="shrink-0 w-11 h-11 rounded-full bg-surface shadow-card flex items-center justify-center hover:shadow-hero transition-shadow"
          >
            <span aria-hidden="true" className="text-lg">💡</span>
          </Link>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
            className="sr-only-focusable"
          >
            <button type="submit">Quitter</button>
          </form>
        </header>

        {/* One-time vocabulary mini-tour — only for brand-new users,
            dismissed forever via localStorage. Kept between the header
            and the rest so it never floats over interactive content. */}
        {isBrandNew && <DashboardTour />}

        {/* Active session — hero black card */}
        {activeWorkout ? (
          <Link
            href={`/sessions/${activeWorkout.id}`}
            className="block rounded-3xl bg-foreground text-background p-6 shadow-hero hover:shadow-floating transition-shadow group"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              <span className="text-[10px] uppercase tracking-widest font-semibold text-accent">
                Séance en cours
              </span>
            </div>
            <p className="font-display font-extrabold text-2xl leading-tight">
              {activeWorkout.name}
            </p>
            <div className="mt-2 flex items-center gap-3 text-xs text-background/70 tabular-nums">
              <span>
                {activeWorkout.completedEntries} / {activeWorkout.totalEntries} séries
              </span>
              <span aria-hidden="true">•</span>
              <span>
                {activeWorkout.totalEntries > 0
                  ? Math.round(
                      (activeWorkout.completedEntries / activeWorkout.totalEntries) * 100,
                    )
                  : 0}
                % validé
              </span>
            </div>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground px-4 py-2 text-sm font-semibold group-hover:bg-accent-hover transition-colors">
              Continuer la séance
              <span aria-hidden="true">→</span>
            </div>
          </Link>
        ) : null}

        {/* NextWorkoutCard FIRST (if program active) — the workout is
            the primary job-to-be-done. WellnessCheckin follows. */}
        {!activeWorkout && activeProgram ? (
          <NextWorkoutCard info={activeProgram} />
        ) : !activeWorkout && !isBrandNew ? (
          <Link
            href="/planning"
            className="block rounded-3xl border border-dashed border-border bg-surface p-6 text-center hover:border-foreground/30 transition-colors"
          >
            <p className="font-display font-bold text-base">Aucun programme actif</p>
            <p className="text-xs text-muted mt-1">
              Crée ou active un programme pour planifier tes séances
            </p>
          </Link>
        ) : null}

        {/* Brand-new user: elevate the BeginnerTip so there's ONE
            focal point with a single strong CTA to /planning. For
            non-beginners who are also brand-new we fall back to a
            plain editorial CTA so the dashboard is never empty. */}
        {isBeginner && isBrandNew ? (
          <BeginnerTip
            primarySport={profile.primarySport}
            hasWorkouts={false}
            primary
          />
        ) : isBrandNew ? (
          <Link
            href="/planning"
            className="block rounded-3xl border border-accent/30 bg-accent-light/40 p-5 space-y-2 shadow-card hover:shadow-hero transition-shadow"
          >
            <p className="text-[10px] uppercase tracking-widest font-bold text-accent-ink">
              Pour commencer
            </p>
            <p className="font-display font-bold text-base leading-tight">
              Crée ton premier programme →
            </p>
            <p className="text-xs text-muted">
              Un programme = tes cycles de séances planifiés dans le temps.
            </p>
          </Link>
        ) : null}

        {/* Wellness check-in — secondary for brand-new users (stays
            visually quieter via its default collapsed state). */}
        <WellnessCheckin existingLog={todayWellness} />

        {/* Beginner tip in its quiet form — only when the user has a
            program OR past workouts but hasn't logged one yet. */}
        {isBeginner && !isBrandNew && (
          <BeginnerTip
            primarySport={profile.primarySport}
            hasWorkouts={workouts.length > 0}
          />
        )}

        {/* Free session CTA. Hidden for brand-new users (the Beginner
            tip is the single focal point). When a program is active
            it's secondary. Otherwise a wrapped button that asks for
            confirmation before closing any in-flight session. */}
        {!isBrandNew && (
          <CreateWorkoutButton
            primary={!activeProgram || !!activeWorkout}
            hasActiveWorkout={!!activeWorkout}
          />
        )}

        {/* Quick stats — balanced 2-card row */}
        <section className="grid grid-cols-2 gap-3" aria-label="Statistiques">
          <div className="rounded-2xl bg-surface shadow-card p-4">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-widest">
              Cette semaine
            </p>
            <div className="mt-2 flex items-end justify-between gap-2">
              <div>
                <p className="font-display font-black text-3xl tabular-nums leading-none">
                  {week.total}
                </p>
                <p className="text-[11px] text-muted mt-1">
                  séance{week.total > 1 ? "s" : ""}
                </p>
              </div>
              <MiniBarChart
                values={week.bars}
                highlightIndex={week.todayIdx}
                labels={["L", "M", "M", "J", "V", "S", "D"]}
                width={108}
                height={52}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-surface shadow-card p-4">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-widest">
              Durée moyenne
            </p>
            <div className="mt-2 flex items-end justify-between gap-2">
              <p className="font-display font-black text-3xl tabular-nums leading-none">
                {avgDuration != null ? avgDuration : "—"}
                {avgDuration != null && (
                  <span className="text-sm text-muted font-sans font-medium ml-0.5">
                    min
                  </span>
                )}
              </p>
              <Sparkline values={durations} width={72} height={36} />
            </div>
          </div>
        </section>

        {/* Recent workouts */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg tracking-tight">
              Dernières séances
            </h2>
            <Link
              href="/history"
              className="text-xs font-semibold text-foreground hover:text-muted transition-colors inline-flex items-center gap-1"
            >
              Tout voir <span aria-hidden="true">→</span>
            </Link>
          </div>

          {workouts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-8 text-center">
              <p className="text-muted">Aucune séance pour le moment.</p>
              <p className="text-sm text-subtle mt-1">
                {/* Copy aligned with the actual empty-state CTA above:
                    brand-new users see "Crée ton premier programme",
                    returning users see "+ Nouvelle séance libre". */}
                Crée un programme ou lance une séance libre pour démarrer.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {workouts.map((workout) => {
                const tone = thumbTone(workout.name);
                const isLive = !workout.finishedAt;
                return (
                  <li key={workout.id}>
                    <Link
                      href={`/sessions/${workout.id}`}
                      className="group flex items-center gap-3 rounded-2xl bg-surface shadow-card p-3 hover:shadow-hero hover:-translate-y-0.5 transition-all"
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
                              hour: "2-digit",
                              minute: "2-digit",
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
                        </div>
                      </div>
                      <span
                        className="shrink-0 text-subtle group-hover:text-foreground transition-colors"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
