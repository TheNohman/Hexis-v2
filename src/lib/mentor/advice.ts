import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { buildMentorContext } from "./context";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const ADVICE_SYSTEM_PROMPT = `Tu es un coach sportif expert et bienveillant. À partir des données d'entraînement de l'utilisateur, donne UN conseil court et personnalisé pour sa prochaine séance.

Règles :
- Maximum 2 phrases, sois concis et direct
- Personnalise selon : programme actuel, dernières séances, bien-être récent, progression
- Si le stress/fatigue est élevé, recommande d'adapter l'intensité
- Si la progression stagne, suggère un ajustement concret
- Si tout va bien, encourage et donne un focus précis
- Tutoie l'utilisateur
- Pas de formules de politesse, va droit au but
- Réponds en français`;

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

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
