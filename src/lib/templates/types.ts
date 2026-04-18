import type {
  BlockMode,
  ExerciseType,
  IntervalFormat,
  KpiDataType,
  PlaybackOrder,
  TemplateSource,
} from "@/generated/prisma/enums";

export type TemplateListItem = {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  source: TemplateSource;
  isFavorite: boolean;
  blockCount: number;
  entryCount: number;
  /** How many program slots reference this template — discoverability. */
  programUsageCount: number;
  /** Roughly-estimated total duration in seconds (sum of rest + ~45s per strength set + durations). */
  estimatedDurationSecs: number;
  updatedAt: Date;
};

export type TemplateDetail = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  tags: string[];
  source: TemplateSource;
  isFavorite: boolean;
  programUsageCount: number;
  estimatedDurationSecs: number;
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
    customSequence: string[];
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
