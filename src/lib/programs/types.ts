// --------------- Types ---------------

export type ProgramListItem = {
  id: string;
  name: string;
  weekCount: number;
  isActive: boolean;
  currentWeek: number;
  currentDay: number;
  slotCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ProgramSlotDetail = {
  id: string;
  week: number;
  day: number;
  label: string | null;
  templateId: string | null;
  templateName: string | null;
};

export type ProgramDetail = {
  id: string;
  name: string;
  weekCount: number;
  isActive: boolean;
  currentWeek: number;
  currentDay: number;
  slots: ProgramSlotDetail[];
  createdAt: Date;
  updatedAt: Date;
};

export type ActiveProgramInfo = {
  programId: string;
  programName: string;
  weekCount: number;
  currentWeek: number;
  currentDay: number;
  currentSlot: {
    id: string;
    label: string | null;
    templateId: string | null;
    templateName: string | null;
  } | null;
};
