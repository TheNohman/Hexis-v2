import { prisma } from "@/lib/prisma";
import type { PrimarySport, SportLevel } from "@/generated/prisma/client";

type ProfileUpdateInput = {
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
};

/**
 * Routes each field to the right table:
 *  - unitSystem / defaultRestSecs / mentorEnabled  → User
 *  - primarySport / sportLevel / … / medicalNotes  → UserSportProfile (upsert)
 *  - fcMax / fcResting / vmaKmh / ftp              → UserEnduranceRefs (upsert)
 */
export async function updateUserProfile(
  userId: string,
  data: ProfileUpdateInput,
): Promise<void> {
  // Split the payload by target table.
  const userPatch: Record<string, unknown> = {};
  if (data.unitSystem !== undefined) userPatch.unitSystem = data.unitSystem;
  if (data.defaultRestSecs !== undefined)
    userPatch.defaultRestSecs = data.defaultRestSecs;
  if (data.mentorEnabled !== undefined)
    userPatch.mentorEnabled = data.mentorEnabled;

  const sportPatch: Record<string, unknown> = {};
  if (data.primarySport !== undefined) sportPatch.primarySport = data.primarySport;
  if (data.sportLevel !== undefined) sportPatch.sportLevel = data.sportLevel;
  if (data.sportObjective !== undefined)
    sportPatch.sportObjective = data.sportObjective;
  if (data.weeklySessionTarget !== undefined)
    sportPatch.weeklySessionTarget = data.weeklySessionTarget;
  if (data.sessionDurationMins !== undefined)
    sportPatch.sessionDurationMins = data.sessionDurationMins;
  if (data.equipmentAccess !== undefined)
    sportPatch.equipmentAccess = data.equipmentAccess;
  if (data.medicalNotes !== undefined) sportPatch.medicalNotes = data.medicalNotes;

  const endurancePatch: Record<string, unknown> = {};
  if (data.fcMax !== undefined) endurancePatch.fcMax = data.fcMax;
  if (data.fcResting !== undefined) endurancePatch.fcResting = data.fcResting;
  if (data.vmaKmh !== undefined) endurancePatch.vmaKmh = data.vmaKmh;
  if (data.ftp !== undefined) endurancePatch.ftp = data.ftp;

  const writeData: Record<string, unknown> = { ...userPatch };
  if (Object.keys(sportPatch).length > 0) {
    writeData.sportProfile = {
      upsert: {
        // Create-side needs a complete row; we fill untouched fields with
        // nulls / defaults so a first-time write from /profile doesn't fail.
        create: sportPatch,
        update: sportPatch,
      },
    };
  }
  if (Object.keys(endurancePatch).length > 0) {
    writeData.enduranceRefs = {
      upsert: {
        create: endurancePatch,
        update: endurancePatch,
      },
    };
  }

  if (Object.keys(writeData).length === 0) return;

  await prisma.user.update({
    where: { id: userId },
    data: writeData,
  });
}

/**
 * Flat DTO merging User + UserEnduranceRefs. The profile form consumes
 * the flat shape (unchanged API) so the split is transparent upstream.
 */
export async function getUserProfile(userId: string): Promise<{
  unitSystem: string;
  defaultRestSecs: number | null;
  mentorEnabled: boolean;
  email: string | null;
  name: string | null;
  fcMax: number | null;
  fcResting: number | null;
  vmaKmh: number | null;
  ftp: number | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      unitSystem: true,
      defaultRestSecs: true,
      mentorEnabled: true,
      email: true,
      name: true,
      enduranceRefs: {
        select: {
          fcMax: true,
          fcResting: true,
          vmaKmh: true,
          ftp: true,
        },
      },
    },
  });

  if (!user) throw new Error("Not found");

  const er = user.enduranceRefs;
  return {
    unitSystem: user.unitSystem,
    defaultRestSecs: user.defaultRestSecs,
    mentorEnabled: user.mentorEnabled,
    email: user.email,
    name: user.name,
    fcMax: er?.fcMax ?? null,
    fcResting: er?.fcResting ?? null,
    vmaKmh: er?.vmaKmh ?? null,
    ftp: er?.ftp ?? null,
  };
}
