import { prisma } from "@/lib/prisma";

export async function upsertBodyWeight(
  userId: string,
  data: { date: Date; weightKg: number; notes?: string | null },
): Promise<void> {
  await prisma.bodyWeightEntry.upsert({
    where: {
      userId_date: { userId, date: data.date },
    },
    update: {
      weightKg: data.weightKg,
      notes: data.notes ?? null,
    },
    create: {
      userId,
      date: data.date,
      weightKg: data.weightKg,
      notes: data.notes ?? null,
    },
  });

  // Update the user's latest body weight
  await prisma.user.update({
    where: { id: userId },
    data: { bodyWeightKg: data.weightKg },
  });
}

export async function deleteBodyWeight(
  entryId: string,
  userId: string,
): Promise<void> {
  const entry = await prisma.bodyWeightEntry.findUnique({
    where: { id: entryId },
  });

  if (!entry) throw new Error("Not found");
  if (entry.userId !== userId) throw new Error("Forbidden");

  await prisma.bodyWeightEntry.delete({ where: { id: entryId } });
}
