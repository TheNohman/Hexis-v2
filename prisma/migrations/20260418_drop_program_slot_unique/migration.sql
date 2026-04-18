-- Allow multiple slots per day in a program (morning + evening, training + mobility, etc.)
-- The legacy unique index (programId, cycle, day) contradicts the new UX where a user
-- can stack multiple activities on the same calendar day.
-- Historically this was a bare unique INDEX (not a CONSTRAINT), so DROP INDEX is correct.
DROP INDEX IF EXISTS "ProgramSlot_programId_week_day_key";
