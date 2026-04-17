import type { PrimarySport, SportLevel } from "@/generated/prisma/client";

/**
 * Shared sport / level / equipment option lists used by both the onboarding
 * wizard and the editable profile form. Keep this file in sync with any
 * schema-level enum changes.
 */

export const SPORTS: {
  value: PrimarySport;
  icon: string;
  label: string;
  description: string;
}[] = [
  {
    value: "STRENGTH_TRAINING",
    icon: "🏋️",
    label: "Musculation",
    description: "Hypertrophie, esthétique, santé générale",
  },
  {
    value: "POWERLIFTING",
    icon: "🏆",
    label: "Powerlifting / Force",
    description: "Squat, Bench, Deadlift — performance en force",
  },
  {
    value: "ENDURANCE",
    icon: "🏃",
    label: "Endurance",
    description: "Course, vélo, natation, triathlon",
  },
  {
    value: "CROSSFIT_HIIT",
    icon: "⚡",
    label: "CrossFit / HIIT",
    description: "Circuits intenses, WODs, HIIT",
  },
  {
    value: "MULTI_SPORT",
    icon: "🧘",
    label: "Multi-activités",
    description: "Mélange muscu + cardio + mobilité, sans compétition",
  },
];

export const LEVELS: {
  value: SportLevel;
  label: string;
  description: string;
}[] = [
  { value: "BEGINNER", label: "Débutant·e", description: "Moins de 6 mois de pratique structurée" },
  { value: "INTERMEDIATE", label: "Intermédiaire", description: "6 mois à 2 ans, je connais les mouvements de base" },
  { value: "ADVANCED", label: "Avancé·e", description: "2+ ans, je m'entraîne en autonomie" },
  { value: "COMPETITIVE", label: "Compétiteur·ice", description: "Je prépare des compétitions" },
];

export const EQUIPMENT_OPTIONS = [
  { value: "gym_full", label: "Salle complète", emoji: "🏢" },
  { value: "gym_basic", label: "Salle basique", emoji: "🏫" },
  { value: "home", label: "Matériel maison", emoji: "🏠" },
  { value: "barbell", label: "Barre & disques", emoji: "🔩" },
  { value: "bike", label: "Vélo", emoji: "🚴" },
  { value: "pool", label: "Piscine", emoji: "🏊" },
  { value: "running", label: "Course / trail", emoji: "🏃" },
];
