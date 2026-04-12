CREATE TABLE "BodyMeasurement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "valueCm" DOUBLE PRECISION NOT NULL,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BodyMeasurement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BodyMeasurement_userId_type_date_key" ON "BodyMeasurement"("userId", "type", "date");
CREATE INDEX "BodyMeasurement_userId_type_idx" ON "BodyMeasurement"("userId", "type");
CREATE INDEX "BodyMeasurement_date_idx" ON "BodyMeasurement"("date");

ALTER TABLE "BodyMeasurement" ADD CONSTRAINT "BodyMeasurement_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
