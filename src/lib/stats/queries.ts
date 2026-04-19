import { prisma } from "@/lib/prisma";
import type {
  PeriodDelta,
  PersonalRecord,
  RecentExercise,
  WeekActivity,
  WeekVolume,
  WorkoutStats,
} from "./types";

// Re-export types so existing imports (e.g. `@/lib/stats/queries`) keep working.
export type {
  PeriodDelta,
  PersonalRecord,
  RecentExercise,
  WeekActivity,
  WeekVolume,
  WorkoutStats,
} from "./types";

// --------------- Helpers ---------------

function deltaPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return (current - previous) / previous;
}

// --------------- Query ---------------

export async function getWorkoutStats(userId: string): Promise<WorkoutStats> {
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const d60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // 1. Totals: workouts & finished workouts (all-time + 30d windows)
  const [totalWorkouts, totalFinished, workoutsC, workoutsP, finishedC, finishedP] =
    await Promise.all([
      prisma.workout.count({ where: { userId } }),
      prisma.workout.count({ where: { userId, finishedAt: { not: null } } }),
      prisma.workout.count({ where: { userId, startedAt: { gte: d30 } } }),
      prisma.workout.count({
        where: { userId, startedAt: { gte: d60, lt: d30 } },
      }),
      prisma.workout.count({
        where: {
          userId,
          finishedAt: { not: null },
          startedAt: { gte: d30 },
        },
      }),
      prisma.workout.count({
        where: {
          userId,
          finishedAt: { not: null },
          startedAt: { gte: d60, lt: d30 },
        },
      }),
    ]);

  // 2. Total entries & total sets done (status = DONE) — all-time + 30d windows
  const [totalEntries, totalSetsDone, setsC, setsP] = await Promise.all([
    prisma.workoutEntry.count({
      where: { block: { workout: { userId } } },
    }),
    prisma.workoutEntry.count({
      where: { block: { workout: { userId } }, status: "DONE" },
    }),
    prisma.workoutEntry.count({
      where: {
        block: { workout: { userId, startedAt: { gte: d30 } } },
        status: "DONE",
      },
    }),
    prisma.workoutEntry.count({
      where: {
        block: { workout: { userId, startedAt: { gte: d60, lt: d30 } } },
        status: "DONE",
      },
    }),
  ]);

  // 3. Last 5 recently used exercises
  const recentRows = await prisma.$queryRaw<
    { exerciseId: string; last_used: Date }[]
  >`
    SELECT e."exerciseId", MAX(wo."startedAt") AS last_used
    FROM   "WorkoutEntry" e
    JOIN   "WorkoutBlock" b ON b."id" = e."blockId"
    JOIN   "Workout" wo ON wo."id" = b."workoutId"
    WHERE  wo."userId" = ${userId}
      AND  e."status" = 'DONE'
    GROUP BY e."exerciseId"
    ORDER BY last_used DESC
    LIMIT 5
  `;

  let recentExercises: RecentExercise[] = [];
  if (recentRows.length > 0) {
    const exerciseIds = recentRows.map((r) => r.exerciseId);
    const exercises = await prisma.exercise.findMany({
      where: { id: { in: exerciseIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(exercises.map((e) => [e.id, e.name]));
    recentExercises = recentRows.map((r) => ({
      exerciseId: r.exerciseId,
      name: nameMap.get(r.exerciseId) ?? "Inconnu",
      lastUsedAt: r.last_used,
    }));
  }

  // 4. Workouts per week (last 8 weeks)
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const weekRows = await prisma.$queryRaw<
    { week_start: Date; count: bigint }[]
  >`
    SELECT date_trunc('week', "startedAt")::date AS week_start,
           COUNT(*)::bigint                      AS count
    FROM   "Workout"
    WHERE  "userId" = ${userId}
      AND  "startedAt" >= ${eightWeeksAgo}
    GROUP BY week_start
    ORDER BY week_start ASC
  `;

  const weeklyMap = new Map<string, number>();
  for (const row of weekRows) {
    const key =
      row.week_start instanceof Date
        ? row.week_start.toISOString().slice(0, 10)
        : String(row.week_start);
    weeklyMap.set(key, Number(row.count));
  }

  // Align the cursor on THIS WEEK's Monday then walk 7 weeks back, so
  // the 8-week window always ends on the current week (the UI reads
  // index [-1] as "this week"). Previously the cursor anchored on the
  // Monday of `eightWeeksAgo`, which meant the last bucket was ~7 days
  // stale — a session completed "today" showed as 0 until next Monday.
  const weeklyActivity: WeekActivity[] = [];
  const todayAligned = new Date();
  todayAligned.setHours(0, 0, 0, 0);
  todayAligned.setDate(
    todayAligned.getDate() - ((todayAligned.getDay() + 6) % 7),
  );
  const cursor = new Date(todayAligned);
  cursor.setDate(cursor.getDate() - 7 * 7); // 7 weeks before this Monday
  for (let i = 0; i < 8; i++) {
    const key = cursor.toISOString().slice(0, 10);
    weeklyActivity.push({ weekStart: key, count: weeklyMap.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 7);
  }

  // 5. Average duration of finished workouts (all-time + 30d windows)
  const [durationAllRows, durationCurrentRows, durationPrevRows] = await Promise.all([
    prisma.$queryRaw<{ avg_mins: number | null }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("finishedAt" - "startedAt")) / 60.0) AS avg_mins
      FROM   "Workout"
      WHERE  "userId" = ${userId}
        AND  "finishedAt" IS NOT NULL
    `,
    prisma.$queryRaw<{ avg_mins: number | null }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("finishedAt" - "startedAt")) / 60.0) AS avg_mins
      FROM   "Workout"
      WHERE  "userId" = ${userId}
        AND  "finishedAt" IS NOT NULL
        AND  "startedAt" >= ${d30}
    `,
    prisma.$queryRaw<{ avg_mins: number | null }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("finishedAt" - "startedAt")) / 60.0) AS avg_mins
      FROM   "Workout"
      WHERE  "userId" = ${userId}
        AND  "finishedAt" IS NOT NULL
        AND  "startedAt" >= ${d60}
        AND  "startedAt" <  ${d30}
    `,
  ]);
  const avgDurationMins =
    durationAllRows[0]?.avg_mins != null
      ? Math.round(durationAllRows[0].avg_mins * 10) / 10
      : null;
  const avgDurationCurrent = durationCurrentRows[0]?.avg_mins ?? 0;
  const avgDurationPrev = durationPrevRows[0]?.avg_mins ?? 0;

  // 6. Volume: all-time + last 30d + previous 30d
  const [volumeAllRows, volumeCurrentRows, volumePrevRows] = await Promise.all([
    prisma.$queryRaw<{ total_volume: number | null }[]>`
      SELECT SUM(w_val."valueNumeric" * r_val."valueNumeric") AS total_volume
      FROM   "WorkoutEntry" e
      JOIN   "WorkoutBlock" b ON b."id" = e."blockId"
      JOIN   "Workout" wo ON wo."id" = b."workoutId"
      JOIN   "EntryKpiValue" w_val ON w_val."entryId" = e."id"
      JOIN   "KpiDefinition" w_kpi ON w_kpi."id" = w_val."kpiDefinitionId" AND w_kpi."slug" = 'weight_kg'
      JOIN   "EntryKpiValue" r_val ON r_val."entryId" = e."id"
      JOIN   "KpiDefinition" r_kpi ON r_kpi."id" = r_val."kpiDefinitionId" AND r_kpi."slug" = 'reps'
      WHERE  wo."userId" = ${userId}
        AND  e."status" = 'DONE'
        AND  w_val."valueNumeric" IS NOT NULL
        AND  r_val."valueNumeric" IS NOT NULL
    `,
    prisma.$queryRaw<{ total_volume: number | null }[]>`
      SELECT SUM(w_val."valueNumeric" * r_val."valueNumeric") AS total_volume
      FROM   "WorkoutEntry" e
      JOIN   "WorkoutBlock" b ON b."id" = e."blockId"
      JOIN   "Workout" wo ON wo."id" = b."workoutId"
      JOIN   "EntryKpiValue" w_val ON w_val."entryId" = e."id"
      JOIN   "KpiDefinition" w_kpi ON w_kpi."id" = w_val."kpiDefinitionId" AND w_kpi."slug" = 'weight_kg'
      JOIN   "EntryKpiValue" r_val ON r_val."entryId" = e."id"
      JOIN   "KpiDefinition" r_kpi ON r_kpi."id" = r_val."kpiDefinitionId" AND r_kpi."slug" = 'reps'
      WHERE  wo."userId" = ${userId}
        AND  e."status" = 'DONE'
        AND  wo."startedAt" >= ${d30}
        AND  w_val."valueNumeric" IS NOT NULL
        AND  r_val."valueNumeric" IS NOT NULL
    `,
    prisma.$queryRaw<{ total_volume: number | null }[]>`
      SELECT SUM(w_val."valueNumeric" * r_val."valueNumeric") AS total_volume
      FROM   "WorkoutEntry" e
      JOIN   "WorkoutBlock" b ON b."id" = e."blockId"
      JOIN   "Workout" wo ON wo."id" = b."workoutId"
      JOIN   "EntryKpiValue" w_val ON w_val."entryId" = e."id"
      JOIN   "KpiDefinition" w_kpi ON w_kpi."id" = w_val."kpiDefinitionId" AND w_kpi."slug" = 'weight_kg'
      JOIN   "EntryKpiValue" r_val ON r_val."entryId" = e."id"
      JOIN   "KpiDefinition" r_kpi ON r_kpi."id" = r_val."kpiDefinitionId" AND r_kpi."slug" = 'reps'
      WHERE  wo."userId" = ${userId}
        AND  e."status" = 'DONE'
        AND  wo."startedAt" >= ${d60}
        AND  wo."startedAt" <  ${d30}
        AND  w_val."valueNumeric" IS NOT NULL
        AND  r_val."valueNumeric" IS NOT NULL
    `,
  ]);
  const totalVolume = Number(volumeAllRows[0]?.total_volume ?? 0);
  const volumeLast30d = Number(volumeCurrentRows[0]?.total_volume ?? 0);
  const volumePrev30d = Number(volumePrevRows[0]?.total_volume ?? 0);

  // 7. Volume per week (last 8 weeks)
  const weeklyVolumeRows = await prisma.$queryRaw<
    { week_start: Date; volume: number }[]
  >`
    SELECT date_trunc('week', wo."startedAt")::date AS week_start,
           COALESCE(SUM(w_val."valueNumeric" * r_val."valueNumeric"), 0) AS volume
    FROM   "WorkoutEntry" e
    JOIN   "WorkoutBlock" b ON b."id" = e."blockId"
    JOIN   "Workout" wo ON wo."id" = b."workoutId"
    JOIN   "EntryKpiValue" w_val ON w_val."entryId" = e."id"
    JOIN   "KpiDefinition" w_kpi ON w_kpi."id" = w_val."kpiDefinitionId" AND w_kpi."slug" = 'weight_kg'
    JOIN   "EntryKpiValue" r_val ON r_val."entryId" = e."id"
    JOIN   "KpiDefinition" r_kpi ON r_kpi."id" = r_val."kpiDefinitionId" AND r_kpi."slug" = 'reps'
    WHERE  wo."userId" = ${userId}
      AND  e."status" = 'DONE'
      AND  wo."startedAt" >= ${eightWeeksAgo}
      AND  w_val."valueNumeric" IS NOT NULL
      AND  r_val."valueNumeric" IS NOT NULL
    GROUP BY week_start
    ORDER BY week_start ASC
  `;

  const volumeMap = new Map<string, number>();
  for (const row of weeklyVolumeRows) {
    const key =
      row.week_start instanceof Date
        ? row.week_start.toISOString().slice(0, 10)
        : String(row.week_start);
    volumeMap.set(key, Number(row.volume));
  }

  // Same anchoring as weeklyActivity — align on THIS WEEK's Monday and
  // walk back 7 weeks. Keeps the [-1] index always == current week.
  const weeklyVolume: WeekVolume[] = [];
  const volCursor = new Date(todayAligned);
  volCursor.setDate(volCursor.getDate() - 7 * 7);
  for (let i = 0; i < 8; i++) {
    const key = volCursor.toISOString().slice(0, 10);
    weeklyVolume.push({ weekStart: key, volume: volumeMap.get(key) ?? 0 });
    volCursor.setDate(volCursor.getDate() + 7);
  }

  // 8. Personal records — top exercises by heaviest DONE set. For each PR we
  // surface the exact reps + date (the workout that produced the PR) so the
  // UI can render "Dev couché · 110 kg × 5 · 12 mars" rather than a bare kg.
  const prRows = await prisma.$queryRaw<
    {
      exerciseId: string;
      max_weight: number;
      reps: number | null;
      started_at: Date;
    }[]
  >`
    WITH ranked AS (
      SELECT
        e."exerciseId",
        w_val."valueNumeric"                  AS weight,
        r_val."valueNumeric"                  AS reps,
        wo."startedAt"                        AS started_at,
        ROW_NUMBER() OVER (
          PARTITION BY e."exerciseId"
          ORDER BY w_val."valueNumeric" DESC, wo."startedAt" DESC
        ) AS rnk
      FROM   "WorkoutEntry" e
      JOIN   "WorkoutBlock" b ON b."id" = e."blockId"
      JOIN   "Workout" wo ON wo."id" = b."workoutId"
      JOIN   "EntryKpiValue" w_val ON w_val."entryId" = e."id"
      JOIN   "KpiDefinition" w_kpi
        ON   w_kpi."id" = w_val."kpiDefinitionId"
        AND  w_kpi."slug" = 'weight_kg'
      -- CRITICAL: the reps LEFT JOIN must be constrained by the reps
      -- slug IN THE ON clause. Without this, the join multiplies rows
      -- (one per kpi value per entry) and r_val can leak the weight
      -- value into the reps column — producing "40 kg × 40" in the UI
      -- instead of "40 kg × 10 reps".
      LEFT JOIN "KpiDefinition" r_kpi
        ON   r_kpi."slug" = 'reps'
      LEFT JOIN "EntryKpiValue" r_val
        ON   r_val."entryId" = e."id"
        AND  r_val."kpiDefinitionId" = r_kpi."id"
      WHERE  wo."userId" = ${userId}
        AND  e."status" = 'DONE'
        AND  e."isWarmup" = false
        AND  w_val."valueNumeric" IS NOT NULL
        AND  w_val."valueNumeric" > 0
    )
    SELECT "exerciseId", weight AS max_weight, reps, started_at
    FROM   ranked
    WHERE  rnk = 1
    ORDER BY max_weight DESC
    LIMIT 5
  `;

  let personalRecords: PersonalRecord[] = [];
  if (prRows.length > 0) {
    const prIds = prRows.map((r) => r.exerciseId);
    const prExercises = await prisma.exercise.findMany({
      where: { id: { in: prIds } },
      select: { id: true, name: true },
    });
    const prNameMap = new Map(prExercises.map((e) => [e.id, e.name]));
    personalRecords = prRows.map((r) => ({
      exerciseId: r.exerciseId,
      name: prNameMap.get(r.exerciseId) ?? "Inconnu",
      maxWeight: Number(r.max_weight),
      reps: r.reps != null ? Number(r.reps) : null,
      date: r.started_at,
    }));
  }

  const workoutsLast30d: PeriodDelta = {
    current: workoutsC,
    previous: workoutsP,
    changePct: deltaPct(workoutsC, workoutsP),
  };
  const finishedLast30d: PeriodDelta = {
    current: finishedC,
    previous: finishedP,
    changePct: deltaPct(finishedC, finishedP),
  };
  const setsLast30d: PeriodDelta = {
    current: setsC,
    previous: setsP,
    changePct: deltaPct(setsC, setsP),
  };
  const avgDurationLast30d: PeriodDelta = {
    current: Number(avgDurationCurrent) || 0,
    previous: Number(avgDurationPrev) || 0,
    changePct: deltaPct(Number(avgDurationCurrent) || 0, Number(avgDurationPrev) || 0),
  };

  return {
    totalWorkouts,
    totalFinished,
    totalEntries,
    totalSetsDone,
    avgDurationMins,
    totalVolume,
    volumeLast30d,
    volumePrev30d,
    workoutsLast30d,
    finishedLast30d,
    setsLast30d,
    avgDurationLast30d,
    recentExercises,
    weeklyActivity,
    weeklyVolume,
    personalRecords,
  };
}

// --------------- Wellness x Performance correlation ---------------

export type WellnessPerformancePoint = {
  date: string;
  mood: number;
  sleep: number;
  energy: number;
  stress: number;
  volume: number;
};

export async function getWellnessPerformanceCorrelation(
  userId: string,
  days = 30,
): Promise<WellnessPerformancePoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await prisma.$queryRaw<WellnessPerformancePoint[]>`
    SELECT
      wl."date"::text AS date,
      wl."mood", wl."sleep", wl."energy", wl."stress",
      COALESCE(perf.volume, 0) AS volume
    FROM "WellnessLog" wl
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(w_val."valueNumeric" * r_val."valueNumeric"), 0) AS volume
      FROM "Workout" wo
      JOIN "WorkoutBlock" b ON b."workoutId" = wo."id"
      JOIN "WorkoutEntry" e ON e."blockId" = b."id"
      JOIN "EntryKpiValue" w_val ON w_val."entryId" = e."id"
      JOIN "KpiDefinition" w_kpi ON w_kpi."id" = w_val."kpiDefinitionId" AND w_kpi."slug" = 'weight_kg'
      JOIN "EntryKpiValue" r_val ON r_val."entryId" = e."id"
      JOIN "KpiDefinition" r_kpi ON r_kpi."id" = r_val."kpiDefinitionId" AND r_kpi."slug" = 'reps'
      WHERE wo."userId" = ${userId}
        AND wo."startedAt"::date = wl."date"
        AND e."status" = 'DONE'
        AND w_val."valueNumeric" IS NOT NULL
        AND r_val."valueNumeric" IS NOT NULL
    ) perf ON true
    WHERE wl."userId" = ${userId}
      AND wl."date" >= ${since}
    ORDER BY wl."date" ASC
  `;

  return rows.map((r) => ({
    date: String(r.date).slice(0, 10),
    mood: Number(r.mood),
    sleep: Number(r.sleep),
    energy: Number(r.energy),
    stress: Number(r.stress),
    volume: Number(r.volume),
  }));
}
