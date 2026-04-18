// --------------- Types ---------------

export type ProgramListItem = {
  id: string;
  name: string;
  cycleCount: number;
  cycleDays: number;
  isActive: boolean;
  currentSlotId: string | null;
  slotCount: number;
  startDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProgramSlotDetail = {
  id: string;
  cycle: number;
  day: number; // 0-indexed (0..cycleDays-1)
  startTime: string | null;
  label: string | null;
  templateId: string | null;
  templateName: string | null;
};

export type ProgramDetail = {
  id: string;
  name: string;
  description: string | null;
  cycleCount: number;
  cycleDays: number;
  isActive: boolean;
  currentSlotId: string | null;
  startDate: Date | null;
  slots: ProgramSlotDetail[];
  createdAt: Date;
  updatedAt: Date;
};

export type ActiveProgramInfo = {
  programId: string;
  programName: string;
  cycleCount: number;
  cycleDays: number;
  currentSlot: {
    id: string;
    cycle: number;
    day: number;
    startTime: string | null;
    label: string | null;
    templateId: string | null;
    templateName: string | null;
  } | null;
  /** All program slots that have a template assigned — for the "choose another
   * session" picker on the dashboard. */
  allSlots: ProgramSlotDetail[];
  /** Anchor date for cycle 1 day 1 (null = legacy, dates disabled). */
  startDate: Date | null;
};
