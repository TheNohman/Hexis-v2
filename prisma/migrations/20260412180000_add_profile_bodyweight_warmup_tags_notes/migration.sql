-- User profile fields
ALTER TABLE "User" ADD COLUMN "unitSystem" TEXT NOT NULL DEFAULT 'metric';
ALTER TABLE "User" ADD COLUMN "defaultRestSecs" INTEGER;
ALTER TABLE "User" ADD COLUMN "bodyWeightKg" DOUBLE PRECISION;

-- WorkoutEntry: notes per set + warmup flag
ALTER TABLE "WorkoutEntry" ADD COLUMN "notes" TEXT;
ALTER TABLE "WorkoutEntry" ADD COLUMN "isWarmup" BOOLEAN NOT NULL DEFAULT false;

-- WorkoutTemplate: tags
ALTER TABLE "WorkoutTemplate" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- BodyWeightEntry model
CREATE TABLE "BodyWeightEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BodyWeightEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BodyWeightEntry_userId_date_key" ON "BodyWeightEntry"("userId", "date");
CREATE INDEX "BodyWeightEntry_userId_idx" ON "BodyWeightEntry"("userId");
CREATE INDEX "BodyWeightEntry_date_idx" ON "BodyWeightEntry"("date");

ALTER TABLE "BodyWeightEntry" ADD CONSTRAINT "BodyWeightEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
