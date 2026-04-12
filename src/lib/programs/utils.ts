export const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;
export const DAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

export function dayLabel(day: number): string {
  return DAY_NAMES[day] ?? `Jour ${day}`;
}

export function dayShort(day: number): string {
  return DAY_SHORT[day] ?? `J${day}`;
}

export function formatSlotTime(day: number, startTime: string | null): string {
  const d = dayLabel(day);
  return startTime ? `${d} ${startTime}` : d;
}
