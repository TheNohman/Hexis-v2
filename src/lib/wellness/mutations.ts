import { prisma } from "@/lib/prisma";

export async function upsertWellnessLog(
  userId: string,
  data: {
    date: string; // YYYY-MM-DD
    mood: number;
    sleep: number;
    energy: number;
    stress: number;
    notes?: string | null;
  },
) {
  const dateObj = new Date(data.date + "T00:00:00.000Z");

  // Clamp values to 1-5
  const mood = Math.min(5, Math.max(1, data.mood));
  const sleep = Math.min(5, Math.max(1, data.sleep));
  const energy = Math.min(5, Math.max(1, data.energy));
  const stress = Math.min(5, Math.max(1, data.stress));

  return prisma.wellnessLog.upsert({
    where: { userId_date: { userId, date: dateObj } },
    create: {
      userId,
      date: dateObj,
      mood,
      sleep,
      energy,
      stress,
      notes: data.notes ?? null,
    },
    update: {
      mood,
      sleep,
      energy,
      stress,
      notes: data.notes ?? null,
    },
  });
}

export async function deleteWellnessLog(logId: string, userId: string) {
  const log = await prisma.wellnessLog.findUnique({ where: { id: logId } });
  if (!log || log.userId !== userId) throw new Error("Forbidden");
  return prisma.wellnessLog.delete({ where: { id: logId } });
}
