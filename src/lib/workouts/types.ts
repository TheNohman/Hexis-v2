import type { ExerciseType, KpiDataType } from "@/generated/prisma/enums";

export type KpiValueInput = {
  kpiDefinitionId: string;
  valueNumeric?: number | null;
  valueText?: string | null;
};

export type ExerciseListItem = {
  id: string;
  slug: string;
  name: string;
  type: ExerciseType;
  isSystem: boolean;
  description: string | null;
  kpis: {
    id: string;
    kpiDefinitionId: string;
    slug: string;
    name: string;
    unit: string | null;
    dataType: KpiDataType;
    isRequired: boolean;
    displayOrder: number;
  }[];
};

export type WorkoutListItem = {
  id: string;
  name: string;
  startedAt: Date;
  finishedAt: Date | null;
  blockCount: number;
  entryCount: number;
};

export type WorkoutDetail = {
  id: string;
  userId: string;
  name: string;
  startedAt: Date;
  finishedAt: Date | null;
  notes: string | null;
  blocks: {
    id: string;
    name: string;
    displayOrder: number;
    entries: {
      id: string;
      displayOrder: number;
      exercise: {
        id: string;
        slug: string;
        name: string;
        type: ExerciseType;
      };
      values: {
        kpiDefinitionId: string;
        kpiSlug: string;
        kpiName: string;
        unit: string | null;
        dataType: KpiDataType;
        valueNumeric: number | null;
        valueText: string | null;
      }[];
    }[];
  }[];
};
