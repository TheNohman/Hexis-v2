import { prisma } from "@/lib/prisma";
import type { MeasurementData } from "./types";

/** All measurements for a user (most recent first). */
export async function listAllMeasurements(
  userId: string,
): Promise<MeasurementData[]> {
  const entries = await prisma.bodyMeasurement.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  return entries.map((e) => ({
    id: e.id,
    type: e.type,
    date: e.date,
    value: e.value,
    notes: e.notes,
  }));
}

/** Distinct measurement types a user has tracked. */
export async function listTrackedTypes(userId: string): Promise<string[]> {
  const rows = await prisma.bodyMeasurement.findMany({
    where: { userId },
    select: { type: true },
    distinct: ["type"],
  });
  return rows.map((r) => r.type);
}
