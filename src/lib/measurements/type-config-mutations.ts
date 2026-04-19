import { prisma } from "@/lib/prisma";

/** Slugify a French label into a URL-safe identifier. */
function slugify(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Reserved slugs that must never be created as user measurement types —
 * they collide with a dedicated table (e.g. `BodyWeightEntry` for "poids").
 * Keeping it central avoids the pseudo-type double-write bug on /profile/mesures.
 */
const RESERVED_SLUGS = new Set(["poids"]);

export async function createTypeConfig(
  userId: string,
  data: { label: string; unit: string; color?: string },
): Promise<void> {
  const slug = slugify(data.label);
  if (RESERVED_SLUGS.has(slug)) {
    throw new Error(
      "Ce type est déjà suivi dans la section poids corporel.",
    );
  }

  // Get max sortOrder for this user
  const last = await prisma.measurementTypeConfig.findFirst({
    where: { userId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await prisma.measurementTypeConfig.create({
    data: {
      userId,
      slug,
      label: data.label,
      unit: data.unit,
      color: data.color ?? null,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
}

export async function updateTypeConfig(
  userId: string,
  slug: string,
  data: {
    label?: string;
    unit?: string;
    color?: string | null;
    sortOrder?: number;
    archived?: boolean;
  },
): Promise<void> {
  const existing = await prisma.measurementTypeConfig.findUnique({
    where: { userId_slug: { userId, slug } },
  });
  if (!existing) throw new Error("Not found");

  await prisma.measurementTypeConfig.update({
    where: { id: existing.id },
    data: {
      ...(data.label !== undefined && { label: data.label }),
      ...(data.unit !== undefined && { unit: data.unit }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.archived !== undefined && { archived: data.archived }),
    },
  });
}

export async function deleteTypeConfig(
  userId: string,
  slug: string,
): Promise<{ deleted: boolean; archived: boolean }> {
  const config = await prisma.measurementTypeConfig.findUnique({
    where: { userId_slug: { userId, slug } },
  });
  if (!config) throw new Error("Not found");

  // Check if there are entries for this type
  const count = await prisma.bodyMeasurement.count({
    where: { userId, type: slug },
  });

  if (count > 0) {
    // Archive instead of delete
    await prisma.measurementTypeConfig.update({
      where: { id: config.id },
      data: { archived: true },
    });
    return { deleted: false, archived: true };
  }

  await prisma.measurementTypeConfig.delete({ where: { id: config.id } });
  return { deleted: true, archived: false };
}

export async function reorderTypeConfigs(
  userId: string,
  slugs: string[],
): Promise<void> {
  const updates = slugs.map((slug, i) =>
    prisma.measurementTypeConfig.updateMany({
      where: { userId, slug },
      data: { sortOrder: i },
    }),
  );
  await prisma.$transaction(updates);
}
