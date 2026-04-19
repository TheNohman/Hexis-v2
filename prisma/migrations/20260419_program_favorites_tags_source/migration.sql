-- Enrich Program with favorites, tags, and source tracking (parity with WorkoutTemplate).
CREATE TYPE "ProgramSource" AS ENUM ('MANUAL', 'AI', 'CLONED');

ALTER TABLE "Program"
  ADD COLUMN "isFavorite" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "tags" TEXT[] DEFAULT '{}' NOT NULL,
  ADD COLUMN "source" "ProgramSource" NOT NULL DEFAULT 'MANUAL';
