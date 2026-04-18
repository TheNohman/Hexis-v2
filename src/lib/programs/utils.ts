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
  return startTime ? `${d} — ${startTime}` : d;
}

/**
 * Format a cycle index as "Cycle N" (1-indexed).
 */
export function cycleLabel(cycle: number): string {
  return `Cycle ${cycle + 1}`;
}

/**
 * Compute the calendar date for a given (cycle, day) pair, anchored at the
 * program's `startDate`. Returns null if startDate is null (legacy programs).
 *
 * Formula: startDate + (cycle * cycleDays + day) days.
 * startDate should be the date the user wants cycle 1 day 1 to occur.
 */
export function computeSlotDate(
  startDate: Date | null,
  cycleDays: number,
  cycle: number,
  day: number,
): Date | null {
  if (!startDate) return null;
  const base = new Date(startDate);
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + cycle * cycleDays + day);
  return base;
}

const WEEKDAY_LONG = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

/**
 * Format a computed slot date as "Lundi 20 avril".
 */
export function formatSlotDate(date: Date): string {
  const weekday = WEEKDAY_LONG[date.getDay()];
  const day = date.getDate();
  const month = date.toLocaleString("fr-FR", { month: "long" });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${day} ${month}`;
}

/**
 * Short version: "Lun 20 avr." — for tight spaces like chips.
 */
export function formatSlotDateShort(date: Date): string {
  return date.toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * Compute the cycle's date range: [startDate + cycle*cycleDays, startDate + (cycle+1)*cycleDays - 1].
 * Returns null if startDate is null.
 */
export function computeCycleRange(
  startDate: Date | null,
  cycleDays: number,
  cycle: number,
): { from: Date; to: Date } | null {
  if (!startDate) return null;
  const from = computeSlotDate(startDate, cycleDays, cycle, 0);
  const to = computeSlotDate(startDate, cycleDays, cycle, cycleDays - 1);
  if (!from || !to) return null;
  return { from, to };
}

/**
 * Format a cycle range: "Semaine du 20 au 26 avril" / "Du 20 avr. au 2 mai"
 */
export function formatCycleRange(from: Date, to: Date): string {
  const fromMonth = from.toLocaleString("fr-FR", { month: "long" });
  const toMonth = to.toLocaleString("fr-FR", { month: "long" });
  const fromD = from.getDate();
  const toD = to.getDate();
  if (fromMonth === toMonth) {
    return `Du ${fromD} au ${toD} ${fromMonth}`;
  }
  return `Du ${fromD} ${fromMonth} au ${toD} ${toMonth}`;
}

/**
 * Is this date "today" in local time?
 */
export function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}
