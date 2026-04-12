import { prisma } from "@/lib/prisma";
import type { MeasurementTypeConfigData } from "./types";

/** All non-archived type configs for a user, sorted by sortOrder. */
export async function listTypeConfigs(
  userId: string,
): Promise<MeasurementTypeConfigData[]> {
  const configs = await prisma.measurementTypeConfig.findMany({
    where: { userId, archived: false },
    orderBy: { sortOrder: "asc" },
  });

  return configs.map((c) => ({
    id: c.id,
    slug: c.slug,
    label: c.label,
    unit: c.unit,
    color: c.color,
    sortOrder: c.sortOrder,
    archived: c.archived,
  }));
}

/** Get a single type config by slug. */
export async function getTypeConfig(
  userId: string,
  slug: string,
): Promise<MeasurementTypeConfigData | null> {
  const c = await prisma.measurementTypeConfig.findUnique({
    where: { userId_slug: { userId, slug } },
  });
  if (!c) return null;

  return {
    id: c.id,
    slug: c.slug,
    label: c.label,
    unit: c.unit,
    color: c.color,
    sortOrder: c.sortOrder,
    archived: c.archived,
  };
}
