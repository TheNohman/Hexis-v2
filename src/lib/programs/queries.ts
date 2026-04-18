import { prisma } from "@/lib/prisma";
import type {
  ProgramListItem,
  ProgramDetail,
  ActiveProgramInfo,
} from "./types";

export async function listPrograms(userId: string): Promise<ProgramListItem[]> {
  const programs = await prisma.program.findMany({
    where: { userId },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    include: { _count: { select: { slots: true } } },
  });

  return programs.map((p) => ({
    id: p.id,
    name: p.name,
    cycleCount: p.cycleCount,
    cycleDays: p.cycleDays,
    isActive: p.isActive,
    currentSlotId: p.currentSlotId,
    slotCount: p._count.slots,
    startDate: p.startDate,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}

export async function getProgramById(programId: string, userId: string): Promise<ProgramDetail> {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: {
      slots: {
        orderBy: [{ cycle: "asc" }, { day: "asc" }, { startTime: "asc" }],
        include: { template: { select: { name: true } } },
      },
    },
  });

  if (!program || program.userId !== userId) throw new Error("Forbidden");

  return {
    id: program.id,
    name: program.name,
    cycleCount: program.cycleCount,
    cycleDays: program.cycleDays,
    isActive: program.isActive,
    currentSlotId: program.currentSlotId,
    startDate: program.startDate,
    slots: program.slots.map((s) => ({
      id: s.id,
      cycle: s.cycle,
      day: s.day,
      startTime: s.startTime,
      label: s.label,
      templateId: s.templateId,
      templateName: s.template?.name ?? null,
    })),
    createdAt: program.createdAt,
    updatedAt: program.updatedAt,
  };
}

export async function getActiveProgram(userId: string): Promise<ActiveProgramInfo | null> {
  const program = await prisma.program.findFirst({
    where: { userId, isActive: true },
    include: {
      currentSlot: {
        include: { template: { select: { name: true } } },
      },
      slots: {
        where: { templateId: { not: null } },
        orderBy: [{ cycle: "asc" }, { day: "asc" }, { startTime: "asc" }],
        include: { template: { select: { name: true } } },
      },
    },
  });

  if (!program) return null;

  return {
    programId: program.id,
    programName: program.name,
    cycleCount: program.cycleCount,
    cycleDays: program.cycleDays,
    currentSlot: program.currentSlot
      ? {
          id: program.currentSlot.id,
          cycle: program.currentSlot.cycle,
          day: program.currentSlot.day,
          startTime: program.currentSlot.startTime,
          label: program.currentSlot.label,
          templateId: program.currentSlot.templateId,
          templateName: program.currentSlot.template?.name ?? null,
        }
      : null,
    allSlots: program.slots.map((s) => ({
      id: s.id,
      cycle: s.cycle,
      day: s.day,
      startTime: s.startTime,
      label: s.label,
      templateId: s.templateId,
      templateName: s.template?.name ?? null,
    })),
    startDate: program.startDate,
  };
}
