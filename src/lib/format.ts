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
 * Parse a duration string ("45", "2m30", "1h15", "90s") into seconds.
 * Returns null on invalid input.
 */
export function parseDuration(input: string): number | null {
  const str = input.trim().toLowerCase();
  if (!str) return null;

  // Plain number => seconds
  if (/^\d+(\.\d+)?$/.test(str)) {
    return Math.round(parseFloat(str));
  }

  // h/m/s composite, e.g. "1h30", "2m15", "90s", "1h15m30s"
  const match = str.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (match) {
    const [, h, m, s] = match;
    if (!h && !m && !s) return null;
    return (
      (parseInt(h || "0", 10) * 3600) +
      (parseInt(m || "0", 10) * 60) +
      parseInt(s || "0", 10)
    );
  }

  return null;
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
