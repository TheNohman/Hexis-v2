"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { updateUserProfile } from "@/lib/profile/mutations";

export async function updateProfileAction(data: {
  unitSystem?: string;
  defaultRestSecs?: number | null;
  bodyWeightKg?: number | null;
}) {
  const userId = await getCurrentUserId();
  await updateUserProfile(userId, data);
  revalidatePath("/profile");
  revalidatePath("/dashboard");
}
