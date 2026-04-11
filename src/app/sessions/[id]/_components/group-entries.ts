import type { ExerciseType } from "@/generated/prisma/enums";
import type { WorkoutDetail } from "@/lib/workouts/types";

type Entry = WorkoutDetail["blocks"][number]["entries"][number];

export type ExerciseGroup<T = Entry> = {
  exerciseId: string;
  exerciseName: string;
  exerciseSlug: string;
  exerciseType: ExerciseType;
  restDurationSecs: number | null;
  sets: T[];
};

type Groupable = {
  exercise: { id: string; name: string; slug: string; type: ExerciseType };
  restDurationSecs: number | null;
};

/**
 * Groups contiguous entries of the same exercise into ExerciseGroups.
 * Squat → Bench → Squat = 2 separate Squat groups (preserves user intent).
 */
export function groupEntriesByExercise<T extends Groupable>(
  entries: T[],
): ExerciseGroup<T>[] {
  const groups: ExerciseGroup<T>[] = [];
  let current: ExerciseGroup<T> | null = null;

  for (const entry of entries) {
    if (current && current.exerciseId === entry.exercise.id) {
      current.sets.push(entry);
      current.restDurationSecs = entry.restDurationSecs;
    } else {
      current = {
        exerciseId: entry.exercise.id,
        exerciseName: entry.exercise.name,
        exerciseSlug: entry.exercise.slug,
        exerciseType: entry.exercise.type,
        restDurationSecs: entry.restDurationSecs,
        sets: [entry],
      };
      groups.push(current);
    }
  }

  return groups;
}
