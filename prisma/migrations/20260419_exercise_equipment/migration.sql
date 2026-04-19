-- Per-exercise granular equipment tags. Optional, read by the AI to filter
-- exercises against the user's `sportProfile.equipmentAccess` bundles.
ALTER TABLE "Exercise"
  ADD COLUMN "equipment" TEXT[] DEFAULT '{}' NOT NULL;
