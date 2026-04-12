"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { upsertMeasurement, deleteMeasurement } from "@/lib/measurements/mutations";
import {
  createTypeConfig,
  updateTypeConfig,
  deleteTypeConfig,
  reorderTypeConfigs,
} from "@/lib/measurements/type-config-mutations";

// ─── Measurement entries ───

export async function addMeasurementAction(data: {
  type: string;
  date: string; // ISO date string
  value: number;
  notes?: string;
}) {
  const userId = await getCurrentUserId();
  await upsertMeasurement(userId, {
    type: data.type,
    date: new Date(data.date),
    value: data.value,
    notes: data.notes ?? null,
  });
  revalidatePath("/profile");
  revalidatePath("/profile/mesures");
}

export async function deleteMeasurementAction(entryId: string) {
  const userId = await getCurrentUserId();
  await deleteMeasurement(entryId, userId);
  revalidatePath("/profile");
  revalidatePath("/profile/mesures");
}

// ─── Type config ───

export async function createMeasurementTypeAction(data: {
  label: string;
  unit: string;
  color?: string;
}) {
  const userId = await getCurrentUserId();
  await createTypeConfig(userId, data);
  revalidatePath("/profile");
  revalidatePath("/profile/mesures");
}

export async function updateMeasurementTypeAction(
  slug: string,
  data: { label?: string; unit?: string; color?: string | null; archived?: boolean },
) {
  const userId = await getCurrentUserId();
  await updateTypeConfig(userId, slug, data);
  revalidatePath("/profile");
  revalidatePath("/profile/mesures");
}

export async function deleteMeasurementTypeAction(slug: string) {
  const userId = await getCurrentUserId();
  const result = await deleteTypeConfig(userId, slug);
  revalidatePath("/profile");
  revalidatePath("/profile/mesures");
  return result;
}

export async function reorderMeasurementTypesAction(slugs: string[]) {
  const userId = await getCurrentUserId();
  await reorderTypeConfigs(userId, slugs);
  revalidatePath("/profile/mesures");
}
