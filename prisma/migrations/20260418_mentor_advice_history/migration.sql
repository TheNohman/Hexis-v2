-- Historique des conseils IA (une ligne par génération réussie)
CREATE TABLE "MentorAdvice" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "content"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MentorAdvice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MentorAdvice_userId_createdAt_idx" ON "MentorAdvice" ("userId", "createdAt");

ALTER TABLE "MentorAdvice"
  ADD CONSTRAINT "MentorAdvice_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
