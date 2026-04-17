import { prisma } from "@/lib/prisma";

/**
 * Union stricte des noms d'events autorisés. Permet d'attraper les
 * typos à la compilation (`trackEvent(userId, "workout_finishd")` →
 * erreur TS) plutôt qu'en prod.
 */
export type EventName =
  | "onboarding_started"
  | "onboarding_completed"
  | "workout_created"
  | "workout_finished"
  | "hiit_started"
  | "hiit_completed"
  | "pr_detected"
  | "pr_manual_added"
  | "wellness_checkin"
  | "mentor_advice_regenerated"
  | "template_created"
  | "program_created";

/**
 * Enregistre un event applicatif. **Ne throw jamais** : toute erreur est
 * loggée et avalée pour qu'une panne de télémétrie ne casse aucun flow
 * utilisateur (finish workout, onboarding, etc.).
 *
 * `userId` peut être null pour les events pré-auth (pas encore utilisé
 * côté action, mais le schéma le supporte).
 */
export async function trackEvent(
  userId: string | null,
  name: EventName,
  payload?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.appEvent.create({
      data: {
        userId,
        name,
        payload: payload ? (payload as object) : undefined,
      },
    });
  } catch (err) {
    console.error("[telemetry] trackEvent failed", { name, err });
  }
}
