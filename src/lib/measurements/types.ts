/** Suggestions par défaut pour les nouveaux utilisateurs */
export const DEFAULT_MEASUREMENT_SUGGESTIONS = [
  { slug: "tour_de_taille", label: "Tour de taille", unit: "cm" },
  { slug: "tour_de_bras", label: "Tour de bras", unit: "cm" },
  { slug: "tour_de_hanches", label: "Tour de hanches", unit: "cm" },
  { slug: "tour_de_poitrine", label: "Tour de poitrine", unit: "cm" },
  { slug: "tour_de_cuisses", label: "Tour de cuisses", unit: "cm" },
  { slug: "tour_de_mollets", label: "Tour de mollets", unit: "cm" },
] as const;

export const COMMON_UNITS = ["cm", "mm", "kg", "%", "in"] as const;

export type MeasurementData = {
  id: string;
  type: string;
  date: Date;
  value: number;
  notes: string | null;
};

export type MeasurementTypeConfigData = {
  id: string;
  slug: string;
  label: string;
  unit: string;
  color: string | null;
  sortOrder: number;
  archived: boolean;
};
