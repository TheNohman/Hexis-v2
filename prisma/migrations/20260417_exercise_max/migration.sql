-- Personal record tracking for strength exercises.

DO $$ BEGIN
  CREATE TYPE "MaxSource" AS ENUM ('MANUAL', 'INFERRED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "ExerciseMax" (
  "id"            TEXT        NOT NULL,
  "userId"        TEXT        NOT NULL,
  "exerciseId"    TEXT        NOT NULL,
  "weightKg"      DOUBLE PRECISION NOT NULL,
  "reps"          INTEGER     NOT NULL DEFAULT 1,
  "estimated1RM"  DOUBLE PRECISION NOT NULL,
  "achievedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "workoutId"     TEXT,
  "source"        "MaxSource" NOT NULL DEFAULT 'INFERRED',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ExerciseMax_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ExerciseMax_userId_fkey"     FOREIGN KEY ("userId")     REFERENCES "User"("id")     ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ExerciseMax_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ExerciseMax_workoutId_fkey"  FOREIGN KEY ("workoutId")  REFERENCES "Workout"("id")  ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ExerciseMax_userId_exerciseId_achievedAt_idx" ON "ExerciseMax"("userId", "exerciseId", "achievedAt");
CREATE INDEX IF NOT EXISTS "ExerciseMax_userId_achievedAt_idx"            ON "ExerciseMax"("userId", "achievedAt");
