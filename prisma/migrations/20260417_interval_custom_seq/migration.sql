-- Custom sequence pattern for HIIT blocks: the user can now explicitly
-- set which exercise plays on each round (instead of just CYCLE or SAME).

-- Extend PlaybackOrder enum with CUSTOM.
ALTER TYPE "PlaybackOrder" ADD VALUE IF NOT EXISTS 'CUSTOM';

-- customSequence: one exerciseId per round, length = roundCount.
-- Empty array when playbackOrder is CYCLE or SAME.
ALTER TABLE "WorkoutBlock"         ADD COLUMN IF NOT EXISTS "customSequence" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "WorkoutTemplateBlock" ADD COLUMN IF NOT EXISTS "customSequence" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
