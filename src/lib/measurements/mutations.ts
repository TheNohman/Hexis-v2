import { prisma } from "@/lib/prisma";

export async function upsertMeasurement(
  userId: string,
  data: { type: string; date: Date; value: number; notes?: string | null },
): Promise<void> {
  await prisma.bodyMeasurement.upsert({
    where: {
      userId_type_date: { userId, type: data.type, date: data.date },
    },
    update: {
      value: data.value,
      notes: data.notes ?? null,
    },
    create: {
      userId,
      type: data.type,
      date: data.date,
      value: data.value,
      notes: data.notes ?? null,
    },
  });
}

export async function deleteMeasurement(
  entryId: string,
  userId: string,
): Promise<void> {
  const entry = await prisma.bodyMeasurement.findUnique({
    where: { id: entryId },
  });

  if (!entry) throw new Error("Not found");
  if (entry.userId !== userId) throw new Error("Forbidden");

  await prisma.bodyMeasurement.delete({ where: { id: entryId } });
}
