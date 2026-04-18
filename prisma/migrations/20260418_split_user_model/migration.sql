-- Split the User god-object into two optional 1:1 relations:
--   * UserSportProfile  (onboarding: sport, level, objectives, equipment…)
--   * UserEnduranceRefs (HR / VMA / FTP references for zone derivation)
--
-- Dev-mode migration: backfills from the existing User columns and then
-- drops them. Idempotent so it can be re-run safely.

-- 1) Tables -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "UserSportProfile" (
  "id"                    TEXT         NOT NULL PRIMARY KEY,
  "userId"                TEXT         NOT NULL,
  "primarySport"          "PrimarySport",
  "sportLevel"            "SportLevel",
  "sportObjective"        TEXT,
  "weeklySessionTarget"   INTEGER,
  "sessionDurationMins"   INTEGER,
  "equipmentAccess"       TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  "medicalNotes"          TEXT,
  "onboardingCompletedAt" TIMESTAMP(3),
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSportProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserSportProfile_userId_key"
  ON "UserSportProfile"("userId");

CREATE TABLE IF NOT EXISTS "UserEnduranceRefs" (
  "id"        TEXT         NOT NULL PRIMARY KEY,
  "userId"    TEXT         NOT NULL,
  "fcMax"     INTEGER,
  "fcResting" INTEGER,
  "vmaKmh"    DOUBLE PRECISION,
  "ftp"       INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserEnduranceRefs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserEnduranceRefs_userId_key"
  ON "UserEnduranceRefs"("userId");

-- 2) Backfill (only when the source columns still exist on User) ------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'User' AND column_name = 'primarySport'
  ) THEN
    INSERT INTO "UserSportProfile" (
      "id", "userId",
      "primarySport", "sportLevel", "sportObjective",
      "weeklySessionTarget", "sessionDurationMins",
      "equipmentAccess", "medicalNotes", "onboardingCompletedAt"
    )
    SELECT
      gen_random_uuid()::text,
      u."id",
      u."primarySport",
      u."sportLevel",
      u."sportObjective",
      u."weeklySessionTarget",
      u."sessionDurationMins",
      COALESCE(u."equipmentAccess", ARRAY[]::TEXT[]),
      u."medicalNotes",
      u."onboardingCompletedAt"
    FROM "User" u
    WHERE (
      u."primarySport"          IS NOT NULL
      OR u."sportLevel"         IS NOT NULL
      OR u."sportObjective"     IS NOT NULL
      OR u."weeklySessionTarget" IS NOT NULL
      OR u."sessionDurationMins" IS NOT NULL
      OR (u."equipmentAccess" IS NOT NULL AND array_length(u."equipmentAccess", 1) > 0)
      OR u."medicalNotes"       IS NOT NULL
      OR u."onboardingCompletedAt" IS NOT NULL
    )
    ON CONFLICT ("userId") DO NOTHING;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'User' AND column_name = 'fcMax'
  ) THEN
    INSERT INTO "UserEnduranceRefs" (
      "id", "userId", "fcMax", "fcResting", "vmaKmh", "ftp"
    )
    SELECT
      gen_random_uuid()::text,
      u."id",
      u."fcMax",
      u."fcResting",
      u."vmaKmh",
      u."ftp"
    FROM "User" u
    WHERE (
      u."fcMax"     IS NOT NULL
      OR u."fcResting" IS NOT NULL
      OR u."vmaKmh"    IS NOT NULL
      OR u."ftp"       IS NOT NULL
    )
    ON CONFLICT ("userId") DO NOTHING;
  END IF;
END $$;

-- 3) Drop the 12 extracted columns from User -------------------------------

ALTER TABLE "User" DROP COLUMN IF EXISTS "primarySport";
ALTER TABLE "User" DROP COLUMN IF EXISTS "sportLevel";
ALTER TABLE "User" DROP COLUMN IF EXISTS "sportObjective";
ALTER TABLE "User" DROP COLUMN IF EXISTS "weeklySessionTarget";
ALTER TABLE "User" DROP COLUMN IF EXISTS "sessionDurationMins";
ALTER TABLE "User" DROP COLUMN IF EXISTS "equipmentAccess";
ALTER TABLE "User" DROP COLUMN IF EXISTS "medicalNotes";
ALTER TABLE "User" DROP COLUMN IF EXISTS "onboardingCompletedAt";
ALTER TABLE "User" DROP COLUMN IF EXISTS "fcMax";
ALTER TABLE "User" DROP COLUMN IF EXISTS "fcResting";
ALTER TABLE "User" DROP COLUMN IF EXISTS "vmaKmh";
ALTER TABLE "User" DROP COLUMN IF EXISTS "ftp";
