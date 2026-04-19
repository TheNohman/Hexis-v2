/**
 * Equipment vocabulary + helpers for Exercise.equipment.
 *
 * Two levels coexist:
 * - Bundles (`User.sportProfile.equipmentAccess`) — coarse user-level access
 *   declared at onboarding: "gym_full", "home", "bike", etc.
 * - Granular tags (`Exercise.equipment`) — per-movement requirements:
 *   "Barre", "Banc", "Haltères", etc.
 *
 * The mentor AI uses {@link expandEquipmentBundles} to translate the user's
 * bundle list into the set of granular tags that are actually available, so
 * it can filter the exercise catalog deterministically.
 */

/**
 * Curated list of granular equipment tags offered as chip suggestions in the
 * exercise create/edit form. Users can also add free-text tags on top.
 * Ordered roughly by frequency of use in a typical strength-training context.
 */
export const EQUIPMENT_SUGGESTIONS: readonly string[] = [
  "Barre",
  "Disques",
  "Haltères",
  "Banc",
  "Rack",
  "Barre de traction",
  "Barres parallèles",
  "Presse à cuisses",
  "Câble",
  "Machine guidée",
  "Vélo",
  "Vélo d'appartement",
  "Piscine",
  "Rameur",
  "Tapis roulant",
  "Tapis de sol",
] as const;

/**
 * Mapping from onboarding bundle ids (see `src/app/_components/sport-options.ts`
 * `EQUIPMENT_OPTIONS`) to the granular tags that bundle unlocks. Values are
 * unioned by {@link expandEquipmentBundles} when a user declares multiple
 * bundles.
 *
 * Conservative interpretation: "Salle complète" unlocks everything gym-related;
 * "home" assumes only what most people have at home (haltères, tapis, barre
 * de traction sur porte). No bike/pool in defaults beyond their dedicated
 * bundle.
 */
const BUNDLE_TO_GRANULAR: Record<string, readonly string[]> = {
  gym_full: [
    "Barre",
    "Disques",
    "Haltères",
    "Banc",
    "Rack",
    "Barre de traction",
    "Barres parallèles",
    "Presse à cuisses",
    "Câble",
    "Machine guidée",
    "Vélo d'appartement",
    "Rameur",
    "Tapis roulant",
    "Tapis de sol",
  ],
  gym_basic: [
    "Barre",
    "Disques",
    "Haltères",
    "Banc",
    "Rack",
    "Barre de traction",
    "Tapis de sol",
  ],
  home: ["Haltères", "Barre de traction", "Tapis de sol"],
  barbell: ["Barre", "Disques"],
  bike: ["Vélo", "Vélo d'appartement"],
  pool: ["Piscine"],
  running: ["Tapis roulant"],
};

/**
 * Expand a list of onboarding bundles into the union of granular tags they
 * unlock. Unknown bundle ids are ignored silently. Result is deduplicated.
 *
 * @example
 * expandEquipmentBundles(["home", "barbell"])
 * // ["Haltères", "Barre de traction", "Tapis de sol", "Barre", "Disques"]
 */
export function expandEquipmentBundles(bundles: string[]): string[] {
  const set = new Set<string>();
  for (const b of bundles) {
    const tags = BUNDLE_TO_GRANULAR[b];
    if (tags) {
      for (const t of tags) set.add(t);
    }
  }
  return Array.from(set);
}
