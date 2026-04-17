-- Extract duplicated HIIT / interval configuration from WorkoutBlock and
-- WorkoutTemplateBlock into a shared IntervalConfig model (1:1 optional).
-- Only `mode` (discriminant) and `completedRounds` (live counter) stay on
-- the original tables.
--
-- Idempotent: safe to re-run (guards via IF NOT EXISTS / DO $$ blocks).

-- ---------------------------------------------------------------------------
-- 1) IntervalConfig table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "IntervalConfig" (
  "id"                TEXT              NOT NULL,
  "intervalFormat"    "IntervalFormat",
  "workSecs"          INTEGER,
  "restSecs"          INTEGER,
  "roundCount"        INTEGER,
  "playbackOrder"     "PlaybackOrder"   DEFAULT 'CYCLE',
  "countdownLeadSecs" INTEGER           NOT NULL DEFAULT 10,
  "customSequence"    TEXT[]            NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt"         TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntervalConfig_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 2) Add intervalConfigId FK columns on the two block tables
-- ---------------------------------------------------------------------------
ALTER TABLE "WorkoutBlock"         ADD COLUMN IF NOT EXISTS "intervalConfigId" TEXT;
ALTER TABLE "WorkoutTemplateBlock" ADD COLUMN IF NOT EXISTS "intervalConfigId" TEXT;

-- Unique indexes (enforces 1:1)
CREATE UNIQUE INDEX IF NOT EXISTS "WorkoutBlock_intervalConfigId_key"
  ON "WorkoutBlock"("intervalConfigId");
CREATE UNIQUE INDEX IF NOT EXISTS "WorkoutTemplateBlock_intervalConfigId_key"
  ON "WorkoutTemplateBlock"("intervalConfigId");

-- Foreign keys (guarded; Postgres has no IF NOT EXISTS for ADD CONSTRAINT)
DO $$ BEGIN
  ALTER TABLE "WorkoutBlock"
    ADD CONSTRAINT "WorkoutBlock_intervalConfigId_fkey"
    FOREIGN KEY ("intervalConfigId") REFERENCES "IntervalConfig"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WorkoutTemplateBlock"
    ADD CONSTRAINT "WorkoutTemplateBlock_intervalConfigId_fkey"
    FOREIGN KEY ("intervalConfigId") REFERENCES "IntervalConfig"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Backfill: for every INTERVAL block lacking a config row yet, create
--    one from the existing columns and link it. Guarded on the presence of
--    the old columns so the migration is re-runnable after drop.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'WorkoutBlock' AND column_name = 'workSecs'
  ) THEN
    WITH new_configs AS (
      INSERT INTO "IntervalConfig" (
        "id", "intervalFormat", "workSecs", "restSecs", "roundCount",
        "playbackOrder", "countdownLeadSecs", "customSequence",
        "createdAt", "updatedAt"
      )
      SELECT
        'ic_' || wb."id",
        wb."intervalFormat",
        wb."workSecs",
        wb."restSecs",
        wb."roundCount",
        wb."playbackOrder",
        wb."countdownLeadSecs",
        COALESCE(wb."customSequence", ARRAY[]::TEXT[]),
        NOW(), NOW()
      FROM "WorkoutBlock" wb
      WHERE wb."mode" = 'INTERVAL' AND wb."intervalConfigId" IS NULL
      RETURNING "id"
    )
    UPDATE "WorkoutBlock" wb
    SET "intervalConfigId" = 'ic_' || wb."id"
    WHERE wb."mode" = 'INTERVAL' AND wb."intervalConfigId" IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'WorkoutTemplateBlock' AND column_name = 'workSecs'
  ) THEN
    WITH new_configs AS (
      INSERT INTO "IntervalConfig" (
        "id", "intervalFormat", "workSecs", "restSecs", "roundCount",
        "playbackOrder", "countdownLeadSecs", "customSequence",
        "createdAt", "updatedAt"
      )
      SELECT
        'ict_' || tb."id",
        tb."intervalFormat",
        tb."workSecs",
        tb."restSecs",
        tb."roundCount",
        tb."playbackOrder",
        tb."countdownLeadSecs",
        COALESCE(tb."customSequence", ARRAY[]::TEXT[]),
        NOW(), NOW()
      FROM "WorkoutTemplateBlock" tb
      WHERE tb."mode" = 'INTERVAL' AND tb."intervalConfigId" IS NULL
      RETURNING "id"
    )
    UPDATE "WorkoutTemplateBlock" tb
    SET "intervalConfigId" = 'ict_' || tb."id"
    WHERE tb."mode" = 'INTERVAL' AND tb."intervalConfigId" IS NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4) Drop the 7 duplicated columns from both tables. `mode` and
--    `completedRounds` are intentionally preserved.
-- ---------------------------------------------------------------------------
ALTER TABLE "WorkoutBlock" DROP COLUMN IF EXISTS "intervalFormat";
ALTER TABLE "WorkoutBlock" DROP COLUMN IF EXISTS "workSecs";
ALTER TABLE "WorkoutBlock" DROP COLUMN IF EXISTS "restSecs";
ALTER TABLE "WorkoutBlock" DROP COLUMN IF EXISTS "roundCount";
ALTER TABLE "WorkoutBlock" DROP COLUMN IF EXISTS "playbackOrder";
ALTER TABLE "WorkoutBlock" DROP COLUMN IF EXISTS "countdownLeadSecs";
ALTER TABLE "WorkoutBlock" DROP COLUMN IF EXISTS "customSequence";

ALTER TABLE "WorkoutTemplateBlock" DROP COLUMN IF EXISTS "intervalFormat";
ALTER TABLE "WorkoutTemplateBlock" DROP COLUMN IF EXISTS "workSecs";
ALTER TABLE "WorkoutTemplateBlock" DROP COLUMN IF EXISTS "restSecs";
ALTER TABLE "WorkoutTemplateBlock" DROP COLUMN IF EXISTS "roundCount";
ALTER TABLE "WorkoutTemplateBlock" DROP COLUMN IF EXISTS "playbackOrder";
ALTER TABLE "WorkoutTemplateBlock" DROP COLUMN IF EXISTS "countdownLeadSecs";
ALTER TABLE "WorkoutTemplateBlock" DROP COLUMN IF EXISTS "customSequence";
