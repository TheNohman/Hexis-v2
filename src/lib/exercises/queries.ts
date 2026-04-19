import { prisma } from "@/lib/prisma";

/**
 * Usage count for a single exercise: how many workout entries and
 * template entries reference it. Used by the delete confirm dialog
 * to warn the user when an exercise is actively used.
 */
export type ExerciseUsage = {
  workoutEntries: number;
  templateEntries: number;
};

/**
 * Count how many times an exercise is referenced by workouts and
 * templates. Lightweight — two `count` queries, no joins.
 *
 * Note: we don't filter by ownership here because we only call this
 * from the exercises list where the button is already hidden for
 * system exercises. Mutations layer re-checks ownership anyway.
 */
export async function getExerciseUsage(
  exerciseId: string,
): Promise<ExerciseUsage> {
  const [workoutEntries, templateEntries] = await Promise.all([
    prisma.workoutEntry.count({ where: { exerciseId } }),
    prisma.workoutTemplateEntry.count({ where: { exerciseId } }),
  ]);
  return { workoutEntries, templateEntries };
}

/**
 * Bulk version — returns a map of exerciseId -> ExerciseUsage.
 * Used by the exercises list page to pre-compute usage counts so the
 * confirm dialog doesn't have to round-trip.
 */
export async function getExerciseUsageMap(
  exerciseIds: string[],
): Promise<Record<string, ExerciseUsage>> {
  if (exerciseIds.length === 0) return {};
  const [workouts, templates] = await Promise.all([
    prisma.workoutEntry.groupBy({
      by: ["exerciseId"],
      where: { exerciseId: { in: exerciseIds } },
      _count: { _all: true },
    }),
    prisma.workoutTemplateEntry.groupBy({
      by: ["exerciseId"],
      where: { exerciseId: { in: exerciseIds } },
      _count: { _all: true },
    }),
  ]);
  const map: Record<string, ExerciseUsage> = {};
  for (const id of exerciseIds) map[id] = { workoutEntries: 0, templateEntries: 0 };
  for (const row of workouts) {
    if (!map[row.exerciseId]) map[row.exerciseId] = { workoutEntries: 0, templateEntries: 0 };
    map[row.exerciseId].workoutEntries = row._count._all;
  }
  for (const row of templates) {
    if (!map[row.exerciseId]) map[row.exerciseId] = { workoutEntries: 0, templateEntries: 0 };
    map[row.exerciseId].templateEntries = row._count._all;
  }
  return map;
}
