-- Add sport-profile fields (collected at onboarding) and enums.

-- Enums
DO $$ BEGIN
  CREATE TYPE "PrimarySport" AS ENUM (
    'STRENGTH_TRAINING',
    'POWERLIFTING',
    'ENDURANCE',
    'CROSSFIT_HIIT',
    'MULTI_SPORT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SportLevel" AS ENUM (
    'BEGINNER',
    'INTERMEDIATE',
    'ADVANCED',
    'COMPETITIVE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- User columns (all nullable so existing users keep working)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "primarySport"         "PrimarySport";
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sportLevel"           "SportLevel";
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sportObjective"       TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "weeklySessionTarget"  INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionDurationMins"  INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "equipmentAccess"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "medicalNotes"         TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);
