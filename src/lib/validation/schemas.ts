import { z } from "zod";

export function assertValid<T>(schema: z.ZodType<T>, input: unknown): T {
  const res = schema.safeParse(input);
  if (!res.success) {
    const first = res.error.issues[0];
    const path = first?.path.length ? first.path.join(".") + ": " : "";
    throw new Error(`Validation: ${path}${first?.message ?? "invalid input"}`);
  }
  return res.data;
}

export const idSchema = z
  .string()
  .min(1, "id required")
  .max(64, "id too long")
  .regex(/^[a-z0-9]+$/i, "id must be alphanumeric");

export const nameSchema = z.string().trim().min(1).max(500);
export const optionalNameSchema = z.string().trim().max(500).optional();
export const notesSchema = z.string().max(500);
export const medicalNotesSchema = z.string().max(2000);
export const positiveNumber = z.number().finite().nonnegative();
export const strictlyPositiveNumber = z.number().finite().positive();

export const isoDateSchema = z.string().refine(
  (s) => !Number.isNaN(new Date(s).getTime()),
  "invalid date",
);

export const weekdaySchema = z.number().int().min(0).max(6);
/** Day-within-cycle index (0..cycleDays-1). cycleDays max is 30, so day ≤ 29. */
export const cycleDaySchema = z.number().int().min(0).max(29);
export const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "invalid time");

export const exerciseTypeEnum = z.enum(["STRENGTH", "BODYWEIGHT", "CARDIO", "MOBILITY", "REST"]);
export const primarySportEnum = z.enum(["STRENGTH_TRAINING", "POWERLIFTING", "ENDURANCE", "CROSSFIT_HIIT", "MULTI_SPORT"]);
export const sportLevelEnum = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "COMPETITIVE"]);
export const intervalFormatEnum = z.enum(["TABATA", "INTERVALS"]);
export const playbackOrderEnum = z.enum(["CYCLE", "SAME", "CUSTOM"]);

export const kpiValueInputSchema = z.object({
  kpiDefinitionId: idSchema,
  valueNumeric: z.number().finite().nullable().optional(),
  valueText: z.string().max(500).nullable().optional(),
  plannedNumeric: z.number().finite().nullable().optional(),
  plannedText: z.string().max(500).nullable().optional(),
}).passthrough();

export const kpiValuesArraySchema = z.array(kpiValueInputSchema).max(50);

export const bodyWeightInputSchema = z.object({
  date: isoDateSchema,
  weightKg: strictlyPositiveNumber.max(500),
  notes: notesSchema.optional(),
});

export const measurementInputSchema = z.object({
  type: z.string().trim().min(1).max(64),
  date: isoDateSchema,
  value: strictlyPositiveNumber.max(10000),
  notes: notesSchema.optional(),
});

export const measurementTypeCreateSchema = z.object({
  label: z.string().trim().min(1).max(100),
  unit: z.string().trim().min(1).max(20),
  color: z.string().max(20).optional(),
});

export const measurementTypeUpdateSchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
  unit: z.string().trim().min(1).max(20).optional(),
  color: z.string().max(20).nullable().optional(),
  archived: z.boolean().optional(),
});

export const wellnessUpsertSchema = z.object({
  date: isoDateSchema,
  mood: z.number().int().min(1).max(5),
  sleep: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5),
  stress: z.number().int().min(1).max(5),
  notes: notesSchema.nullable().optional(),
});

export const sportProfileInputSchema = z.object({
  primarySport: primarySportEnum,
  sportLevel: sportLevelEnum,
  sportObjective: z.string().max(500).nullable(),
  weeklySessionTarget: z.number().int().min(0).max(14).nullable(),
  sessionDurationMins: z.number().int().min(0).max(600).nullable(),
  equipmentAccess: z.array(z.string().max(64)).max(50),
  medicalNotes: medicalNotesSchema.nullable(),
  mentorEnabled: z.boolean(),
});

export const profileUpdateSchema = z.object({
  unitSystem: z.string().max(20).optional(),
  defaultRestSecs: z.number().int().min(0).max(3600).nullable().optional(),
  mentorEnabled: z.boolean().optional(),
  fcMax: z.number().int().min(0).max(250).nullable().optional(),
  fcResting: z.number().int().min(0).max(200).nullable().optional(),
  vmaKmh: z.number().min(0).max(40).nullable().optional(),
  ftp: z.number().int().min(0).max(2000).nullable().optional(),
  primarySport: primarySportEnum.nullable().optional(),
  sportLevel: sportLevelEnum.nullable().optional(),
  sportObjective: z.string().max(500).nullable().optional(),
  weeklySessionTarget: z.number().int().min(0).max(14).nullable().optional(),
  sessionDurationMins: z.number().int().min(0).max(600).nullable().optional(),
  equipmentAccess: z.array(z.string().max(64)).max(50).optional(),
  medicalNotes: medicalNotesSchema.nullable().optional(),
});

export const programSlotDataSchema = z.object({
  templateId: idSchema.nullable().optional(),
  day: cycleDaySchema.optional(),
  startTime: timeOfDaySchema.nullable().optional(),
  label: z.string().max(200).nullable().optional(),
});

export const intervalBlockSchema = z.object({
  name: nameSchema,
  format: intervalFormatEnum,
  workSecs: z.number().int().min(1).max(3600),
  restSecs: z.number().int().min(0).max(3600),
  roundCount: z.number().int().min(1).max(200),
  playbackOrder: playbackOrderEnum,
  exerciseIds: z.array(idSchema).min(1).max(50),
  customSequence: z.array(idSchema).max(200).optional(),
});
