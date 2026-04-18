/**
 * Compute the next displayOrder for an item appended at the end of a
 * sortable list. Works with any { displayOrder: number } items.
 * Returns 0 when the list is empty.
 */
export function nextDisplayOrder<T extends { displayOrder: number }>(
  items: T[],
): number {
  if (items.length === 0) return 0;
  return Math.max(...items.map((i) => i.displayOrder)) + 1;
}
