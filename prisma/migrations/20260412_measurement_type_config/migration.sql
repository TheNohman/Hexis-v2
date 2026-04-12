-- Table config types de mesures (configurables par utilisateur)
CREATE TABLE "MeasurementTypeConfig" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "slug"      TEXT NOT NULL,
    "label"     TEXT NOT NULL,
    "unit"      TEXT NOT NULL DEFAULT 'cm',
    "color"     TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archived"  BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MeasurementTypeConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MeasurementTypeConfig_userId_slug_key" ON "MeasurementTypeConfig"("userId", "slug");
CREATE INDEX "MeasurementTypeConfig_userId_idx" ON "MeasurementTypeConfig"("userId");

ALTER TABLE "MeasurementTypeConfig" ADD CONSTRAINT "MeasurementTypeConfig_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Renommer valueCm -> value
ALTER TABLE "BodyMeasurement" RENAME COLUMN "valueCm" TO "value";

-- Seed configs pour les types existants
INSERT INTO "MeasurementTypeConfig" ("id", "userId", "slug", "label", "unit", "sortOrder")
SELECT
    gen_random_uuid()::text,
    bm."userId",
    bm."type",
    CASE bm."type"
        WHEN 'tour_de_taille' THEN 'Tour de taille'
        WHEN 'tour_de_bras' THEN 'Tour de bras'
        WHEN 'tour_de_hanches' THEN 'Tour de hanches'
        WHEN 'tour_de_poitrine' THEN 'Tour de poitrine'
        WHEN 'tour_de_cuisses' THEN 'Tour de cuisses'
        WHEN 'tour_de_mollets' THEN 'Tour de mollets'
        ELSE bm."type"
    END,
    'cm',
    ROW_NUMBER() OVER (PARTITION BY bm."userId" ORDER BY bm."type")
FROM (SELECT DISTINCT "userId", "type" FROM "BodyMeasurement") bm
ON CONFLICT DO NOTHING;
