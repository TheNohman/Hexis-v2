export type Period = "1m" | "3m" | "6m" | "1y" | "all";

export const PERIODS: { key: Period; label: string }[] = [
  { key: "1m", label: "1M" },
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "1y", label: "1A" },
  { key: "all", label: "Tout" },
];

export function monthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

export function filterByPeriod<T extends { date: Date }>(
  entries: T[],
  period: Period,
): T[] {
  if (period === "all") return entries;
  const since =
    period === "1m" ? monthsAgo(1) :
    period === "3m" ? monthsAgo(3) :
    period === "6m" ? monthsAgo(6) :
    monthsAgo(12);
  return entries.filter((e) => new Date(e.date) >= since);
}

export const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

export const dateFmtFull = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
