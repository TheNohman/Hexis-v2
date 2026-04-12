"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { upsertMeasurement, deleteMeasurement } from "@/lib/measurements/mutations";
import { upsertBodyWeight, deleteBodyWeight } from "@/lib/bodyweight/mutations";
import {
  createTypeConfig,
  updateTypeConfig,
  deleteTypeConfig,
  reorderTypeConfigs,
} from "@/lib/measurements/type-config-mutations";

const REVALIDATE_PATHS = ["/profile", "/profile/mesures", "/stats"];

function revalidateAll() {
  for (const p of REVALIDATE_PATHS) revalidatePath(p);
}

// ─── Measurement entries ───

export async function addMeasurementAction(data: {
  type: string;
  date: string;
  value: number;
  notes?: string;
}) {
  const userId = await getCurrentUserId();
  const date = new Date(data.date);

  if (data.type === "poids") {
    await upsertBodyWeight(userId, {
      date,
      weightKg: data.value,
      notes: data.notes ?? null,
    });
  } else {
    await upsertMeasurement(userId, {
      type: data.type,
      date,
      value: data.value,
      notes: data.notes ?? null,
    });
  }

  revalidateAll();
}

export async function deleteMeasurementAction(entryId: string, type?: string) {
  const userId = await getCurrentUserId();

  if (type === "poids") {
    await deleteBodyWeight(entryId, userId);
  } else {
    await deleteMeasurement(entryId, userId);
  }

  revalidateAll();
}

// ─── Type config ───

export async function createMeasurementTypeAction(data: {
  label: string;
  unit: string;
  color?: string;
}) {
  const userId = await getCurrentUserId();
  await createTypeConfig(userId, data);
  revalidateAll();
}

export async function updateMeasurementTypeAction(
  slug: string,
  data: { label?: string; unit?: string; color?: string | null; archived?: boolean },
) {
  const userId = await getCurrentUserId();
  await updateTypeConfig(userId, slug, data);
  revalidateAll();
}

export async function deleteMeasurementTypeAction(slug: string) {
  const userId = await getCurrentUserId();
  const result = await deleteTypeConfig(userId, slug);
  revalidateAll();
  return result;
}

export async function reorderMeasurementTypesAction(slugs: string[]) {
  const userId = await getCurrentUserId();
  await reorderTypeConfigs(userId, slugs);
  revalidatePath("/profile/mesures");
}
