import { prisma } from "@/lib/prisma";

// --------------- Types ---------------

export type BodyWeightData = {
  id: string;
  date: Date;
  weightKg: number;
  notes: string | null;
};

// --------------- Query ---------------

export async function listBodyWeightEntries(
  userId: string,
): Promise<BodyWeightData[]> {
  const entries = await prisma.bodyWeightEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  return entries.map((e) => ({
    id: e.id,
    date: e.date,
    weightKg: e.weightKg,
    notes: e.notes,
  }));
}
