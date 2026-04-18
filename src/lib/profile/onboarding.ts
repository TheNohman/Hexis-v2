import { prisma } from "@/lib/prisma";
import type { PrimarySport, SportLevel } from "@/generated/prisma/client";

export type SportProfileInput = {
  primarySport: PrimarySport;
  sportLevel: SportLevel;
  sportObjective: string | null;
  weeklySessionTarget: number | null;
  sessionDurationMins: number | null;
  equipmentAccess: string[];
  medicalNotes: string | null;
  mentorEnabled: boolean;
};

export type SportProfile = SportProfileInput & {
  onboardingCompletedAt: Date | null;
};

/**
 * Returns the sport-profile block for a user, or null fields if they haven't
 * completed onboarding yet. Never throws — callers can use nullish values
 * to render an empty onboarding-needed UI.
 *
 * Reads the 1:1 `UserSportProfile` relation and flattens it with the
 * `mentorEnabled` flag (still on User).
 */
export async function getSportProfile(userId: string): Promise<{
  primarySport: PrimarySport | null;
  sportLevel: SportLevel | null;
  sportObjective: string | null;
  weeklySessionTarget: number | null;
  sessionDurationMins: number | null;
  equipmentAccess: string[];
  medicalNotes: string | null;
  onboardingCompletedAt: Date | null;
  mentorEnabled: boolean;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      mentorEnabled: true,
      sportProfile: {
        select: {
          primarySport: true,
          sportLevel: true,
          sportObjective: true,
          weeklySessionTarget: true,
          sessionDurationMins: true,
          equipmentAccess: true,
          medicalNotes: true,
          onboardingCompletedAt: true,
        },
      },
    },
  });

  if (!user) throw new Error("User not found");

  const sp = user.sportProfile;
  return {
    primarySport: sp?.primarySport ?? null,
    sportLevel: sp?.sportLevel ?? null,
    sportObjective: sp?.sportObjective ?? null,
    weeklySessionTarget: sp?.weeklySessionTarget ?? null,
    sessionDurationMins: sp?.sessionDurationMins ?? null,
    equipmentAccess: sp?.equipmentAccess ?? [],
    medicalNotes: sp?.medicalNotes ?? null,
    onboardingCompletedAt: sp?.onboardingCompletedAt ?? null,
    mentorEnabled: user.mentorEnabled,
  };
}

/**
 * Save the sport profile from the onboarding wizard. Also flags onboarding
 * as complete and writes mentor-opt-in flag in one transaction so a partial
 * completion can't leave the user in an invalid state. The sport-profile
 * fields land in `UserSportProfile`; `mentorEnabled` stays on `User`.
 */
export async function saveSportProfile(
  userId: string,
  data: SportProfileInput,
): Promise<void> {
  const sportData = {
    primarySport: data.primarySport,
    sportLevel: data.sportLevel,
    sportObjective: data.sportObjective,
    weeklySessionTarget: data.weeklySessionTarget,
    sessionDurationMins: data.sessionDurationMins,
    equipmentAccess: data.equipmentAccess,
    medicalNotes: data.medicalNotes,
    onboardingCompletedAt: new Date(),
  };
  await prisma.user.update({
    where: { id: userId },
    data: {
      mentorEnabled: data.mentorEnabled,
      sportProfile: {
        upsert: {
          create: sportData,
          update: sportData,
        },
      },
    },
  });
}

/**
 * Helper to check whether a user still needs to go through onboarding.
 * Used by server components to redirect.
 */
export async function needsOnboarding(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      sportProfile: { select: { onboardingCompletedAt: true } },
    },
  });
  return !user?.sportProfile?.onboardingCompletedAt;
}
