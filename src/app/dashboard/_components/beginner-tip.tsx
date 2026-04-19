import Link from "next/link";
import type { PrimarySport } from "@/generated/prisma/client";

type Props = {
  primarySport: PrimarySport | null;
  hasWorkouts: boolean;
  /**
   * Elevate the tip to the dashboard's primary focal point. Adds a
   * strong CTA to create a first program so there's ONE obvious next
   * step. Use when the user has no workouts AND no active program.
   */
  primary?: boolean;
};

/**
 * Friendly panel shown to BEGINNER users to orient them. Hidden once
 * they've done at least one workout — after that, the dashboard is
 * guidance enough.
 */
export function BeginnerTip({ primarySport, hasWorkouts, primary = false }: Props) {
  if (hasWorkouts) return null;

  const tips = tipsForSport(primarySport);

  return (
    <div
      className={
        primary
          ? "rounded-3xl border border-accent/30 bg-accent-light/40 p-5 space-y-4 shadow-card"
          : "rounded-2xl border border-accent/20 bg-accent/5 p-4 space-y-3"
      }
    >
      <div className="flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">💡</span>
        <h2
          className={
            primary
              ? "font-display font-bold text-base text-accent-ink"
              : "text-sm font-semibold text-accent-ink"
          }
        >
          Pour bien démarrer
        </h2>
      </div>
      <ol className="space-y-2 text-sm">
        {tips.map((tip, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-accent/15 text-accent-ink text-[10px] font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <span className={primary ? "text-foreground" : "text-muted"}>
              {typeof tip === "string" ? tip : tip.render()}
            </span>
          </li>
        ))}
      </ol>
      {primary && (
        <Link
          href="/planning"
          className="block w-full text-center rounded-full bg-foreground text-background py-3 text-sm font-semibold hover:opacity-90 transition-opacity shadow-card"
        >
          Créer mon premier programme →
        </Link>
      )}
      <div className={primary ? "pt-1" : "pt-2 border-t border-accent/10"}>
        <Link
          href="/glossary"
          className="text-xs text-accent-ink hover:underline inline-flex items-center gap-1"
        >
          <span aria-hidden="true">📖</span> Glossaire — tout le jargon expliqué simplement
        </Link>
      </div>
    </div>
  );
}

type Tip = string | { render: () => React.ReactNode };

function tipsForSport(sport: PrimarySport | null): Tip[] {
  const common: Tip[] = [
    {
      render: () => (
        <>
          Fais ton premier <strong>check-in bien-être</strong> (ci-dessus) — ça sert au coach IA à t&rsquo;adapter.
        </>
      ),
    },
    {
      render: () => (
        <>
          Crée un <Link href="/planning" className="text-accent underline">premier programme</Link> ou lance une séance libre.
        </>
      ),
    },
  ];

  const sportSpecific: Record<string, Tip[]> = {
    STRENGTH_TRAINING: [
      "Commence par 3 séances/semaine avec 3-4 exercices de base (squat, développé, rowing, soulevé).",
      "Suis tes charges semaine après semaine — l'app te montre les records quand tu en bats.",
    ],
    POWERLIFTING: [
      "Évalue d'abord ton 1RM (ou ton RM à 5 reps) sur les 3 mouvements pour calibrer ton programme.",
      "Note ton RPE sur chaque série lourde — c'est la boussole du powerlifting.",
    ],
    ENDURANCE: [
      "80 % de ton volume doit rester en zone facile (conversationnel).",
      "Ne saute pas la mobilité / renforcement — c'est ce qui tient les blessures à distance.",
    ],
    CROSSFIT_HIIT: [
      "Apprends d'abord la technique à vide (snatch, clean, wall ball) avant d'ajouter de la charge.",
      "Repère un benchmark de départ (ex. Cindy) pour mesurer tes progrès dans 6 semaines.",
    ],
    MULTI_SPORT: [
      "Identifie 1 séance clé par modalité chaque semaine — le reste peut flotter.",
      "Surveille la fatigue cumulée : l'app croise wellness et séances dans les stats.",
    ],
  };

  return sport
    ? [...common, ...(sportSpecific[sport] ?? [])]
    : common;
}
