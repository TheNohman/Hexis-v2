import OpenAI from "openai";
import type { MentorContext } from "./context";

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
- Adapte au niveau de l'utilisateur (débutant si peu de séances, intermédiaire/avancé sinon)
- Prends en compte le bien-être récent (fatigue, stress, sommeil)
- Utilise les exercices existants quand possible
- Crée des programmes réalistes et progressifs
- Réponds en français pour les noms`;

export async function generateProgram(
  context: MentorContext,
  userGoals: string,
): Promise<string> {
  const contextSummary = JSON.stringify(context, null, 0);

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
- Privilégie STRICTEMENT les exercices existants dans la bibliothèque de l'utilisateur (liste fournie dans le contexte). Si un exercice n'existe pas dans la liste, ne le suggère PAS.
- Adapte au niveau de l'utilisateur (débutant si peu de séances, intermédiaire/avancé sinon)
- Prends en compte le bien-être récent (fatigue, stress, sommeil)
- Structure claire : échauffement → bloc principal → accessoires/finisher → retour au calme (selon pertinence)
- Noms en français. Nombre de sets réaliste (2-5). Durée totale visée ~45-75min selon demande.`;

export async function generateTemplate(
  context: MentorContext,
  userGoals: string,
): Promise<string> {
  const contextSummary = JSON.stringify(context, null, 0);

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: TEMPLATE_SYSTEM_PROMPT },
      {
        role: "system",
        content: `Données de l'utilisateur :\n${contextSummary}`,
      },
      { role: "user", content: userGoals },
    ],
    temperature: 0.7,
    max_tokens: 2500,
  });

  return response.choices[0]?.message?.content ?? "";
}
