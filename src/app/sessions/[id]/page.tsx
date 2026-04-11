import { notFound } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth-helpers";
import {
  getWorkoutById,
  listExercisesForUser,
} from "@/lib/workouts/queries";
import { UnifiedSession } from "./_components/unified-session";
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

  // Finished workouts are read-only.
  if (workout.finishedAt) {
    return <WorkoutReadonly workout={workout} />;
  }

  // All active workouts (free-form and template-based) use the unified session.
  const exercises = await listExercisesForUser(userId);
  return <UnifiedSession workout={workout} exercises={exercises} />;
}
