import { notFound } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth-helpers";
import {
  getWorkoutById,
  listExercisesForUser,
} from "@/lib/workouts/queries";
import { WorkoutEditor } from "./_components/workout-editor";
import { WorkoutReadonly } from "./_components/workout-readonly";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const workout = await getWorkoutById(id, userId);

  if (!workout) {
    notFound();
  }

  // Finished workouts are read-only. Ongoing workouts are editable.
  if (workout.finishedAt) {
    return <WorkoutReadonly workout={workout} />;
  }

  const exercises = await listExercisesForUser(userId);
  return <WorkoutEditor workout={workout} exercises={exercises} />;
}
