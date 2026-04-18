import { prisma } from "@/lib/prisma";
import { nextDisplayOrder } from "@/lib/ordering";
import {
  assertBlockOwnership,
  assertOwnership,
} from "@/lib/ownership";

export async function addBlock(
  workoutId: string,
  userId: string,
  name: string,
) {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: {
      userId: true,
      blocks: { select: { displayOrder: true } },
    },
  });
  assertOwnership(workout, userId);

  const nextOrder = nextDisplayOrder(workout.blocks);

  return prisma.workoutBlock.create({
    data: {
      workoutId,
      name: name.trim() || "Bloc sans nom",
      displayOrder: nextOrder,
    },
  });
}

export async function renameBlock(
  blockId: string,
  userId: string,
  name: string,
) {
  await assertBlockOwnership(blockId, userId);
  return prisma.workoutBlock.update({
    where: { id: blockId },
    data: { name: name.trim() || "Bloc sans nom" },
  });
}

export async function deleteBlock(blockId: string, userId: string) {
  await assertBlockOwnership(blockId, userId);
  return prisma.workoutBlock.delete({ where: { id: blockId } });
}

export async function reorderBlocks(
  workoutId: string,
  userId: string,
  orderedBlockIds: string[],
) {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: { userId: true, blocks: { select: { id: true } } },
  });
  assertOwnership(workout, userId);

  const actualIds = new Set(workout.blocks.map((b) => b.id));
  if (
    orderedBlockIds.length !== actualIds.size ||
    !orderedBlockIds.every((id) => actualIds.has(id))
  ) {
    throw new Error("Block ID mismatch");
  }

  await prisma.$transaction(
    orderedBlockIds.map((id, index) =>
      prisma.workoutBlock.update({
        where: { id },
        data: { displayOrder: index },
      }),
    ),
  );
}
