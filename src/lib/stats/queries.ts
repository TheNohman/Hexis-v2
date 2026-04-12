import { prisma } from "@/lib/prisma";

// --------------- Types ---------------

export type TopExercise = {
  exerciseId: string;
  name: string;
  count: number;
};

export type WeekActivity = {
  /** ISO week start date (Monday) as YYYY-MM-DD */
  weekStart: string;
  count: number;
};

export type WeekVolume = {
  weekStart: string;
  volume: number;
};

export type WorkoutStats = {
  totalWorkouts: number;
  totalFinished: number;
  totalEntries: number;
  totalSetsDone: number;
  avgDurationMins: number | null;
  totalVolume: number;
  topExercises: TopExercise[];
  weeklyActivity: WeekActivity[];
  weeklyVolume: WeekVolume[];
};

// --------------- Query ---------------

export async function getWorkoutStats(
  userId: string,
): Promise<WorkoutStats> {
  // 1. Totals: workouts & finished workouts
  const [totalWorkouts, totalFinished] = await Promise.all([
    prisma.workout.count({ where: { userId } }),
    prisma.workout.count({
      where: { userId, finishedAt: { not: null } },
    }),
  ]);

  // 2. Total entries & total sets done (status = DONE)
  const [totalEntries, totalSetsDone] = await Promise.all([
    prisma.workoutEntry.count({
      where: { block: { workout: { userId } } },
    }),
    prisma.workoutEntry.count({
      where: { block: { workout: { userId } }, status: "DONE" },
    }),
  ]);

  // 3. Top 5 exercises by entry count
  const topRows = await prisma.workoutEntry.groupBy({
    by: ["exerciseId"],
    where: { block: { workout: { userId } } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });

  let topExercises: TopExercise[] = [];
  if (topRows.length > 0) {
    const exerciseIds = topRows.map((r) => r.exerciseId);
    const exercises = await prisma.exercise.findMany({
      where: { id: { in: exerciseIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(exercises.map((e) => [e.id, e.name]));
    topExercises = topRows.map((r) => ({
      exerciseId: r.exerciseId,
      name: nameMap.get(r.exerciseId) ?? "Inconnu",
      count: r._count.id,
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

  // Build a complete 8-week array (fill missing weeks with 0)
  const weeklyMap = new Map<string, number>();
  for (const row of weekRows) {
    const key =
      row.week_start instanceof Date
        ? row.week_start.toISOString().slice(0, 10)
        : String(row.week_start);
    weeklyMap.set(key, Number(row.count));
  }

  const weeklyActivity: WeekActivity[] = [];
  const cursor = new Date(eightWeeksAgo);
  // Align to Monday
  cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
  for (let i = 0; i < 8; i++) {
    const key = cursor.toISOString().slice(0, 10);
    weeklyActivity.push({ weekStart: key, count: weeklyMap.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 7);
  }

  // 5. Average duration of finished workouts (in minutes)
  const durationRows = await prisma.$queryRaw<
    { avg_mins: number | null }[]
  >`
    SELECT AVG(EXTRACT(EPOCH FROM ("finishedAt" - "startedAt")) / 60.0) AS avg_mins
    FROM   "Workout"
    WHERE  "userId" = ${userId}
      AND  "finishedAt" IS NOT NULL
  `;
  const avgDurationMins =
    durationRows[0]?.avg_mins != null
      ? Math.round(durationRows[0].avg_mins * 10) / 10
      : null;

  // 6. Total volume: sum of (weight_kg * reps) for DONE entries
  const volumeRows = await prisma.$queryRaw<{ total_volume: number | null }[]>`
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
  `;
  const totalVolume = volumeRows[0]?.total_volume ?? 0;

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

  const weeklyVolume: WeekVolume[] = [];
  const volCursor = new Date(eightWeeksAgo);
  volCursor.setDate(volCursor.getDate() - ((volCursor.getDay() + 6) % 7));
  for (let i = 0; i < 8; i++) {
    const key = volCursor.toISOString().slice(0, 10);
    weeklyVolume.push({ weekStart: key, volume: volumeMap.get(key) ?? 0 });
    volCursor.setDate(volCursor.getDate() + 7);
  }

  return {
    totalWorkouts,
    totalFinished,
    totalEntries,
    totalSetsDone,
    avgDurationMins,
    totalVolume,
    topExercises,
    weeklyActivity,
    weeklyVolume,
  };
}
