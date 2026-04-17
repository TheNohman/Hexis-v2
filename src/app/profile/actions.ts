"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { updateUserProfile } from "@/lib/profile/mutations";
import type { PrimarySport, SportLevel } from "@/generated/prisma/client";

export async function updateProfileAction(data: {
  unitSystem?: string;
  defaultRestSecs?: number | null;
  mentorEnabled?: boolean;
  fcMax?: number | null;
  fcResting?: number | null;
  vmaKmh?: number | null;
  ftp?: number | null;
  primarySport?: PrimarySport | null;
  sportLevel?: SportLevel | null;
  sportObjective?: string | null;
  weeklySessionTarget?: number | null;
  sessionDurationMins?: number | null;
  equipmentAccess?: string[];
  medicalNotes?: string | null;
}) {
  const userId = await getCurrentUserId();
  await updateUserProfile(userId, data);
  revalidatePath("/profile");
  revalidatePath("/dashboard");
}
