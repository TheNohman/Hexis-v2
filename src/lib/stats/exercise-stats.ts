import { prisma } from "@/lib/prisma";

// --------------- Types ---------------

export type PersonalRecord = {
  type: "max_weight" | "max_volume" | "max_reps" | "best_time";
  value: number;
  unit: string;
  date: Date;
  workoutName: string;
};

export type ProgressionPoint = {
  date: Date;
  value: number;
  volume: number | null;
  reps: number | null;
  workoutId: string;
};

// --------------- Helpers ---------------

type RawEntryRow = {
  entry_id: string;
  workout_id: string;
  workout_name: string;
  workout_date: Date;
  exercise_type: string;
  kpi_slug: string;
  value_numeric: number | null;
};

async function fetchDoneEntries(
  userId: string,
  exerciseId: string,
  since?: Date,
): Promise<RawEntryRow[]> {
  const sinceClause = since
    ? `AND wo."startedAt" >= '${since.toISOString()}'`
    : "";

  return prisma.$queryRawUnsafe<RawEntryRow[]>(`
    SELECT e."id"          AS entry_id,
           wo."id"         AS workout_id,
           wo."name"       AS workout_name,
           wo."startedAt"  AS workout_date,
           ex."type"       AS exercise_type,
           kd."slug"       AS kpi_slug,
           v."valueNumeric" AS value_numeric
    FROM   "WorkoutEntry" e
    JOIN   "WorkoutBlock" b ON b."id" = e."blockId"
    JOIN   "Workout" wo ON wo."id" = b."workoutId"
    JOIN   "Exercise" ex ON ex."id" = e."exerciseId"
    JOIN   "EntryKpiValue" v ON v."entryId" = e."id"
    JOIN   "KpiDefinition" kd ON kd."id" = v."kpiDefinitionId"
    WHERE  wo."userId" = $1
      AND  e."exerciseId" = $2
      AND  e."status" = 'DONE'
      AND  e."isWarmup" = false
      ${sinceClause}
    ORDER BY wo."startedAt" ASC, e."displayOrder" ASC
  `, userId, exerciseId);
}

type EntryData = {
  entryId: string;
  workoutId: string;
  workoutName: string;
  workoutDate: Date;
  exerciseType: string;
  kpis: Map<string, number>;
};

function groupByEntry(rows: RawEntryRow[]): EntryData[] {
  const map = new Map<string, EntryData>();
  for (const row of rows) {
    let entry = map.get(row.entry_id);
    if (!entry) {
      entry = {
        entryId: row.entry_id,
        workoutId: row.workout_id,
        workoutName: row.workout_name,
        workoutDate: row.workout_date,
        exerciseType: row.exercise_type,
        kpis: new Map(),
      };
      map.set(row.entry_id, entry);
    }
    if (row.value_numeric != null) {
      entry.kpis.set(row.kpi_slug, row.value_numeric);
    }
  }
  return Array.from(map.values());
}

// --------------- Personal Records ---------------

export async function getExercisePersonalRecords(
  userId: string,
  exerciseId: string,
): Promise<PersonalRecord[]> {
  const rows = await fetchDoneEntries(userId, exerciseId);
  const entries = groupByEntry(rows);
  if (entries.length === 0) return [];

  const exerciseType = entries[0].exerciseType;
  const prs: PersonalRecord[] = [];

  if (exerciseType === "STRENGTH" || exerciseType === "BODYWEIGHT") {
    // Max weight
    let maxWeight: { value: number; date: Date; workoutName: string } | null = null;
    // Max volume (weight * reps)
    let maxVolume: { value: number; date: Date; workoutName: string } | null = null;
    // Max reps
    let maxReps: { value: number; date: Date; workoutName: string } | null = null;

    for (const entry of entries) {
      const weight = entry.kpis.get("weight_kg") ?? 0;
      const reps = entry.kpis.get("reps") ?? 0;
      const volume = weight * reps;

      if (weight > 0 && (!maxWeight || weight > maxWeight.value)) {
        maxWeight = { value: weight, date: entry.workoutDate, workoutName: entry.workoutName };
      }
      if (volume > 0 && (!maxVolume || volume > maxVolume.value)) {
        maxVolume = { value: volume, date: entry.workoutDate, workoutName: entry.workoutName };
      }
      if (reps > 0 && (!maxReps || reps > maxReps.value)) {
        maxReps = { value: reps, date: entry.workoutDate, workoutName: entry.workoutName };
      }
    }

    if (maxWeight) {
      prs.push({
        type: "max_weight",
        value: maxWeight.value,
        unit: "kg",
        date: maxWeight.date,
        workoutName: maxWeight.workoutName,
      });
    }
    if (maxVolume) {
      prs.push({
        type: "max_volume",
        value: maxVolume.value,
        unit: "kg",
        date: maxVolume.date,
        workoutName: maxVolume.workoutName,
      });
    }
    if (maxReps) {
      prs.push({
        type: "max_reps",
        value: maxReps.value,
        unit: "reps",
        date: maxReps.date,
        workoutName: maxReps.workoutName,
      });
    }
  } else if (exerciseType === "CARDIO") {
    // Best (lowest) pace = duration / distance (if both exist)
    let bestTime: { value: number; date: Date; workoutName: string } | null = null;
    let longestDistance: { value: number; date: Date; workoutName: string } | null = null;
    let longestDuration: { value: number; date: Date; workoutName: string } | null = null;

    for (const entry of entries) {
      const duration = entry.kpis.get("duration_sec") ?? 0;
      const distance = entry.kpis.get("distance_m") ?? 0;

      if (distance > 0 && duration > 0) {
        const pace = duration / distance; // lower is better
        if (!bestTime || pace < bestTime.value) {
          bestTime = { value: pace, date: entry.workoutDate, workoutName: entry.workoutName };
        }
      }
      if (distance > 0 && (!longestDistance || distance > longestDistance.value)) {
        longestDistance = { value: distance, date: entry.workoutDate, workoutName: entry.workoutName };
      }
      if (duration > 0 && (!longestDuration || duration > longestDuration.value)) {
        longestDuration = { value: duration, date: entry.workoutDate, workoutName: entry.workoutName };
      }
    }

    if (bestTime) {
      prs.push({
        type: "best_time",
        value: Math.round(bestTime.value * 1000) / 1000,
        unit: "s/m",
        date: bestTime.date,
        workoutName: bestTime.workoutName,
      });
    }
    if (longestDistance) {
      prs.push({
        type: "max_reps", // reuse as "max distance"
        value: longestDistance.value,
        unit: "m",
        date: longestDistance.date,
        workoutName: longestDistance.workoutName,
      });
    }
    if (longestDuration) {
      prs.push({
        type: "max_volume", // reuse as "max duration"
        value: longestDuration.value,
        unit: "s",
        date: longestDuration.date,
        workoutName: longestDuration.workoutName,
      });
    }
  }

  return prs;
}

// --------------- Progression ---------------

export async function getExerciseProgression(
  userId: string,
  exerciseId: string,
  months = 3,
): Promise<ProgressionPoint[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const rows = await fetchDoneEntries(userId, exerciseId, since);
  const entries = groupByEntry(rows);
  if (entries.length === 0) return [];

  const exerciseType = entries[0].exerciseType;

  // Group entries by workout
  const workoutMap = new Map<
    string,
    { workoutId: string; date: Date; entries: EntryData[] }
  >();
  for (const entry of entries) {
    let group = workoutMap.get(entry.workoutId);
    if (!group) {
      group = {
        workoutId: entry.workoutId,
        date: entry.workoutDate,
        entries: [],
      };
      workoutMap.set(entry.workoutId, group);
    }
    group.entries.push(entry);
  }

  const points: ProgressionPoint[] = [];

  for (const group of workoutMap.values()) {
    if (exerciseType === "STRENGTH" || exerciseType === "BODYWEIGHT") {
      // Best set = highest weight (or highest volume if same weight)
      let bestWeight = 0;
      let bestVolume = 0;
      let bestReps = 0;

      for (const entry of group.entries) {
        const weight = entry.kpis.get("weight_kg") ?? 0;
        const reps = entry.kpis.get("reps") ?? 0;
        const volume = weight * reps;

        if (
          weight > bestWeight ||
          (weight === bestWeight && volume > bestVolume)
        ) {
          bestWeight = weight;
          bestVolume = volume;
          bestReps = reps;
        }
      }

      points.push({
        date: group.date,
        value: bestWeight,
        volume: bestVolume > 0 ? bestVolume : null,
        reps: bestReps > 0 ? bestReps : null,
        workoutId: group.workoutId,
      });
    } else if (exerciseType === "CARDIO") {
      // Best distance or duration
      let bestDistance = 0;
      let bestDuration = 0;

      for (const entry of group.entries) {
        const distance = entry.kpis.get("distance_m") ?? 0;
        const duration = entry.kpis.get("duration_sec") ?? 0;
        if (distance > bestDistance) bestDistance = distance;
        if (duration > bestDuration) bestDuration = duration;
      }

      points.push({
        date: group.date,
        value: bestDistance > 0 ? bestDistance : bestDuration,
        volume: null,
        reps: null,
        workoutId: group.workoutId,
      });
    }
  }

  // Sort by date ascending
  points.sort((a, b) => a.date.getTime() - b.date.getTime());

  return points;
}
