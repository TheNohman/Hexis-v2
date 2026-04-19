// Shared stats types — extracted so consumers can import them without
// pulling in the full query module.

export type RecentExercise = {
  exerciseId: string;
  name: string;
  lastUsedAt: Date;
};

export type WeekActivity = {
  /** ISO week start date (Monday) as YYYY-MM-DD */
  weekStart: string;
  count: number;
};

export type WeekVolume = {
  weekStart: string;
  volume: number;
};

export type PersonalRecord = {
  exerciseId: string;
  name: string;
  maxWeight: number;
  /** Reps achieved at that max weight (best single DONE set). */
  reps: number | null;
  /** Date the record was set (workout startedAt or ExerciseMax.achievedAt). */
  date: Date;
};

/**
 * A pair of period deltas (last 30 days vs the previous 30 days).
 * Used to annotate every hero/summary metric with context.
 */
export type PeriodDelta = {
  current: number;
  previous: number;
  /** +0.18 means +18%; null when the previous window had no data. */
  changePct: number | null;
};

export type WorkoutStats = {
  totalWorkouts: number;
  totalFinished: number;
  totalEntries: number;
  totalSetsDone: number;
  avgDurationMins: number | null;
  totalVolume: number;

  /** 30-day windows — used for hero + card deltas. */
  volumeLast30d: number;
  volumePrev30d: number;
  workoutsLast30d: PeriodDelta;
  finishedLast30d: PeriodDelta;
  setsLast30d: PeriodDelta;
  avgDurationLast30d: PeriodDelta;

  recentExercises: RecentExercise[];
  weeklyActivity: WeekActivity[];
  weeklyVolume: WeekVolume[];
  personalRecords: PersonalRecord[];
};
