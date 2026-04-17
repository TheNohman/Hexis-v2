import { prisma } from "@/lib/prisma";

export function assertOwnership<T extends { userId: string }>(
  entity: T | null,
  userId: string,
): asserts entity is T {
  if (!entity) throw new Error("Not found");
  if (entity.userId !== userId) throw new Error("Forbidden");
}

/**
 * Generic helpers that centralise the "load entity + check owning user"
 * pattern used across workouts/templates mutations. Each helper performs a
 * single Prisma query with a targeted `select` to minimise the payload.
 *
 * Callers that need extra fields on the returned entity can pass a
 * `select` object and a generic type argument describing the expected
 * shape — the ownership relation is always added internally so the
 * runtime check stays sound regardless of what the caller selects.
 *
 * Example:
 *   const entry = await assertEntryOwnership<{ status: EntryStatus }>(
 *     id, userId, { status: true }
 *   );
 */

type PrismaSelect = Record<string, unknown>;

/**
 * Assert ownership on a Workout. Thin wrapper around `assertOwnership`.
 * Returns a minimal `{ id, userId }` projection — callers that need the
 * full workout row should use `prisma.workout.findUnique` with their own
 * include/select.
 */
export async function assertWorkoutOwnership(
  workoutId: string,
  userId: string,
) {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: { id: true, userId: true },
  });
  assertOwnership(workout, userId);
  return workout;
}

/**
 * Assert ownership on a WorkoutBlock via its parent workout.
 * Returns `{ id, workoutId } & T` — pass `T` + matching `select` to
 * pull extra fields in a single query.
 */
export async function assertBlockOwnership<T = Record<string, never>>(
  blockId: string,
  userId: string,
  select?: PrismaSelect,
): Promise<{ id: string; workoutId: string } & T> {
  const block = await prisma.workoutBlock.findUnique({
    where: { id: blockId },
    select: {
      id: true,
      workoutId: true,
      ...(select ?? {}),
      workout: { select: { userId: true } },
    },
  });
  if (!block) throw new Error("Not found");
  if (block.workout.userId !== userId) throw new Error("Forbidden");
  return block as unknown as { id: string; workoutId: string } & T;
}

/**
 * Assert ownership on a WorkoutEntry via block.workout.
 * Returns `{ id, blockId, exerciseId } & T`.
 */
export async function assertEntryOwnership<T = Record<string, never>>(
  entryId: string,
  userId: string,
  select?: PrismaSelect,
): Promise<{ id: string; blockId: string; exerciseId: string } & T> {
  const entry = await prisma.workoutEntry.findUnique({
    where: { id: entryId },
    select: {
      id: true,
      blockId: true,
      exerciseId: true,
      ...(select ?? {}),
      block: { select: { workout: { select: { userId: true } } } },
    },
  });
  if (!entry) throw new Error("Not found");
  if (entry.block.workout.userId !== userId) throw new Error("Forbidden");
  return entry as unknown as {
    id: string;
    blockId: string;
    exerciseId: string;
  } & T;
}

/**
 * Assert ownership on a WorkoutTemplateBlock via template.userId.
 */
export async function assertTemplateBlockOwnership<T = Record<string, never>>(
  blockId: string,
  userId: string,
  select?: PrismaSelect,
): Promise<{ id: string; templateId: string } & T> {
  const block = await prisma.workoutTemplateBlock.findUnique({
    where: { id: blockId },
    select: {
      id: true,
      templateId: true,
      ...(select ?? {}),
      template: { select: { userId: true } },
    },
  });
  if (!block) throw new Error("Not found");
  if (block.template.userId !== userId) throw new Error("Forbidden");
  return block as unknown as { id: string; templateId: string } & T;
}

/**
 * Assert ownership on a WorkoutTemplateEntry via block.template.userId.
 */
export async function assertTemplateEntryOwnership<T = Record<string, never>>(
  entryId: string,
  userId: string,
  select?: PrismaSelect,
): Promise<{ id: string; blockId: string; exerciseId: string } & T> {
  const entry = await prisma.workoutTemplateEntry.findUnique({
    where: { id: entryId },
    select: {
      id: true,
      blockId: true,
      exerciseId: true,
      ...(select ?? {}),
      block: { select: { template: { select: { userId: true } } } },
    },
  });
  if (!entry) throw new Error("Not found");
  if (entry.block.template.userId !== userId) throw new Error("Forbidden");
  return entry as unknown as {
    id: string;
    blockId: string;
    exerciseId: string;
  } & T;
}
