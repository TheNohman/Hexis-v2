"use client";

import { useState } from "react";

/**
 * Central glossary of training jargon. Each entry is a short definition
 * in plain French so beginners aren't excluded by vocabulary. Keys are
 * written as-displayed (case-sensitive for the match).
 */
const GLOSSARY: Record<string, string> = {
  RPE: "Rate of Perceived Exertion : effort perçu noté de 1 à 10. 10 = pas une rep de plus possible, 8 = il te restait 2 reps en réserve.",
  "1RM": "One-Rep Max : la charge maximale que tu peux soulever une seule fois sur un exercice donné. Sert de référence pour calibrer les autres séances.",
  RIR: "Reps In Reserve : nombre de répétitions que tu aurais encore pu faire à la fin de ta série. 0 RIR = échec, 3 RIR = très confortable.",
  PR: "Personal Record : ton meilleur résultat jamais atteint sur un exercice (charge, reps, temps). L'app les détecte automatiquement.",
  EMOM: "Every Minute On the Minute : format d'entraînement où tu fais un nombre fixe de répétitions au début de chaque minute, le repos = temps restant.",
  AMRAP: "As Many Rounds As Possible : tu enchaînes un circuit le plus de fois possible dans un temps donné.",
  Tabata: "Format 20 s d'effort / 10 s de repos × 8 rounds = 4 min total, à intensité maximale.",
  HIIT: "High Intensity Interval Training : alternance d'intervalles intenses et de récupération. Efficace pour la condition physique en peu de temps.",
  WOD: "Workout Of the Day : la séance CrossFit du jour, souvent chronométrée ou comptée en rounds.",
  Superset: "Deux exercices enchaînés sans repos entre les deux, repos après. Gain de temps et intensité.",
  Dropset: "Série où tu baisses la charge dès que tu atteins l'échec, pour continuer encore quelques reps.",
  Tempo: 'Rythme d\'exécution en secondes (ex. "3-1-2" = 3 s pour descendre, 1 s en bas, 2 s pour remonter).',
  VMA: "Vitesse Maximale Aérobie : vitesse de course à laquelle tu atteins ta consommation max d'oxygène. Base de tous les plans course.",
  Brique: "Séance triathlon enchaînant deux disciplines sans pause (ex. vélo → course) pour travailler la transition.",
  Zone2: "Zone d'effort aisée (60-70 % de ta FC max), conversationnelle. 80 % du volume endurance doit y être.",
  "Zone 2": "Zone d'effort aisée (60-70 % de ta FC max), conversationnelle. 80 % du volume endurance doit y être.",
  FCmax: "Fréquence cardiaque maximale. Sert de référence pour calculer tes zones d'effort.",
  "FC max": "Fréquence cardiaque maximale. Sert de référence pour calculer tes zones d'effort.",
};

type Props = {
  /** The term to display and look up. Matched case-sensitively in GLOSSARY. */
  children: string;
  /** Override the tooltip content (otherwise uses the glossary entry). */
  definition?: string;
};

/**
 * Inline glossary affordance. Wraps a technical term with a dotted
 * underline; tap/hover reveals a short plain-French definition.
 * If no entry exists in the glossary and no override is provided,
 * renders the children unchanged so calls remain safe.
 */
export function Term({ children, definition }: Props) {
  const entry = definition ?? GLOSSARY[children];
  const [open, setOpen] = useState(false);

  if (!entry) return <>{children}</>;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onBlur={() => setOpen(false)}
        aria-label={`D\u00e9finition : ${children}`}
        className="underline decoration-dotted decoration-accent/60 underline-offset-2 hover:text-accent cursor-help"
      >
        {children}
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-50 left-0 top-full mt-1 w-64 rounded-lg border border-border bg-surface shadow-xl p-3 text-xs text-muted leading-relaxed normal-case tracking-normal font-normal"
        >
          <strong className="block text-foreground text-[11px] uppercase tracking-wider mb-1">
            {children}
          </strong>
          {entry}
        </span>
      )}
    </span>
  );
}
