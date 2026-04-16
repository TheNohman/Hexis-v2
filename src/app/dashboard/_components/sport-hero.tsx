import type { PrimarySport, SportLevel } from "@/generated/prisma/client";

type Props = {
  firstName: string | null;
  primarySport: PrimarySport | null;
  sportLevel: SportLevel | null;
  sportObjective: string | null;
};

/**
 * Sport-aware greeting strip shown at the top of the dashboard. Adapts
 * the welcome sentence to the user's primary sport and level so that a
 * triathlete doesn't see "prêt à pousser de la fonte" and a débutant
 * doesn't see intimidating powerlifting vocabulary.
 */
export function SportHero({ firstName, primarySport, sportLevel, sportObjective }: Props) {
  const greeting = buildGreeting(firstName, primarySport, sportLevel);
  const subline = sportObjective ? `Objectif actuel : ${sportObjective}` : defaultSubline(primarySport);

  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <p className="text-sm font-semibold">{greeting}</p>
      {subline && <p className="text-xs text-muted mt-0.5">{subline}</p>}
    </div>
  );
}

function buildGreeting(
  firstName: string | null,
  sport: PrimarySport | null,
  level: SportLevel | null,
): string {
  const who = firstName ? `${firstName}` : "";
  const hour = new Date().getHours();
  const timeOfDay =
    hour < 6 ? "Bonne nuit" : hour < 12 ? "Bon matin" : hour < 18 ? "Bel après-midi" : "Bonne soirée";

  const base = who ? `${timeOfDay}, ${who} !` : `${timeOfDay} !`;
  if (!sport) return base;

  // Softer copy for beginners, more performance-driven for advanced.
  const isNewbie = level === "BEGINNER";

  const sportLine: Record<PrimarySport, string> = {
    STRENGTH_TRAINING: isNewbie
      ? "Ta séance du jour t'attend — on avance à ton rythme."
      : "Prêt à progresser sur tes mouvements clés ?",
    POWERLIFTING: isNewbie
      ? "Focus technique aujourd'hui — la charge viendra."
      : "Nouvelle session force. On regarde le RPE de près.",
    ENDURANCE: isNewbie
      ? "Une séance à la fois — on construit l'endurance durablement."
      : "Prête pour ton entraînement endurance ?",
    CROSSFIT_HIIT: isNewbie
      ? "Intensité progressive — écoute ton corps."
      : "Qu'est-ce qu'on casse aujourd'hui ?",
    MULTI_SPORT: "Qu'est-ce qui est au programme aujourd'hui ?",
  };

  return `${base} ${sportLine[sport]}`;
}

function defaultSubline(sport: PrimarySport | null): string | null {
  switch (sport) {
    case "STRENGTH_TRAINING":
      return "Progressive overload, récup, régularité.";
    case "POWERLIFTING":
      return "Squat · Bench · Deadlift — un pas de plus vers ton total.";
    case "ENDURANCE":
      return "Volume, allures, récupération.";
    case "CROSSFIT_HIIT":
      return "Intensité, technique, benchmarks.";
    case "MULTI_SPORT":
      return "Équilibre entre modalités, régularité sur la durée.";
    default:
      return null;
  }
}
