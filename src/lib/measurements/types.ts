export const MEASUREMENT_TYPES = [
  "tour_de_taille",
  "tour_de_bras",
  "tour_de_hanches",
  "tour_de_poitrine",
  "tour_de_cuisses",
  "tour_de_mollets",
] as const;

export type MeasurementType = (typeof MEASUREMENT_TYPES)[number];

export const MEASUREMENT_LABELS: Record<MeasurementType, string> = {
  tour_de_taille: "Tour de taille",
  tour_de_bras: "Tour de bras",
  tour_de_hanches: "Tour de hanches",
  tour_de_poitrine: "Tour de poitrine",
  tour_de_cuisses: "Tour de cuisses",
  tour_de_mollets: "Tour de mollets",
};

export type MeasurementData = {
  id: string;
  type: string;
  date: Date;
  valueCm: number;
  notes: string | null;
};
