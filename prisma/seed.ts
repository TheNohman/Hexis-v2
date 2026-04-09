/* eslint-disable @typescript-eslint/no-require-imports */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/**
 * Référentiel des KPIs disponibles dans Hexis.
 * Chaque exercice du catalogue sera lié à un sous-ensemble de ces KPIs.
 */
const KPIS = [
  // --- Musculation ---
  { slug: "weight_kg", name: "Poids", unit: "kg", dataType: "DECIMAL" as const },
  { slug: "reps", name: "Répétitions", unit: "reps", dataType: "INTEGER" as const },
  { slug: "rpe", name: "RPE", unit: "/10", dataType: "DECIMAL" as const },
  // --- Cardio / durée ---
  { slug: "duration_sec", name: "Durée", unit: "s", dataType: "DURATION" as const },
  { slug: "distance_m", name: "Distance", unit: "m", dataType: "DECIMAL" as const },
  { slug: "pace_min_km", name: "Allure", unit: "min/km", dataType: "DECIMAL" as const },
  { slug: "pace_100m_sec", name: "Temps / 100m", unit: "s", dataType: "DURATION" as const },
  { slug: "pace_500m_sec", name: "Temps / 500m", unit: "s", dataType: "DURATION" as const },
  { slug: "vma_percent", name: "% VMA", unit: "%", dataType: "INTEGER" as const },
  { slug: "pma_percent", name: "% PMA", unit: "%", dataType: "INTEGER" as const },
  { slug: "power_watts", name: "Puissance", unit: "W", dataType: "INTEGER" as const },
  { slug: "hr_zone", name: "Zone FC", unit: "Z1-Z5", dataType: "INTEGER" as const },
  { slug: "elevation_m", name: "Dénivelé", unit: "m", dataType: "INTEGER" as const },
  // --- Mobilité / Gainage ---
  { slug: "side", name: "Côté", unit: "L/R/B", dataType: "TEXT" as const },
];

type ExerciseKpiSpec = {
  slug: string;
  required?: boolean;
};

type ExerciseSpec = {
  slug: string;
  name: string;
  description?: string;
  type: "STRENGTH" | "BODYWEIGHT" | "CARDIO" | "MOBILITY" | "REST";
  kpis: ExerciseKpiSpec[];
};

/**
 * Catalogue de départ : 25 exercices couvrant les 6 personas cibles
 * (musculation débutant → powerlifter, triathlon débutant → avancé).
 *
 * Chaque exercice définit ses KPIs préconfigurés : l'utilisateur voit
 * uniquement les champs pertinents pour l'exercice choisi.
 */
const EXERCISES: ExerciseSpec[] = [
  // --- Musculation (15) ---
  {
    slug: "squat-barre",
    name: "Squat barre",
    type: "STRENGTH",
    description: "Flexion des jambes avec une barre chargée sur les trapèzes.",
    kpis: [
      { slug: "weight_kg", required: true },
      { slug: "reps", required: true },
      { slug: "rpe", required: false },
    ],
  },
  {
    slug: "developpe-couche",
    name: "Développé couché",
    type: "STRENGTH",
    description: "Poussée de la barre depuis la poitrine, allongé sur un banc.",
    kpis: [
      { slug: "weight_kg", required: true },
      { slug: "reps", required: true },
      { slug: "rpe", required: false },
    ],
  },
  {
    slug: "souleve-de-terre",
    name: "Soulevé de terre",
    type: "STRENGTH",
    description: "Décollage d'une barre du sol jusqu'à l'extension complète.",
    kpis: [
      { slug: "weight_kg", required: true },
      { slug: "reps", required: true },
      { slug: "rpe", required: false },
    ],
  },
  {
    slug: "developpe-militaire",
    name: "Développé militaire",
    type: "STRENGTH",
    description: "Poussée verticale de la barre au-dessus de la tête, debout.",
    kpis: [
      { slug: "weight_kg", required: true },
      { slug: "reps", required: true },
      { slug: "rpe", required: false },
    ],
  },
  {
    slug: "rowing-barre",
    name: "Rowing barre",
    type: "STRENGTH",
    description: "Tirage horizontal de la barre vers le nombril, buste penché.",
    kpis: [
      { slug: "weight_kg", required: true },
      { slug: "reps", required: true },
      { slug: "rpe", required: false },
    ],
  },
  {
    slug: "tractions",
    name: "Tractions",
    type: "BODYWEIGHT",
    description: "Traction du corps vers le haut à une barre fixe, prise pronation.",
    kpis: [
      { slug: "reps", required: true },
      { slug: "weight_kg", required: false },
      { slug: "rpe", required: false },
    ],
  },
  {
    slug: "dips",
    name: "Dips",
    type: "BODYWEIGHT",
    description: "Flexion des bras aux barres parallèles, corps suspendu.",
    kpis: [
      { slug: "reps", required: true },
      { slug: "weight_kg", required: false },
      { slug: "rpe", required: false },
    ],
  },
  {
    slug: "pompes",
    name: "Pompes",
    type: "BODYWEIGHT",
    description: "Flexion des bras au sol, corps gainé.",
    kpis: [
      { slug: "reps", required: true },
      { slug: "rpe", required: false },
    ],
  },
  {
    slug: "fentes",
    name: "Fentes",
    type: "STRENGTH",
    description: "Pas avant avec flexion du genou arrière.",
    kpis: [
      { slug: "weight_kg", required: false },
      { slug: "reps", required: true },
      { slug: "side", required: false },
    ],
  },
  {
    slug: "leg-press",
    name: "Leg press",
    type: "STRENGTH",
    description: "Poussée d'une charge à la presse à cuisses.",
    kpis: [
      { slug: "weight_kg", required: true },
      { slug: "reps", required: true },
      { slug: "rpe", required: false },
    ],
  },
  {
    slug: "hip-thrust",
    name: "Hip thrust",
    type: "STRENGTH",
    description: "Poussée des hanches avec une barre chargée, dos sur un banc.",
    kpis: [
      { slug: "weight_kg", required: true },
      { slug: "reps", required: true },
      { slug: "rpe", required: false },
    ],
  },
  {
    slug: "curl-biceps-halteres",
    name: "Curl biceps haltères",
    type: "STRENGTH",
    description: "Flexion des avant-bras avec des haltères.",
    kpis: [
      { slug: "weight_kg", required: true },
      { slug: "reps", required: true },
    ],
  },
  {
    slug: "extension-triceps",
    name: "Extension triceps",
    type: "STRENGTH",
    description: "Extension des avant-bras à la poulie ou aux haltères.",
    kpis: [
      { slug: "weight_kg", required: true },
      { slug: "reps", required: true },
    ],
  },
  {
    slug: "elevations-laterales",
    name: "Élévations latérales",
    type: "STRENGTH",
    description: "Élévation latérale des bras avec haltères pour les deltoïdes.",
    kpis: [
      { slug: "weight_kg", required: true },
      { slug: "reps", required: true },
    ],
  },
  {
    slug: "gainage-planche",
    name: "Gainage planche",
    type: "MOBILITY",
    description: "Maintien de la position de planche sur les avant-bras.",
    kpis: [
      { slug: "duration_sec", required: true },
    ],
  },

  // --- Cardio (8) ---
  {
    slug: "run-endurance",
    name: "Run endurance",
    type: "CARDIO",
    description: "Course à allure endurance.",
    kpis: [
      { slug: "duration_sec", required: true },
      { slug: "distance_m", required: false },
      { slug: "pace_min_km", required: false },
      { slug: "hr_zone", required: false },
      { slug: "elevation_m", required: false },
    ],
  },
  {
    slug: "run-fractionne",
    name: "Run fractionné",
    type: "CARDIO",
    description: "Intervalle de course à intensité cible (% VMA).",
    kpis: [
      { slug: "duration_sec", required: true },
      { slug: "vma_percent", required: true },
      { slug: "distance_m", required: false },
    ],
  },
  {
    slug: "velo-route",
    name: "Vélo route",
    type: "CARDIO",
    description: "Sortie vélo sur route.",
    kpis: [
      { slug: "duration_sec", required: true },
      { slug: "distance_m", required: false },
      { slug: "power_watts", required: false },
      { slug: "hr_zone", required: false },
      { slug: "elevation_m", required: false },
    ],
  },
  {
    slug: "velo-home-trainer",
    name: "Vélo home-trainer",
    type: "CARDIO",
    description: "Séance de vélo indoor sur home-trainer.",
    kpis: [
      { slug: "duration_sec", required: true },
      { slug: "pma_percent", required: false },
      { slug: "power_watts", required: false },
      { slug: "hr_zone", required: false },
    ],
  },
  {
    slug: "natation-crawl",
    name: "Natation crawl",
    type: "CARDIO",
    description: "Séance de natation en crawl.",
    kpis: [
      { slug: "duration_sec", required: true },
      { slug: "distance_m", required: true },
      { slug: "pace_100m_sec", required: false },
    ],
  },
  {
    slug: "natation-endurance",
    name: "Natation endurance",
    type: "CARDIO",
    description: "Nage continue à allure endurance, nage libre.",
    kpis: [
      { slug: "duration_sec", required: true },
      { slug: "distance_m", required: true },
      { slug: "hr_zone", required: false },
    ],
  },
  {
    slug: "rameur",
    name: "Rameur",
    type: "CARDIO",
    description: "Séance d'aviron indoor.",
    kpis: [
      { slug: "duration_sec", required: true },
      { slug: "distance_m", required: false },
      { slug: "pace_500m_sec", required: false },
    ],
  },
  {
    slug: "marche-rapide",
    name: "Marche rapide",
    type: "CARDIO",
    description: "Marche soutenue en extérieur.",
    kpis: [
      { slug: "duration_sec", required: true },
      { slug: "distance_m", required: false },
      { slug: "elevation_m", required: false },
    ],
  },

  // --- Mobilité / Récupération (2) ---
  {
    slug: "etirement",
    name: "Étirement",
    type: "MOBILITY",
    description: "Étirement statique ou dynamique.",
    kpis: [
      { slug: "duration_sec", required: true },
      { slug: "side", required: false },
    ],
  },
  {
    slug: "repos",
    name: "Repos",
    type: "REST",
    description: "Temps de repos entre deux entrées (séries, intervalles).",
    kpis: [{ slug: "duration_sec", required: true }],
  },
];

async function main() {
  console.log("🌱 Seeding KPIs...");
  for (const kpi of KPIS) {
    await prisma.kpiDefinition.upsert({
      where: { slug: kpi.slug },
      update: { name: kpi.name, unit: kpi.unit, dataType: kpi.dataType },
      create: kpi,
    });
  }

  const kpiBySlug = new Map<string, string>();
  const allKpis = await prisma.kpiDefinition.findMany();
  for (const k of allKpis) kpiBySlug.set(k.slug, k.id);

  console.log(`🌱 Seeding ${EXERCISES.length} exercises...`);
  for (const ex of EXERCISES) {
    // System exercise => userId null. The compound @@unique([userId, slug])
    // doesn't work with NULL in Postgres (NULL != NULL), so we search manually.
    const existing = await prisma.exercise.findFirst({
      where: { isSystem: true, userId: null, slug: ex.slug },
    });

    const exercise = existing
      ? await prisma.exercise.update({
          where: { id: existing.id },
          data: {
            name: ex.name,
            description: ex.description,
            type: ex.type,
            isSystem: true,
          },
        })
      : await prisma.exercise.create({
          data: {
            slug: ex.slug,
            name: ex.name,
            description: ex.description,
            type: ex.type,
            isSystem: true,
            userId: null,
          },
        });

    // Reset its KPIs then recreate them (so the seed is idempotent even if KPIs change)
    await prisma.exerciseKpi.deleteMany({ where: { exerciseId: exercise.id } });
    for (let i = 0; i < ex.kpis.length; i++) {
      const spec = ex.kpis[i];
      const kpiId = kpiBySlug.get(spec.slug);
      if (!kpiId) {
        throw new Error(`Unknown KPI slug "${spec.slug}" for exercise ${ex.slug}`);
      }
      await prisma.exerciseKpi.create({
        data: {
          exerciseId: exercise.id,
          kpiDefinitionId: kpiId,
          isRequired: spec.required ?? true,
          displayOrder: i,
        },
      });
    }
  }

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
