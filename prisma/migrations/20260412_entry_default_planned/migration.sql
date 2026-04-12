-- Change default status for WorkoutEntry from DONE to PLANNED
ALTER TABLE "WorkoutEntry" ALTER COLUMN "status" SET DEFAULT 'PLANNED';
