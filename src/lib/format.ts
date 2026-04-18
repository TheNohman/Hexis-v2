/**
 * Format utilities shared between the UI layers.
 */

/**
 * Format a duration stored in seconds into a short human string:
 *   45s, 2m30, 1h15
 */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || Number.isNaN(totalSeconds)) return "";
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  if (minutes < 60) {
    return seconds === 0 ? `${minutes}min` : `${minutes}m${String(seconds).padStart(2, "0")}`;
  }
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes === 0 ? `${hours}h` : `${hours}h${String(remMinutes).padStart(2, "0")}`;
}

/**
 * Convert seconds to the HH:MM:SS string expected by
 * <input type="time" step="1">.
 */
export function secondsToTimeString(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || Number.isNaN(totalSeconds)) return "";
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/**
 * Parse an HH:MM or HH:MM:SS string (as emitted by <input type="time">) into seconds.
 * Returns null on empty or invalid input.
 */
export function timeStringToSeconds(value: string): number | null {
  if (!value) return null;
  const parts = value.split(":");
  if (parts.length < 2 || parts.length > 3) return null;
  const nums = parts.map((p) => parseInt(p, 10));
  if (nums.some((n) => Number.isNaN(n))) return null;
  const [h, m, s = 0] = nums;
  const total = h * 3600 + m * 60 + s;
  return total > 0 ? total : null;
}

/**
 * Compute a workout's duration in minutes from its timestamps.
 * Returns null when not finished yet. One decimal precision.
 */
export function computeDurationMins(
  startedAt: Date | null | undefined,
  finishedAt: Date | null | undefined,
): number | null {
  if (!startedAt || !finishedAt) return null;
  return Math.round(((finishedAt.getTime() - startedAt.getTime()) / 60000) * 10) / 10;
}

/** "jeu. 16 avr., 20:05" — short weekday + short month + time. */
export function formatShortDateTime(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** "jeudi 16 avril 2026" — long weekday + long month + year. */
export function formatLongDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/**
 * French relative label for a past date: "aujourd'hui", "hier",
 * "il y a N jours" up to 7 days. Beyond that, falls back to a short
 * numeric date ("16 avr.").
 */
export function formatRelative(d: Date): string {
  const now = new Date();
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(d)) / (24 * 60 * 60 * 1000),
  );
  if (diffDays <= 0) return "aujourd'hui";
  if (diffDays === 1) return "hier";
  if (diffDays < 7) return `il y a ${diffDays} jours`;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(d);
}

/**
 * Format an exercise type label in French.
 */
export function formatExerciseType(
  type: "STRENGTH" | "BODYWEIGHT" | "CARDIO" | "MOBILITY" | "REST",
): string {
  switch (type) {
    case "STRENGTH":
      return "Musculation";
    case "BODYWEIGHT":
      return "Poids de corps";
    case "CARDIO":
      return "Cardio";
    case "MOBILITY":
      return "Mobilité";
    case "REST":
      return "Repos";
  }
}
