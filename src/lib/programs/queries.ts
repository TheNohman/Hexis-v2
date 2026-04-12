import { prisma } from "@/lib/prisma";
import type {
  ProgramListItem,
  ProgramDetail,
  ActiveProgramInfo,
} from "./types";

// --------------- List programs ---------------

export async function listPrograms(
  userId: string,
): Promise<ProgramListItem[]> {
  const programs = await prisma.program.findMany({
    where: { userId },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    include: { _count: { select: { slots: true } } },
  });

  return programs.map((p) => ({
    id: p.id,
    name: p.name,
    weekCount: p.weekCount,
    isActive: p.isActive,
    currentWeek: p.currentWeek,
    currentDay: p.currentDay,
    slotCount: p._count.slots,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}

// --------------- Get program detail ---------------

export async function getProgramById(
  programId: string,
  userId: string,
): Promise<ProgramDetail> {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: {
      slots: {
        orderBy: [{ week: "asc" }, { day: "asc" }],
        include: { template: { select: { name: true } } },
      },
    },
  });

  if (!program || program.userId !== userId) {
    throw new Error("Forbidden");
  }

  return {
    id: program.id,
    name: program.name,
    weekCount: program.weekCount,
    isActive: program.isActive,
    currentWeek: program.currentWeek,
    currentDay: program.currentDay,
    slots: program.slots.map((s) => ({
      id: s.id,
      week: s.week,
      day: s.day,
      label: s.label,
      templateId: s.templateId,
      templateName: s.template?.name ?? null,
    })),
    createdAt: program.createdAt,
    updatedAt: program.updatedAt,
  };
}

// --------------- Get active program ---------------

export async function getActiveProgram(
  userId: string,
): Promise<ActiveProgramInfo | null> {
  const program = await prisma.program.findFirst({
    where: { userId, isActive: true },
    include: {
      slots: {
        include: { template: { select: { name: true } } },
      },
    },
  });

  if (!program) return null;

  const currentSlotData = program.slots.find(
    (s) => s.week === program.currentWeek && s.day === program.currentDay,
  );

  return {
    programId: program.id,
    programName: program.name,
    weekCount: program.weekCount,
    currentWeek: program.currentWeek,
    currentDay: program.currentDay,
    currentSlot: currentSlotData
      ? {
          id: currentSlotData.id,
          label: currentSlotData.label,
          templateId: currentSlotData.templateId,
          templateName: currentSlotData.template?.name ?? null,
        }
      : null,
  };
}

// --------------- Get last workout for a slot ---------------

export async function getLastWorkoutForSlot(
  programId: string,
  week: number,
  day: number,
): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM   "Workout"
    WHERE  "programId" = ${programId}
      AND  "programWeek" = ${week}
      AND  "programDay" = ${day}
      AND  "finishedAt" IS NOT NULL
    ORDER BY "startedAt" DESC
    LIMIT 1
  `;

  return rows[0]?.id ?? null;
}
