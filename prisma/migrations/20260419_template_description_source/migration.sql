-- Enrich WorkoutTemplate with description + source tracking.
CREATE TYPE "TemplateSource" AS ENUM ('MANUAL', 'AI', 'CLONED');

ALTER TABLE "WorkoutTemplate"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "source" "TemplateSource" NOT NULL DEFAULT 'MANUAL';
