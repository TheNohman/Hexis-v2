/**
 * Format a day index as "Jour N" (1-indexed for display).
 */
export function dayLabel(day: number): string {
  return `Jour ${day + 1}`;
}

/**
 * Format slot display: "Jour 3 — 18:00"
 */
export function formatSlotTime(day: number, startTime: string | null): string {
  const d = dayLabel(day);
  return startTime ? `${d} \u2014 ${startTime}` : d;
}

/**
 * Format a cycle index as "Cycle N" (1-indexed).
 */
export function cycleLabel(cycle: number): string {
  return `Cycle ${cycle + 1}`;
}
