import type {
  BlockMode,
  ExerciseType,
  IntervalFormat,
  KpiDataType,
  PlaybackOrder,
} from "@/generated/prisma/enums";

export type TemplateListItem = {
  id: string;
  name: string;
  blockCount: number;
  entryCount: number;
  updatedAt: Date;
};

export type TemplateDetail = {
  id: string;
  userId: string;
  name: string;
  blocks: {
    id: string;
    name: string;
    displayOrder: number;
    mode: BlockMode;
    intervalFormat: IntervalFormat | null;
    workSecs: number | null;
    restSecs: number | null;
    roundCount: number | null;
    playbackOrder: PlaybackOrder | null;
    countdownLeadSecs: number;
    entries: {
      id: string;
      displayOrder: number;
      restDurationSecs: number | null;
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
