import { prisma } from "@/lib/prisma";
import { assertOwnership } from "@/lib/ownership";
import type { ExerciseType } from "@/generated/prisma/enums";

/**
 * Slugify a name: lowercase, replace spaces/special chars with hyphens,
 * then append 4 random alphanumeric characters for uniqueness.
 */
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const rand = Math.random().toString(36).substring(2, 6);
  return `${base}-${rand}`;
}

/**
 * Default KPI slugs per exercise type.
 * These match the conventions from the system exercise catalog.
 */
const DEFAULT_KPIS: Record<ExerciseType, { slug: string; required: boolean }[]> = {
  STRENGTH: [
    { slug: "weight_kg", required: true },
    { slug: "reps", required: true },
    { slug: "rpe", required: false },
  ],
  BODYWEIGHT: [
    { slug: "reps", required: true },
    { slug: "rpe", required: false },
  ],
  CARDIO: [
    { slug: "duration_sec", required: true },
    { slug: "distance_m", required: false },
  ],
  MOBILITY: [
    { slug: "duration_sec", required: true },
  ],
  REST: [
    { slug: "duration_sec", required: true },
  ],
};

/**
 * Create a custom exercise for the given user, along with sensible default KPIs.
 */
export async function createExercise(
  userId: string,
  data: { name: string; description?: string; type: ExerciseType },
) {
  const slug = slugify(data.name);

  // Look up KPI definition IDs for the default KPIs of this type
  const defaultKpis = DEFAULT_KPIS[data.type] ?? [];
  const kpiSlugs = defaultKpis.map((k) => k.slug);

  const kpiDefs = await prisma.kpiDefinition.findMany({
    where: { slug: { in: kpiSlugs } },
  });

  const kpiBySlug = new Map(kpiDefs.map((k) => [k.slug, k.id]));

  const exercise = await prisma.exercise.create({
    data: {
      slug,
      name: data.name,
      description: data.description ?? null,
      type: data.type,
      isSystem: false,
      userId,
      exerciseKpis: {
        create: defaultKpis
          .map((spec, i) => {
            const kpiId = kpiBySlug.get(spec.slug);
            if (!kpiId) return null;
            return {
              kpiDefinitionId: kpiId,
              isRequired: spec.required,
              displayOrder: i,
            };
          })
          .filter((v) => v !== null),
      },
    },
    include: {
      exerciseKpis: { include: { kpiDefinition: true } },
    },
  });

  return exercise;
}

/**
 * Delete a custom exercise. Throws if:
 * - the exercise is a system exercise
 * - the exercise does not belong to the user
 * - the exercise is referenced by workout entries
 */
export async function deleteExercise(
  exerciseId: string,
  userId: string,
): Promise<void> {
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { id: true, userId: true, isSystem: true },
  });

  if (!exercise) throw new Error("Not found");
  if (exercise.isSystem) throw new Error("Impossible de supprimer un exercice système");

  // assertOwnership expects { userId: string } — system exercises have null userId
  assertOwnership(exercise as { userId: string }, userId);

  // Check if exercise is used in any workout entries
  const usageCount = await prisma.workoutEntry.count({
    where: { exerciseId },
  });

  if (usageCount > 0) {
    throw new Error(
      "Impossible de supprimer cet exercice car il est utilisé dans des séances",
    );
  }

  // Also check template entries
  const templateUsageCount = await prisma.workoutTemplateEntry.count({
    where: { exerciseId },
  });

  if (templateUsageCount > 0) {
    throw new Error(
      "Impossible de supprimer cet exercice car il est utilisé dans des templates",
    );
  }

  await prisma.exercise.delete({ where: { id: exerciseId } });
}

/**
 * Update a custom exercise. Cannot update system exercises.
 */
export async function updateExercise(
  exerciseId: string,
  userId: string,
  data: { name?: string; description?: string | null; type?: ExerciseType },
): Promise<void> {
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { id: true, userId: true, isSystem: true },
  });

  if (!exercise) throw new Error("Not found");
  if (exercise.isSystem) throw new Error("Impossible de modifier un exercice système");
  assertOwnership(exercise as { userId: string }, userId);

  await prisma.exercise.update({
    where: { id: exerciseId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.type !== undefined && { type: data.type }),
    },
  });
}
