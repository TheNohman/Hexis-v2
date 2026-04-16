import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { buildMentorContext } from "./context";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const ADVICE_SYSTEM_PROMPT = `Tu es un coach sportif expert et bienveillant. À partir des données d'entraînement de l'utilisateur, donne UN conseil court et personnalisé pour sa prochaine séance.

Règles :
- Maximum 2 phrases, sois concis et direct
- OBLIGATOIRE : appuie-toi sur au moins une donnée concrète de l'utilisateur (dernière charge vue, tendance sommeil/stress sur les jours récents, exercice précis du programme, séance en cours). Cite le chiffre ou le nom.
- Ne donne JAMAIS un conseil générique du type "commence doucement", "travaille ta technique", sans ancrage.
- Adapte ton discours au profil : primarySport (STRENGTH_TRAINING = muscu esthétique/santé, POWERLIFTING = force S+B+D, ENDURANCE = course/vélo/natation, CROSSFIT_HIIT = circuits, MULTI_SPORT = mix) et sportLevel (BEGINNER → rassurant et pédagogique ; INTERMEDIATE → technique et progression ; ADVANCED → data-driven ; COMPETITIVE → périodisation et peak).
- Tiens compte de medicalNotes si renseignées (douleurs, contre-indications) : propose explicitement une adaptation si l'exercice du jour la touche.
- Respecte sessionDurationMins : si l'utilisateur a 45 min max, ne propose pas un circuit de 60 min.
- Si une séance est en cours, le conseil doit concerner CETTE séance (poids à tenter, repos, fin de séance)
- Si sommeil <= 2 ou stress <= 2 sur les 3 derniers jours → suggère décharge concrète (ex : réduire volume -20%, baisser l'intensité sur exercices lourds)
- Si strengthTrends.highRpeSetsLast7 >= 3 OU strengthTrends.avgRpeLast7 >= 8.5 → force une décharge : propose explicitement -10 à -15% sur les mouvements lourds pour la prochaine séance (c'est un signal de surcharge).
- Si un personalBest récent (moins de 14 jours) existe sur un mouvement du programme du jour, félicite-le ET propose une progression concrète (ex : "80 kg → vise 82,5 kg aujourd'hui" ou "tente le même poids avec une rep de plus").
- Pour les sports d'endurance (primarySport ENDURANCE ou MULTI_SPORT) : si user.vmaKmh ou user.fcMax est renseigné, exprime les intensités en zones (Z1-Z5), allures (min/km) ou %VMA plutôt qu'en RPE muscu. Si l'utilisateur n'a rien renseigné, suggère de le faire une fois pour débloquer les recommandations précises.
- Si aucune séance récente et aucune donnée wellness → encourage à faire le check-in et lancer la première séance
- Tutoie l'utilisateur
- Pas de formules de politesse, va droit au but
- Réponds en français`;

// Cache court pour que les check-in wellness et les séances tout juste
// terminées se reflètent vite. Les actions (wellness, fin de séance)
// invalident aussi explicitement via clearAdviceCache().
const CACHE_DURATION_MS = 4 * 60 * 60 * 1000; // 4h

/**
 * Get session advice, using cached version if fresh enough.
 * Returns null if mentor is disabled or no API key.
 */
export async function getSessionAdvice(userId: string): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  // Check cache
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastAdvice: true, lastAdviceAt: true, mentorEnabled: true },
  });

  if (!user?.mentorEnabled) return null;

  const now = Date.now();
  if (
    user.lastAdvice &&
    user.lastAdviceAt &&
    now - user.lastAdviceAt.getTime() < CACHE_DURATION_MS
  ) {
    return user.lastAdvice;
  }

  // Generate fresh advice
  try {
    const context = await buildMentorContext(userId);
    const contextSummary = JSON.stringify(context, null, 0);

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: ADVICE_SYSTEM_PROMPT },
        {
          role: "system",
          content: `Données de l'utilisateur :\n${contextSummary}`,
        },
        {
          role: "user",
          content: "Donne-moi un conseil pour ma prochaine séance.",
        },
      ],
      temperature: 0.8,
      max_tokens: 150,
    });

    const advice = response.choices[0]?.message?.content?.trim() ?? null;

    if (advice) {
      await prisma.user.update({
        where: { id: userId },
        data: { lastAdvice: advice, lastAdviceAt: new Date() },
      });
    }

    return advice;
  } catch (error) {
    console.error("[mentor-advice]", error);
    // Return stale cache if available
    return user.lastAdvice ?? null;
  }
}

/**
 * Invalidate the cached mentor advice so the next call regenerates it.
 * Called from actions that meaningfully change the user's state (wellness
 * check-in, session finished).
 */
export async function clearAdviceCache(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastAdviceAt: null },
    });
  } catch (error) {
    console.error("[mentor-advice] clearAdviceCache", error);
  }
}
