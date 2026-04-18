-- Free-form description of a program's intent (objective, level, constraints).
-- Feeds the AI when auto-filling cycles.
ALTER TABLE "Program" ADD COLUMN "description" TEXT;
