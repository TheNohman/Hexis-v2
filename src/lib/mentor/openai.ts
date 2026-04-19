import OpenAI from "openai";
import type { MentorContext } from "./context";

/**
 * Hard-filter the context before sending to the LLM.
 *
 * gpt-4o-mini follows soft constraints inconsistently: even with a clear
 * "only propose exercises whose equipment is a subset of availableEquipment"
 * rule, it still happily suggests Squat barre to a user whose
 * `availableEquipment` = ["Haltères", "Barre de traction", "Tapis de sol"].
 *
 * The deterministic fix is to remove incompatible exercises from the
 * `exerciseCatalog` entirely before the LLM sees them. When
 * `availableEquipment` is empty, no filter is applied (original catalog).
 */
function subsetContextForLLM(context: MentorContext): MentorContext {
  console.log(
    "[subsetContextForLLM] availableEquipment:",
    JSON.stringify(context.availableEquipment),
    "catalog size in:",
    context.exerciseCatalog.length,
  );
  if (context.availableEquipment.length === 0) {
    console.log("[subsetContextForLLM] no filter — availableEquipment empty");
    return context;
  }
  const available = new Set(context.availableEquipment);
  const filtered = context.exerciseCatalog.filter((ex) =>
    ex.equipment.every((tag) => available.has(tag)),
  );
  console.log(
    "[subsetContextForLLM] catalog size out:",
    filtered.length,
    "kept:",
    filtered.map((f) => f.name).join(", "),
  );
  return { ...context, exerciseCatalog: filtered };
}

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const SYSTEM_PROMPT = `Tu es un coach sportif expert. Tu crées des programmes d'entraînement personnalisés basés sur les données de l'utilisateur.

Tu DOIS répondre UNIQUEMENT avec un bloc JSON structuré (sans texte avant/après) au format :

\`\`\`json
{
  "name": "Nom du programme",
  "cycleCount": 1,
  "cycleDays": 7,
  "slots": [
    {
      "cycle": 0,
      "day": 0,
      "startTime": null,
      "label": "Push",
      "template": {
        "name": "Push - Poitrine & Triceps",
        "blocks": [
          {
            "name": "Bloc principal",
            "exercises": [
              { "name": "Développé couché", "type": "STRENGTH", "sets": 4, "reps": 8, "weight_kg": 60 },
              { "name": "Développé incliné haltères", "type": "STRENGTH", "sets": 3, "reps": 10, "weight_kg": 20 }
            ]
          }
        ]
      }
    }
  ]
}
\`\`\`

Règles :
- cycle: 0-indexed (0 = premier cycle)
- day: 0-indexed dans le cycle (0 = jour 1)
- startTime: "HH:mm" ou null
- type d'exercice: "STRENGTH", "BODYWEIGHT", "CARDIO", "MOBILITY"
- Pour STRENGTH: inclure weight_kg et reps
- Pour BODYWEIGHT: inclure reps uniquement
- Pour CARDIO: inclure duration_secs et optionnellement distance_km
- Pour MOBILITY: inclure duration_secs
- CRITIQUE : Utilise EXCLUSIVEMENT les noms d'exercices fournis dans la liste "exerciseCatalog" du contexte utilisateur (reproduis le nom à l'identique, casse comprise). N'invente AUCUN exercice absent de cette liste — si un exercice n'existe pas, choisis le plus proche dans la liste.
- FILTRE ÉQUIPEMENT : si le contexte fournit un champ non-vide "availableEquipment", ne propose QUE les exercices dont TOUS les tags "equipment" sont contenus dans "availableEquipment". Un exercice avec "equipment: []" est toujours autorisé. Si "availableEquipment" est vide ou absent, n'applique aucun filtre.
- Structure chaque séance : si pertinent ajoute un bloc "Échauffement" (MOBILITY ou BODYWEIGHT léger) avant le bloc principal, et éventuellement un bloc "Retour au calme" après.
- Adapte au niveau de l'utilisateur (débutant si peu de séances, intermédiaire/avancé sinon) ET au niveau explicite fourni dans le contexte (sportProfile.level) — ignore toute mention de niveau contraire dans l'input utilisateur.
- Prends en compte le bien-être récent (fatigue, stress, sommeil)
- Crée des programmes réalistes et progressifs
- Réponds en français pour les noms`;

export async function generateProgram(
  context: MentorContext,
  userGoals: string,
): Promise<string> {
  const contextSummary = JSON.stringify(subsetContextForLLM(context), null, 0);

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "system",
        content: `Données de l'utilisateur :\n${contextSummary}`,
      },
      {
        role: "user",
        content: userGoals,
      },
    ],
    temperature: 0.7,
    max_tokens: 4000,
  });

  return response.choices[0]?.message?.content ?? "";
}

// ─── Template (séance) generation ────────────────────────────────────

const TEMPLATE_SYSTEM_PROMPT = `Tu es un coach sportif expert. Tu crées UN modèle de séance (pas un programme complet) basé sur les objectifs de l'utilisateur et les exercices qu'il a déjà dans sa bibliothèque.

Tu DOIS répondre UNIQUEMENT avec un bloc JSON structuré (sans texte avant/après) au format :

\`\`\`json
{
  "name": "Nom du modèle de séance",
  "blocks": [
    {
      "name": "Échauffement",
      "exercises": [
        { "name": "Mobilité épaules", "type": "MOBILITY", "sets": 1, "duration_secs": 300 }
      ]
    },
    {
      "name": "Bloc principal",
      "exercises": [
        { "name": "Développé couché", "type": "STRENGTH", "sets": 4, "reps": 8, "weight_kg": 60 },
        { "name": "Rowing barre", "type": "STRENGTH", "sets": 4, "reps": 10, "weight_kg": 40 }
      ]
    }
  ]
}
\`\`\`

Règles :
- UN SEUL modèle. Pas de cycles, pas de jours, pas de slots.
- type d'exercice : "STRENGTH", "BODYWEIGHT", "CARDIO", "MOBILITY"
- Pour STRENGTH : inclure weight_kg et reps
- Pour BODYWEIGHT : inclure reps uniquement
- Pour CARDIO : inclure duration_secs et optionnellement distance_km
- Pour MOBILITY : inclure duration_secs
- Privilégie STRICTEMENT les exercices existants dans la bibliothèque de l'utilisateur (liste fournie dans le contexte "exerciseCatalog"). Si un exercice n'existe pas dans la liste, ne le suggère PAS.
- FILTRE ÉQUIPEMENT : si le contexte fournit un champ non-vide "availableEquipment", ne propose QUE les exercices dont TOUS les tags "equipment" sont contenus dans "availableEquipment". Un exercice avec "equipment: []" est toujours autorisé. Si "availableEquipment" est vide ou absent, n'applique aucun filtre.
- Adapte au niveau de l'utilisateur (débutant si peu de séances, intermédiaire/avancé sinon)
- Prends en compte le bien-être récent (fatigue, stress, sommeil)
- Structure claire : échauffement → bloc principal → accessoires/finisher → retour au calme (selon pertinence)
- Respecte STRICTEMENT la durée cible demandée par l'utilisateur (compte ~1-2 min de repos entre séries STRENGTH, ~30-60s entre séries BODYWEIGHT). Adapte le nombre d'exercices en conséquence.
- Respecte l'intensité demandée (Léger = charges/volume modérés, Modéré = standard, Intense = charges lourdes / volume élevé).
- Si des zones cibles sont imposées, focalise les blocs principaux sur ces zones (autorise échauffement / mobilité complémentaire).
- Noms en français. Nombre de sets réaliste (2-5).`;

// ─── Fill empty program slots ──────────────────────────────────────

const FILL_SYSTEM_PROMPT = `Tu es un coach sportif expert. L'utilisateur a un programme partiellement défini (objectif + certains slots déjà assignés à des modèles). Tu dois compléter les SLOTS VIDES (slots sans templateId) en générant pour chacun un modèle de séance.

Tu DOIS répondre UNIQUEMENT avec un bloc JSON au format :

\`\`\`json
{
  "fills": [
    {
      "cycle": 0,
      "day": 4,
      "label": "Full body",
      "template": {
        "name": "Full body - Mobilité + Cardio",
        "blocks": [
          {
            "name": "Échauffement",
            "exercises": [
              { "name": "Mobilité épaules", "type": "MOBILITY", "sets": 1, "duration_secs": 300 }
            ]
          }
        ]
      }
    }
  ]
}
\`\`\`

Règles strictes :
- Ne remplis QUE les slots fournis dans la liste emptySlots du contexte. Ne crée pas de nouveaux créneaux, ne modifie pas les slots existants.
- Chaque fill doit avoir cycle + day qui matchent EXACTEMENT un emptySlot.
- Privilégie STRICTEMENT les exercices existants dans la bibliothèque de l'utilisateur (liste "exerciseCatalog"). Si un exercice n'existe pas dans la liste, ne le suggère PAS.
- FILTRE ÉQUIPEMENT : si le contexte fournit un champ non-vide "availableEquipment", ne propose QUE les exercices dont TOUS les tags "equipment" sont contenus dans "availableEquipment". Un exercice avec "equipment: []" est toujours autorisé. Si "availableEquipment" est vide ou absent, n'applique aucun filtre.
- Utilise l'objectif du programme pour guider le choix (ex. "prise de masse" → sets lourds STRENGTH, "endurance" → cardio long, etc.).
- Équilibre la semaine : évite de mettre 2 séances "jambes" consécutives si possible.
- Adapte au niveau de l'utilisateur et à son bien-être récent.
- type: "STRENGTH" / "BODYWEIGHT" / "CARDIO" / "MOBILITY".
- STRENGTH : inclure weight_kg + reps. BODYWEIGHT : reps. CARDIO : duration_secs + optionnel distance_km. MOBILITY : duration_secs.
- Noms en français.`;

export async function generateFillForProgram(
  context: MentorContext,
  programObjective: string | null,
  programMeta: {
    name: string;
    cycleCount: number;
    cycleDays: number;
    existingSlots: Array<{
      cycle: number;
      day: number;
      label: string | null;
      templateName: string | null;
    }>;
    emptySlots: Array<{ cycle: number; day: number }>;
  },
): Promise<string> {
  const contextSummary = JSON.stringify(subsetContextForLLM(context), null, 0);
  const programJson = JSON.stringify(
    {
      name: programMeta.name,
      objective: programObjective ?? "(pas d'objectif défini)",
      cycleCount: programMeta.cycleCount,
      cycleDays: programMeta.cycleDays,
      existingSlots: programMeta.existingSlots,
      emptySlots: programMeta.emptySlots,
    },
    null,
    0,
  );

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: FILL_SYSTEM_PROMPT },
      { role: "system", content: `Données utilisateur :\n${contextSummary}` },
      { role: "system", content: `Programme à compléter :\n${programJson}` },
      {
        role: "user",
        content: `Complète les ${programMeta.emptySlots.length} slots vides en respectant l'objectif du programme et l'équilibre de la semaine.`,
      },
    ],
    temperature: 0.6,
    max_tokens: 4000,
  });

  return response.choices[0]?.message?.content ?? "";
}

export type TemplateGenerationParams = {
  duration: number;
  intensity: "LIGHT" | "MODERATE" | "INTENSE";
  equipment: string[]; // empty array = all allowed
  targetZones: string[]; // empty array = coach decides
  freeform: string;
};

const INTENSITY_LABEL: Record<TemplateGenerationParams["intensity"], string> = {
  LIGHT: "Léger (60-70% des charges max, RPE 5-6, faible volume)",
  MODERATE: "Modéré (70-85% des charges max, RPE 7-8, volume standard)",
  INTENSE: "Intense (85%+ des charges max, RPE 8-10, volume élevé)",
};

function buildTemplateUserMessage(params: TemplateGenerationParams): string {
  const lines: string[] = [];
  lines.push(
    `Durée cible : ~${params.duration} minutes (inclut échauffement et temps de repos entre séries). Ajuste le nombre d'exercices et de séries pour coller à cette durée.`,
  );
  lines.push(`Intensité demandée : ${INTENSITY_LABEL[params.intensity]}.`);
  if (params.equipment.length > 0) {
    lines.push(
      `Équipement disponible UNIQUEMENT : ${params.equipment.join(", ")}. N'utilise pas d'autre matériel.`,
    );
  } else {
    lines.push(`Équipement : tout matériel autorisé.`);
  }
  if (params.targetZones.length > 0) {
    lines.push(
      `Zones à cibler en priorité : ${params.targetZones.join(", ")}. Focus la séance sur ces zones.`,
    );
  } else {
    lines.push(`Zones ciblées : à toi de choisir selon l'équilibre du programme récent.`);
  }
  if (params.freeform.trim()) {
    lines.push(`Précisions libres de l'utilisateur : ${params.freeform.trim()}`);
  }
  lines.push(
    `Génère maintenant UN modèle de séance en JSON (format imposé dans le système).`,
  );
  return lines.join("\n");
}

export async function generateTemplate(
  context: MentorContext,
  params: TemplateGenerationParams,
  temperature: number = 0.7,
): Promise<string> {
  const contextSummary = JSON.stringify(subsetContextForLLM(context), null, 0);

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: TEMPLATE_SYSTEM_PROMPT },
      {
        role: "system",
        content: `Données de l'utilisateur :\n${contextSummary}`,
      },
      { role: "user", content: buildTemplateUserMessage(params) },
    ],
    temperature,
    max_tokens: 2500,
  });

  return response.choices[0]?.message?.content ?? "";
}
