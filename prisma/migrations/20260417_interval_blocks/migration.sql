-- Add HIIT / interval support to WorkoutBlock and WorkoutTemplateBlock.

-- Enums
DO $$ BEGIN
  CREATE TYPE "BlockMode" AS ENUM ('STANDARD', 'INTERVAL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "IntervalFormat" AS ENUM ('TABATA', 'INTERVALS', 'EMOM', 'AMRAP');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PlaybackOrder" AS ENUM ('CYCLE', 'SAME');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- WorkoutBlock: interval config + live round counter
ALTER TABLE "WorkoutBlock" ADD COLUMN IF NOT EXISTS "mode"              "BlockMode"       NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "WorkoutBlock" ADD COLUMN IF NOT EXISTS "intervalFormat"    "IntervalFormat";
ALTER TABLE "WorkoutBlock" ADD COLUMN IF NOT EXISTS "workSecs"          INTEGER;
ALTER TABLE "WorkoutBlock" ADD COLUMN IF NOT EXISTS "restSecs"          INTEGER;
ALTER TABLE "WorkoutBlock" ADD COLUMN IF NOT EXISTS "roundCount"        INTEGER;
ALTER TABLE "WorkoutBlock" ADD COLUMN IF NOT EXISTS "playbackOrder"     "PlaybackOrder"   DEFAULT 'CYCLE';
ALTER TABLE "WorkoutBlock" ADD COLUMN IF NOT EXISTS "countdownLeadSecs" INTEGER           NOT NULL DEFAULT 10;
ALTER TABLE "WorkoutBlock" ADD COLUMN IF NOT EXISTS "completedRounds"   INTEGER           NOT NULL DEFAULT 0;

-- WorkoutTemplateBlock: same config minus completedRounds (templates don't run)
ALTER TABLE "WorkoutTemplateBlock" ADD COLUMN IF NOT EXISTS "mode"              "BlockMode"       NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "WorkoutTemplateBlock" ADD COLUMN IF NOT EXISTS "intervalFormat"    "IntervalFormat";
ALTER TABLE "WorkoutTemplateBlock" ADD COLUMN IF NOT EXISTS "workSecs"          INTEGER;
ALTER TABLE "WorkoutTemplateBlock" ADD COLUMN IF NOT EXISTS "restSecs"          INTEGER;
ALTER TABLE "WorkoutTemplateBlock" ADD COLUMN IF NOT EXISTS "roundCount"        INTEGER;
ALTER TABLE "WorkoutTemplateBlock" ADD COLUMN IF NOT EXISTS "playbackOrder"     "PlaybackOrder"   DEFAULT 'CYCLE';
ALTER TABLE "WorkoutTemplateBlock" ADD COLUMN IF NOT EXISTS "countdownLeadSecs" INTEGER           NOT NULL DEFAULT 10;
