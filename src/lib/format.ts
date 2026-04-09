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
