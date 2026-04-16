-- Endurance reference values used to derive training zones, target
-- paces, and %FC/%FTP targets.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fcMax"     INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fcResting" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "vmaKmh"    DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ftp"       INTEGER;
