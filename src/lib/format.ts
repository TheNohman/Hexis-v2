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
 * Parse a duration string into seconds. Returns null on invalid input.
 *
 * Accepted forms (case-insensitive):
 *   "45"        => 45s  (plain number)
 *   "45s"       => 45s
 *   "45m"       => 45min
 *   "45min"     => 45min
 *   "1h"        => 1h
 *   "2m30"      => 2m 30s   (trailing digits inferred as next-smaller unit)
 *   "2m30s"     => 2m 30s
 *   "1h15"      => 1h 15min
 *   "1h15m"     => 1h 15min
 *   "1h15m30"   => 1h 15m 30s
 *   "1h15m30s"  => 1h 15m 30s
 */
export function parseDuration(input: string): number | null {
  let str = input.trim().toLowerCase();
  if (!str) return null;

  // Plain number => seconds
  if (/^\d+(\.\d+)?$/.test(str)) {
    return Math.round(parseFloat(str));
  }

  // Normalise "min" aliases to "m" before processing
  str = str.replace(/min/g, "m");

  // Trailing digits with no unit: infer the next-smaller unit from the
  // last-seen unit letter. e.g. "2m30" -> "2m30s", "1h15" -> "1h15m".
  if (/\d$/.test(str)) {
    const letters = str.match(/[hms]/g);
    const lastUnit = letters ? letters[letters.length - 1] : null;
    if (lastUnit === "h") str += "m";
    else if (lastUnit === "m") str += "s";
    // No unit at all is already handled by the plain-number branch above.
  }

  // h/m/s composite
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
