-- Système d'événements in-app pour télémétrie (aucune infra externe).
-- Chaque ligne décrit un évènement applicatif (ex: workout_finished, pr_detected).
-- Le payload JSON est libre — on évolue sans migration pour les métadonnées.
CREATE TABLE "AppEvent" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT,
  "name"      TEXT NOT NULL,
  "payload"   JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AppEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppEvent_userId_createdAt_idx" ON "AppEvent" ("userId", "createdAt");
CREATE INDEX "AppEvent_name_createdAt_idx" ON "AppEvent" ("name", "createdAt");

ALTER TABLE "AppEvent"
  ADD CONSTRAINT "AppEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
