import { prisma } from "@/lib/prisma";

// --------------- Types ---------------

export type WellnessLogData = {
  id: string;
  date: Date;
  mood: number;
  sleep: number;
  energy: number;
  stress: number;
  notes: string | null;
  createdAt: Date;
};

// --------------- Queries ---------------

export async function getRecentWellnessLogs(
  userId: string,
  days = 14,
): Promise<WellnessLogData[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const logs = await prisma.wellnessLog.findMany({
    where: {
      userId,
      date: { gte: since },
    },
    orderBy: { date: "desc" },
  });

  return logs.map((l) => ({
    id: l.id,
    date: l.date,
    mood: l.mood,
    sleep: l.sleep,
    energy: l.energy,
    stress: l.stress,
    notes: l.notes,
    createdAt: l.createdAt,
  }));
}

export async function getTodayWellnessLog(
  userId: string,
): Promise<WellnessLogData | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const log = await prisma.wellnessLog.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  if (!log) return null;

  return {
    id: log.id,
    date: log.date,
    mood: log.mood,
    sleep: log.sleep,
    energy: log.energy,
    stress: log.stress,
    notes: log.notes,
    createdAt: log.createdAt,
  };
}
