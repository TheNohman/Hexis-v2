import { prisma } from "@/lib/prisma";

export type DetectedPR = {
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
  estimated1RM: number;
  /** Previous best 1RM for this exercise, or null if first-ever PR. */
  previousEstimated1RM: number | null;
};

/**
 * Epley 1RM estimator. `weight × (1 + reps/30)`. For reps = 1 it returns
 * the raw weight. Widely used in strength sports as a fair proxy to
 * compare sets across different rep schemes.
 */
export function estimate1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  return Math.round(weightKg * (1 + reps / 30) * 100) / 100;
}

/**
 * Scan every DONE, non-warmup STRENGTH entry of a just-finished workout
 * and create an ExerciseMax row for any exercise whose estimated 1RM
 * beats the user's previous best for that exercise.
 *
 * Returns the list of newly detected PRs so the UI can display a
 * celebratory badge on the post-workout screen.
 */
export async function detectAndRecordPRs(
  workoutId: string,
  userId: string,
): Promise<DetectedPR[]> {
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, userId },
    include: {
      blocks: {
        include: {
          entries: {
            where: { status: "DONE", isWarmup: false },
            include: {
              exercise: { select: { id: true, name: true, type: true } },
              values: {
                include: {
                  kpiDefinition: { select: { slug: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!workout) return [];

  // Group entries by exerciseId and collect (weight, reps) pairs for
  // STRENGTH exercises only (Epley doesn't apply to cardio/bodyweight).
  const bestBySession = new Map<
    string,
    {
      exerciseName: string;
      weightKg: number;
      reps: number;
      estimated1RM: number;
    }
  >();

  for (const block of workout.blocks) {
    for (const entry of block.entries) {
      if (entry.exercise.type !== "STRENGTH") continue;
      const weightVal = entry.values.find(
        (v) => v.kpiDefinition.slug === "weight_kg",
      )?.valueNumeric;
      const repsVal = entry.values.find(
        (v) => v.kpiDefinition.slug === "reps",
      )?.valueNumeric;
      if (weightVal == null || weightVal <= 0) continue;
      if (repsVal == null || repsVal <= 0) continue;

      const est = estimate1RM(weightVal, repsVal);
      const current = bestBySession.get(entry.exercise.id);
      if (!current || est > current.estimated1RM) {
        bestBySession.set(entry.exercise.id, {
          exerciseName: entry.exercise.name,
          weightKg: weightVal,
          reps: repsVal,
          estimated1RM: est,
        });
      }
    }
  }

  if (bestBySession.size === 0) return [];

  // For every candidate, check whether it beats the user's previous best.
  const exerciseIds = [...bestBySession.keys()];
  const previousBests = await prisma.exerciseMax.findMany({
    where: { userId, exerciseId: { in: exerciseIds } },
    orderBy: { estimated1RM: "desc" },
  });
  const prevMap = new Map<string, number>();
  for (const p of previousBests) {
    if (!prevMap.has(p.exerciseId)) {
      prevMap.set(p.exerciseId, p.estimated1RM);
    }
  }

  const detected: DetectedPR[] = [];
  for (const [exerciseId, best] of bestBySession.entries()) {
    const prev = prevMap.get(exerciseId) ?? null;
    if (prev !== null && best.estimated1RM <= prev) continue;
    detected.push({
      exerciseId,
      exerciseName: best.exerciseName,
      weightKg: best.weightKg,
      reps: best.reps,
      estimated1RM: best.estimated1RM,
      previousEstimated1RM: prev,
    });
  }

  if (detected.length === 0) return [];

  // Persist every detected PR.
  await prisma.exerciseMax.createMany({
    data: detected.map((pr) => ({
      userId,
      exerciseId: pr.exerciseId,
      weightKg: pr.weightKg,
      reps: pr.reps,
      estimated1RM: pr.estimated1RM,
      achievedAt: workout.finishedAt ?? new Date(),
      workoutId,
      source: "INFERRED" as const,
    })),
  });

  return detected;
}

/**
 * Manually record a PR (1RM test, gym log entry, etc.). Unlike
 * `detectAndRecordPRs`, this does NOT require a workout context — the
 * user simply declares "I lifted X kg for Y reps on date D". The estimated
 * 1RM is computed via Epley and the row is stored with `source: "MANUAL"`.
 *
 * The caller (server action) is responsible for verifying the exerciseId
 * belongs to the user (or is a system exercise) before calling this —
 * here we only validate numeric inputs.
 */
export async function addManualPR(
  userId: string,
  input: {
    exerciseId: string;
    weightKg: number;
    reps: number;
    achievedAt?: Date;
  },
) {
  if (!input.exerciseId) throw new Error("exerciseId is required");
  if (!Number.isFinite(input.weightKg) || input.weightKg <= 0) {
    throw new Error("weightKg must be a positive number");
  }
  if (!Number.isFinite(input.reps) || input.reps <= 0 || !Number.isInteger(input.reps)) {
    throw new Error("reps must be a positive integer");
  }

  // Ownership check: exercise must be system or owned by the user.
  const exercise = await prisma.exercise.findUnique({
    where: { id: input.exerciseId },
    select: { id: true, isSystem: true, userId: true },
  });
  if (!exercise) throw new Error("Not found");
  if (!exercise.isSystem && exercise.userId !== userId) {
    throw new Error("Forbidden");
  }

  const estimated1RM = estimate1RM(input.weightKg, input.reps);

  return prisma.exerciseMax.create({
    data: {
      userId,
      exerciseId: input.exerciseId,
      weightKg: input.weightKg,
      reps: input.reps,
      estimated1RM,
      achievedAt: input.achievedAt ?? new Date(),
      source: "MANUAL" as const,
    },
  });
}

/**
 * Return the user's current best (by estimated1RM) per exercise with a PR
 * row. Used by the dashboard "Records récents" and the mentor context.
 */
export async function listPersonalBests(
  userId: string,
  limit = 5,
): Promise<
  {
    exerciseId: string;
    exerciseName: string;
    weightKg: number;
    reps: number;
    estimated1RM: number;
    achievedAt: Date;
  }[]
> {
  // Use raw SQL for the window-function MAX per exercise (cleaner than
  // doing it app-side with findMany then reduce).
  const rows = await prisma.$queryRaw<
    {
      exerciseId: string;
      weightKg: number;
      reps: number;
      estimated1RM: number;
      achievedAt: Date;
      exerciseName: string;
    }[]
  >`
    SELECT DISTINCT ON (m."exerciseId")
      m."exerciseId",
      m."weightKg",
      m."reps",
      m."estimated1RM",
      m."achievedAt",
      e."name" AS "exerciseName"
    FROM "ExerciseMax" m
    JOIN "Exercise" e ON e."id" = m."exerciseId"
    WHERE m."userId" = ${userId}
    ORDER BY m."exerciseId", m."estimated1RM" DESC, m."achievedAt" DESC
    LIMIT ${limit}
  `;
  return rows;
}
