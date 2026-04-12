-- Remove unique constraint to allow multiple slots per day
ALTER TABLE "ProgramSlot" DROP CONSTRAINT IF EXISTS "ProgramSlot_programId_week_day_key";

-- Rename week → cycle on ProgramSlot
ALTER TABLE "ProgramSlot" RENAME COLUMN "week" TO "cycle";

-- Rename weekCount → cycleCount + add cycleDays on Program
ALTER TABLE "Program" RENAME COLUMN "weekCount" TO "cycleCount";
ALTER TABLE "Program" ADD COLUMN "cycleDays" INTEGER NOT NULL DEFAULT 7;

-- Replace currentWeek/currentDay with currentSlotId on Program
ALTER TABLE "Program" ADD COLUMN "currentSlotId" TEXT;
ALTER TABLE "Program" DROP COLUMN IF EXISTS "currentWeek";
ALTER TABLE "Program" DROP COLUMN IF EXISTS "currentDay";

-- Add FK for currentSlotId
ALTER TABLE "Program" ADD CONSTRAINT "Program_currentSlotId_fkey"
  FOREIGN KEY ("currentSlotId") REFERENCES "ProgramSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Replace programWeek/programDay with programSlotId on Workout
ALTER TABLE "Workout" ADD COLUMN "programSlotId" TEXT;
ALTER TABLE "Workout" DROP COLUMN IF EXISTS "programWeek";
ALTER TABLE "Workout" DROP COLUMN IF EXISTS "programDay";
