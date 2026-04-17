"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { upsertMeasurement, deleteMeasurement } from "@/lib/measurements/mutations";
import { upsertBodyWeight, deleteBodyWeight } from "@/lib/bodyweight/mutations";
import {
  createTypeConfig,
  updateTypeConfig,
  deleteTypeConfig,
  reorderTypeConfigs,
} from "@/lib/measurements/type-config-mutations";
import {
  assertValid,
  idSchema,
  measurementInputSchema,
  measurementTypeCreateSchema,
  measurementTypeUpdateSchema,
} from "@/lib/validation/schemas";

const REVALIDATE_PATHS = ["/profile", "/profile/mesures", "/stats"];

function revalidateAll() {
  for (const p of REVALIDATE_PATHS) revalidatePath(p);
}

export async function addMeasurementAction(data: {
  type: string;
  date: string;
  value: number;
  notes?: string;
}) {
  const parsed = assertValid(measurementInputSchema, data);
  const userId = await getCurrentUserId();
  const date = new Date(parsed.date);

  if (parsed.type === "poids") {
    await upsertBodyWeight(userId, {
      date,
      weightKg: parsed.value,
      notes: parsed.notes ?? null,
    });
  } else {
    await upsertMeasurement(userId, {
      type: parsed.type,
      date,
      value: parsed.value,
      notes: parsed.notes ?? null,
    });
  }

  revalidateAll();
}

export async function deleteMeasurementAction(entryId: string, type?: string) {
  assertValid(idSchema, entryId);
  if (type !== undefined) assertValid(z.string().max(64), type);
  const userId = await getCurrentUserId();

  if (type === "poids") {
    await deleteBodyWeight(entryId, userId);
  } else {
    await deleteMeasurement(entryId, userId);
  }

  revalidateAll();
}

export async function createMeasurementTypeAction(data: {
  label: string;
  unit: string;
  color?: string;
}) {
  const parsed = assertValid(measurementTypeCreateSchema, data);
  const userId = await getCurrentUserId();
  await createTypeConfig(userId, parsed);
  revalidateAll();
}

export async function updateMeasurementTypeAction(
  slug: string,
  data: { label?: string; unit?: string; color?: string | null; archived?: boolean },
) {
  assertValid(z.string().min(1).max(64), slug);
  const parsed = assertValid(measurementTypeUpdateSchema, data);
  const userId = await getCurrentUserId();
  await updateTypeConfig(userId, slug, parsed);
  revalidateAll();
}

export async function deleteMeasurementTypeAction(slug: string) {
  assertValid(z.string().min(1).max(64), slug);
  const userId = await getCurrentUserId();
  const result = await deleteTypeConfig(userId, slug);
  revalidateAll();
  return result;
}

export async function reorderMeasurementTypesAction(slugs: string[]) {
  assertValid(z.array(z.string().min(1).max(64)).max(100), slugs);
  const userId = await getCurrentUserId();
  await reorderTypeConfigs(userId, slugs);
  revalidateAll();
}
