"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { upsertMeasurement, deleteMeasurement } from "@/lib/measurements/mutations";

export async function addMeasurementAction(data: {
  type: string;
  date: string; // ISO date string
  valueCm: number;
  notes?: string;
}) {
  const userId = await getCurrentUserId();
  await upsertMeasurement(userId, {
    type: data.type,
    date: new Date(data.date),
    valueCm: data.valueCm,
    notes: data.notes ?? null,
  });
  revalidatePath("/profile");
}

export async function deleteMeasurementAction(entryId: string) {
  const userId = await getCurrentUserId();
  await deleteMeasurement(entryId, userId);
  revalidatePath("/profile");
}
