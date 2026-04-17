import { prisma } from "@/lib/prisma";
import { assertBlockOwnership } from "@/lib/ownership";

/**
 * Record the user having completed one more round of an interval (HIIT)
 * block. Idempotent-ish: bounded by roundCount on the block so you can't
 * go over (client may still debounce, but server is the source of truth).
 */
export async function incrementCompletedRounds(
  blockId: string,
  userId: string,
) {
  const block = await assertBlockOwnership<{
    mode: string;
    completedRounds: number | null;
    intervalConfig: { roundCount: number | null } | null;
  }>(blockId, userId, {
    mode: true,
    completedRounds: true,
    intervalConfig: { select: { roundCount: true } },
  });
  if (block.mode !== "INTERVAL") throw new Error("Not an interval block");

  const nextCompleted = Math.min(
    (block.completedRounds ?? 0) + 1,
    block.intervalConfig?.roundCount ?? 1,
  );
  return prisma.workoutBlock.update({
    where: { id: blockId },
    data: { completedRounds: nextCompleted },
    include: { intervalConfig: { select: { roundCount: true } } },
  });
}

/**
 * Reset the round counter on an interval block (used if the user wants
 * to redo the circuit from scratch).
 */
export async function resetInterval(blockId: string, userId: string) {
  await assertBlockOwnership(blockId, userId);
  return prisma.workoutBlock.update({
    where: { id: blockId },
    data: { completedRounds: 0 },
    include: { intervalConfig: { select: { roundCount: true } } },
  });
}
