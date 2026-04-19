import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { buildMentorContext } from "./context";
import { sanitiseForPrompt } from "./sanitize";
export { sanitiseForPrompt };

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Per-user in-memory rate limit. Caps generations to
 * RATE_LIMIT_MAX per RATE_LIMIT_WINDOW_MS. In-memory is fine because:
 *   - Next.js server is long-lived (single instance on the VPS).
 *   - Worst case on restart: one user gets one extra generation.
 * If we ever scale horizontally this should move to Redis.
 */
const RATE_LIMIT_MAX = 6; // requests
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // per hour
const rateLimitBuckets = new Map<string, number[]>();

function takeRateLimitToken(userId: string): boolean {
  const now = Date.now();
  const prev = rateLimitBuckets.get(userId) ?? [];
  const fresh = prev.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (fresh.length >= RATE_LIMIT_MAX) {
    rateLimitBuckets.set(userId, fresh);
    return false;
  }
  fresh.push(now);
  rateLimitBuckets.set(userId, fresh);
  return true;
}

/**
 * Read-only view of the rate-limit state for a user. Used to render the
 * "Il reste X générations cette heure" badge on /mentor. Does NOT consume
 * a token.
 */
export function getRemainingRateLimit(userId: string): {
  remaining: number;
  max: number;
  windowMs: number;
  resetAt: number | null;
} {
  const now = Date.now();
  const prev = rateLimitBuckets.get(userId) ?? [];
  const fresh = prev.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  const remaining = Math.max(0, RATE_LIMIT_MAX - fresh.length);
  const oldest = fresh.length > 0 ? Math.min(...fresh) : null;
  const resetAt = oldest != null ? oldest + RATE_LIMIT_WINDOW_MS : null;
  return {
    remaining,
    max: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
    resetAt,
  };
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

  // Rate limit to guard the OpenAI bill. If exceeded, fall back to the
  // stale cache (better than nothing) and skip the API call entirely.
  if (!takeRateLimitToken(userId)) {
    return user.lastAdvice ?? null;
  }

  // Generate fresh advice
  try {
    const context = await buildMentorContext(userId);
    // Scrub user-controlled free-text to prevent prompt injection.
    if (context.user) {
      context.user.medicalNotes = sanitiseForPrompt(context.user.medicalNotes);
      context.user.sportObjective = sanitiseForPrompt(context.user.sportObjective);
    }
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
      // Persist into history table so /mentor can show the last N advices.
      try {
        await prisma.mentorAdvice.create({
          data: { userId, content: advice },
        });
      } catch (historyError) {
        console.error("[mentor-advice] history insert", historyError);
      }
    }

    return advice;
  } catch (error) {
    console.error("[mentor-advice]", error);
    // Return stale cache if available
    return user.lastAdvice ?? null;
  }
}

export type MentorAdviceHistoryEntry = {
  id: string;
  content: string;
  createdAt: Date;
};

/**
 * Return the last N mentor advices for a user, newest first.
 */
export async function getMentorAdviceHistory(
  userId: string,
  limit = 10,
): Promise<MentorAdviceHistoryEntry[]> {
  const rows = await prisma.mentorAdvice.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, content: true, createdAt: true },
  });
  return rows;
}

// ────────────────────────────────────────────────────────────────
// Advice target extraction
//
// Scan free-text advice for "N kg/reps" mentions and match them against
// the user's exercise library. Pure heuristic: we don't try to be clever
// about conditionals ("tente 80 à 82.5") — we pull every numeric target
// we find and the nearest exercise name. Returned chips are purely
// informational; the mutation layer (applying to template/workout) is
// deliberately out of scope for v1.
// ────────────────────────────────────────────────────────────────

export type AdviceTarget = {
  exerciseId: string | null;
  exerciseName: string;
  value: number;
  unit: "kg" | "reps";
  /** Verbatim excerpt from the advice (for the chip tooltip). */
  snippet: string;
};

const TARGET_REGEX =
  /(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogrammes?|reps?|répétitions?|répéts?)\b/giu;

function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Find targets inside a piece of advice and map them to the best-match
 * exercise from the supplied library. Returns an empty list if nothing
 * numeric is found. We keep the API synchronous so callers can invoke it
 * directly from a page that already has the library loaded.
 */
export function extractAdviceTargets(
  advice: string,
  library: { id: string; name: string }[],
): AdviceTarget[] {
  if (!advice) return [];
  // Prepare a normalised name index, longest first so "développé couché"
  // matches before "développé" alone.
  const index = library
    .map((ex) => ({ id: ex.id, name: ex.name, normalised: normalise(ex.name) }))
    .sort((a, b) => b.normalised.length - a.normalised.length);

  const normalisedAdvice = normalise(advice);
  const targets: AdviceTarget[] = [];
  const seen = new Set<string>();

  TARGET_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TARGET_REGEX.exec(advice)) != null) {
    const rawValue = match[1].replace(",", ".");
    const value = Number.parseFloat(rawValue);
    if (!Number.isFinite(value)) continue;
    const unitToken = match[2].toLowerCase();
    const unit: "kg" | "reps" = unitToken.startsWith("k") ? "kg" : "reps";

    // Look ±60 chars around the match for the closest exercise mention.
    const matchStart = match.index;
    const windowStart = Math.max(0, matchStart - 80);
    const windowEnd = Math.min(advice.length, matchStart + 80);
    const windowText = normalise(advice.slice(windowStart, windowEnd));

    let bestExerciseId: string | null = null;
    let bestExerciseName = "";
    for (const ex of index) {
      if (ex.normalised.length < 3) continue;
      if (windowText.includes(ex.normalised)) {
        bestExerciseId = ex.id;
        bestExerciseName = ex.name;
        break;
      }
    }
    // Fallback: scan the whole advice if the window had nothing.
    if (!bestExerciseId) {
      for (const ex of index) {
        if (ex.normalised.length < 3) continue;
        if (normalisedAdvice.includes(ex.normalised)) {
          bestExerciseId = ex.id;
          bestExerciseName = ex.name;
          break;
        }
      }
    }

    // Skip targets with no anchor at all — they're likely generic
    // ("repose-toi 60 secondes" etc).
    if (!bestExerciseName) continue;

    const dedupeKey = `${bestExerciseId ?? bestExerciseName}|${value}|${unit}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const snippet = advice.slice(windowStart, windowEnd).trim();
    targets.push({
      exerciseId: bestExerciseId,
      exerciseName: bestExerciseName,
      value,
      unit,
      snippet,
    });
    if (targets.length >= 5) break; // cap to keep the UI sane
  }

  return targets;
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
