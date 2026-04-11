-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('PLANNED', 'DONE', 'SKIPPED');

-- AlterTable: Workout — add templateId
ALTER TABLE "Workout" ADD COLUMN "templateId" TEXT;

-- AlterTable: WorkoutEntry — add status, completedAt, restDurationSecs
ALTER TABLE "WorkoutEntry" ADD COLUMN "status" "EntryStatus" NOT NULL DEFAULT 'DONE';
ALTER TABLE "WorkoutEntry" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "WorkoutEntry" ADD COLUMN "restDurationSecs" INTEGER;

-- AlterTable: EntryKpiValue — add plannedNumeric, plannedText
ALTER TABLE "EntryKpiValue" ADD COLUMN "plannedNumeric" DOUBLE PRECISION;
ALTER TABLE "EntryKpiValue" ADD COLUMN "plannedText" TEXT;

-- CreateTable
CREATE TABLE "WorkoutTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutTemplateBlock" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutTemplateBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutTemplateEntry" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "restDurationSecs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutTemplateEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateEntryKpiValue" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "kpiDefinitionId" TEXT NOT NULL,
    "valueNumeric" DOUBLE PRECISION,
    "valueText" TEXT,

    CONSTRAINT "TemplateEntryKpiValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Workout_templateId_idx" ON "Workout"("templateId");

-- CreateIndex
CREATE INDEX "WorkoutTemplate_userId_idx" ON "WorkoutTemplate"("userId");

-- CreateIndex
CREATE INDEX "WorkoutTemplateBlock_templateId_idx" ON "WorkoutTemplateBlock"("templateId");

-- CreateIndex
CREATE INDEX "WorkoutTemplateEntry_blockId_idx" ON "WorkoutTemplateEntry"("blockId");

-- CreateIndex
CREATE INDEX "WorkoutTemplateEntry_exerciseId_idx" ON "WorkoutTemplateEntry"("exerciseId");

-- CreateIndex
CREATE INDEX "TemplateEntryKpiValue_entryId_idx" ON "TemplateEntryKpiValue"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateEntryKpiValue_entryId_kpiDefinitionId_key" ON "TemplateEntryKpiValue"("entryId", "kpiDefinitionId");

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplateBlock" ADD CONSTRAINT "WorkoutTemplateBlock_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplateEntry" ADD CONSTRAINT "WorkoutTemplateEntry_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "WorkoutTemplateBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplateEntry" ADD CONSTRAINT "WorkoutTemplateEntry_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateEntryKpiValue" ADD CONSTRAINT "TemplateEntryKpiValue_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "WorkoutTemplateEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateEntryKpiValue" ADD CONSTRAINT "TemplateEntryKpiValue_kpiDefinitionId_fkey" FOREIGN KEY ("kpiDefinitionId") REFERENCES "KpiDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
