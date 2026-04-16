import Link from "next/link";

export const dynamic = "force-static";

type Entry = { term: string; short: string; long: string; tag: "force" | "cardio" | "hiit" | "general" };

const ENTRIES: Entry[] = [
  {
    term: "RPE",
    short: "Effort perçu",
    long: "Rate of Perceived Exertion : note de 1 à 10 de l'effort que tu viens de fournir. 10 = pas une rep de plus possible, 8 = il te restait 2 reps en réserve. Sert à piloter l'intensité sans se baser uniquement sur la charge.",
    tag: "force",
  },
  {
    term: "1RM",
    short: "Charge max pour 1 rep",
    long: "One-Rep Max : la charge maximale que tu peux soulever une seule fois sur un exercice donné. Sert de référence pour calibrer les charges des autres séances (ex. séries de 8 à 70 % de ton 1RM).",
    tag: "force",
  },
  {
    term: "RIR",
    short: "Reps en réserve",
    long: "Reps In Reserve : nombre de répétitions que tu aurais encore pu faire à la fin de ta série. 0 RIR = échec, 3 RIR = très confortable. Souvent l'inverse du RPE (RPE 8 ≈ 2 RIR).",
    tag: "force",
  },
  {
    term: "PR",
    short: "Record personnel",
    long: "Personal Record : ton meilleur résultat jamais atteint sur un exercice (charge, reps, temps). L'app les détecte automatiquement et te prévient quand tu en bats un.",
    tag: "general",
  },
  {
    term: "Superset",
    short: "Deux exos enchaînés",
    long: "Deux exercices réalisés dos à dos sans repos entre les deux, puis repos après les deux. Permet de gagner du temps et d'augmenter l'intensité métabolique.",
    tag: "force",
  },
  {
    term: "Dropset",
    short: "Série dégressive",
    long: "Série où tu baisses la charge dès que tu atteins l'échec technique, puis continues encore quelques reps, puis baisses encore. Technique d'intensité pour finir un muscle.",
    tag: "force",
  },
  {
    term: "Tempo",
    short: "Rythme d'exécution",
    long: 'Cadence d\'exécution notée en secondes, ex. "3-1-2" = 3 s pour descendre la charge, 1 s en position basse, 2 s pour remonter. Un tempo lent maximise le temps sous tension.',
    tag: "force",
  },
  {
    term: "Progressive overload",
    short: "Surcharge progressive",
    long: "Principe de base de la muscu : pour progresser, il faut augmenter progressivement soit la charge, soit les reps, soit les séries, soit la difficulté. L'app auto-suggère +2,5 kg ou +1 rep entre séances.",
    tag: "force",
  },
  {
    term: "Deload",
    short: "Semaine de décharge",
    long: "Semaine allégée (charges −20 à −40 %) intégrée dans un cycle d'entraînement pour permettre la surcompensation et éviter l'overreach. Typiquement toutes les 4 à 6 semaines.",
    tag: "force",
  },
  {
    term: "EMOM",
    short: "À chaque minute",
    long: "Every Minute On the Minute : au début de chaque minute tu fais un nombre fixe de répétitions, le temps restant de la minute est ton repos. Sur 10 min, 10 séries. Redoutable pour la condition physique.",
    tag: "hiit",
  },
  {
    term: "AMRAP",
    short: "Max de rounds en X min",
    long: "As Many Rounds As Possible : tu enchaînes un circuit (ex. 5 tractions + 10 pompes + 15 squats) le plus de fois possible en un temps donné (ex. 20 min). Noté en rounds + reps supplémentaires.",
    tag: "hiit",
  },
  {
    term: "Tabata",
    short: "20 s / 10 s × 8",
    long: "Protocole HIIT : 20 secondes d'effort maximal, 10 secondes de repos, répété 8 fois. Durée totale = 4 minutes. Inventé par Izumi Tabata en 1996.",
    tag: "hiit",
  },
  {
    term: "HIIT",
    short: "Intervalles intenses",
    long: "High Intensity Interval Training : alternance d'intervalles à haute intensité (80-95 % FC max) et de récupération plus ou moins active. Efficace pour la capacité cardio en peu de temps.",
    tag: "hiit",
  },
  {
    term: "WOD",
    short: "Workout du jour",
    long: "Workout Of the Day : la séance CrossFit du jour, souvent chronométrée (\"For Time\") ou comptée en rounds. Des WODs classiques (\"Cindy\", \"Fran\", \"Murph\") servent de benchmarks communs.",
    tag: "hiit",
  },
  {
    term: "Zone 2",
    short: "Allure conversationnelle",
    long: "Zone d'effort aisée (60-70 % de ta FC max), où tu peux tenir une conversation. Base de l'entraînement endurance : 80 % du volume doit s'y faire pour construire le moteur aérobie.",
    tag: "cardio",
  },
  {
    term: "VMA",
    short: "Vitesse max aérobie",
    long: "Vitesse Maximale Aérobie : vitesse de course à laquelle tu atteins ta consommation max d'oxygène (VO2max). Base de tous les plans course : les allures cible sont des % de VMA.",
    tag: "cardio",
  },
  {
    term: "FCmax",
    short: "FC maximale",
    long: "Fréquence cardiaque maximale, généralement estimée par 220 − âge ou mesurée en test terrain. Sert de référence pour calculer tes zones d'effort (Z1 à Z5).",
    tag: "cardio",
  },
  {
    term: "Brique",
    short: "Deux disciplines enchaînées",
    long: "Séance triathlon enchaînant deux disciplines sans pause (ex. vélo puis course à pied). Objectif : travailler la transition et l'adaptation musculaire.",
    tag: "cardio",
  },
];

const TAG_LABELS: Record<Entry["tag"], string> = {
  force: "Musculation / Force",
  cardio: "Endurance / Cardio",
  hiit: "HIIT / CrossFit",
  general: "Général",
};

export default function GlossaryPage() {
  const groups = (Object.keys(TAG_LABELS) as Entry["tag"][]).map((tag) => ({
    tag,
    label: TAG_LABELS[tag],
    entries: ENTRIES.filter((e) => e.tag === tag),
  }));

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">Glossaire</h1>
            <p className="text-sm text-muted mt-1">
              Tout le jargon qui gravite autour de l&rsquo;entra&icirc;nement, expliqu&eacute; simplement.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-muted hover:text-foreground transition-colors py-1 whitespace-nowrap"
          >
            &larr; Retour
          </Link>
        </header>

        {groups.map((g) => (
          <section key={g.tag} className="space-y-2">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">{g.label}</h2>
            <ul className="space-y-2">
              {g.entries.map((e) => (
                <li
                  key={e.term}
                  className="rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex items-baseline gap-3">
                    <h3 className="font-semibold text-base">{e.term}</h3>
                    <span className="text-xs text-subtle">&mdash; {e.short}</span>
                  </div>
                  <p className="text-sm text-muted mt-1.5 leading-relaxed">{e.long}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
