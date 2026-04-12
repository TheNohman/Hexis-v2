-- Add mentorEnabled to User
ALTER TABLE "User" ADD COLUMN "mentorEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Add program fields to Workout
ALTER TABLE "Workout" ADD COLUMN "programId" TEXT;
ALTER TABLE "Workout" ADD COLUMN "programWeek" INTEGER;
ALTER TABLE "Workout" ADD COLUMN "programDay" INTEGER;

-- Create Program table
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weekCount" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "currentWeek" INTEGER NOT NULL DEFAULT 0,
    "currentDay" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- Create ProgramSlot table
CREATE TABLE "ProgramSlot" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "label" TEXT,
    "templateId" TEXT,

    CONSTRAINT "ProgramSlot_pkey" PRIMARY KEY ("id")
);

-- Create WellnessLog table
CREATE TABLE "WellnessLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "mood" INTEGER NOT NULL,
    "sleep" INTEGER NOT NULL,
    "energy" INTEGER NOT NULL,
    "stress" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WellnessLog_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "Program_userId_idx" ON "Program"("userId");
CREATE INDEX "ProgramSlot_programId_idx" ON "ProgramSlot"("programId");
CREATE UNIQUE INDEX "ProgramSlot_programId_week_day_key" ON "ProgramSlot"("programId", "week", "day");
CREATE INDEX "WellnessLog_userId_idx" ON "WellnessLog"("userId");
CREATE UNIQUE INDEX "WellnessLog_userId_date_key" ON "WellnessLog"("userId", "date");
CREATE INDEX "Workout_programId_idx" ON "Workout"("programId");

-- Foreign keys
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Program" ADD CONSTRAINT "Program_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgramSlot" ADD CONSTRAINT "ProgramSlot_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgramSlot" ADD CONSTRAINT "ProgramSlot_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WellnessLog" ADD CONSTRAINT "WellnessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
