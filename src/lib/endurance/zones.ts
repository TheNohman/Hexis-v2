/**
 * Endurance training zone helpers.
 *
 * Heart-rate zones use the Karvonen / %HRR model when restingHR is
 * known (more accurate than %HRmax), and fall back to %HRmax otherwise.
 *
 * Running pace zones are anchored on VMA — % of VMA maps roughly to
 * the same physiological effort as %HRR. Common coaching splits:
 *   Z1 : < 65 %  VMA — récupération / footing très lent
 *   Z2 : 65-75 %  — endurance fondamentale (conversationnel)
 *   Z3 : 75-85 %  — allure marathon / seuil bas
 *   Z4 : 85-95 %  — seuil haut / 10 km
 *   Z5 : > 95 %   — VO2max / intervalles courts
 */

export type ZoneBand = {
  zone: 1 | 2 | 3 | 4 | 5;
  label: string;
  shortLabel: string;
  description: string;
  lowPct: number; // fraction (0.65)
  highPct: number;
};

const HR_BANDS: ZoneBand[] = [
  {
    zone: 1,
    label: "Zone 1 — Récupération",
    shortLabel: "Z1",
    description: "Récup active, très facile. Tu peux parler normalement.",
    lowPct: 0.5,
    highPct: 0.6,
  },
  {
    zone: 2,
    label: "Zone 2 — Endurance fondamentale",
    shortLabel: "Z2",
    description: "Conversation confortable, respiration nasale possible.",
    lowPct: 0.6,
    highPct: 0.7,
  },
  {
    zone: 3,
    label: "Zone 3 — Tempo",
    shortLabel: "Z3",
    description: "Allure soutenue, conversation courte mais possible.",
    lowPct: 0.7,
    highPct: 0.8,
  },
  {
    zone: 4,
    label: "Zone 4 — Seuil",
    shortLabel: "Z4",
    description: "Seuil anaérobie, conversation impossible, dur à tenir > 20 min.",
    lowPct: 0.8,
    highPct: 0.9,
  },
  {
    zone: 5,
    label: "Zone 5 — VO2max",
    shortLabel: "Z5",
    description: "Très intense, intervalles courts (30 s à 5 min).",
    lowPct: 0.9,
    highPct: 1.0,
  },
];

export type HeartRateZones = {
  zones: {
    zone: 1 | 2 | 3 | 4 | 5;
    label: string;
    shortLabel: string;
    description: string;
    lowBpm: number;
    highBpm: number;
  }[];
  /** Whether restingHR was used (Karvonen) or plain %HRmax. */
  usedKarvonen: boolean;
};

export function computeHeartRateZones(
  fcMax: number,
  fcResting: number | null,
): HeartRateZones {
  const useKarvonen = fcResting != null && fcResting > 0 && fcResting < fcMax;
  const hrr = useKarvonen ? fcMax - (fcResting as number) : null;
  return {
    usedKarvonen: useKarvonen,
    zones: HR_BANDS.map((b) => {
      const low = useKarvonen
        ? Math.round((fcResting as number) + (hrr as number) * b.lowPct)
        : Math.round(fcMax * b.lowPct);
      const high = useKarvonen
        ? Math.round((fcResting as number) + (hrr as number) * b.highPct)
        : Math.round(fcMax * b.highPct);
      return {
        zone: b.zone,
        label: b.label,
        shortLabel: b.shortLabel,
        description: b.description,
        lowBpm: low,
        highBpm: high,
      };
    }),
  };
}

export type PaceZones = {
  zones: {
    zone: 1 | 2 | 3 | 4 | 5;
    label: string;
    shortLabel: string;
    description: string;
    lowPaceSecPerKm: number; // e.g. 360 s/km = 6 min/km
    highPaceSecPerKm: number;
  }[];
};

export function computePaceZones(vmaKmh: number): PaceZones {
  // pace (min/km) = 60 / speed (km/h). A LOWER pace number is FASTER.
  // Zone Z5 (> 95% VMA) → fastest pace (smallest sec/km).
  const paceFromPct = (pct: number) => {
    const speedKmh = vmaKmh * pct;
    return Math.round((60 / speedKmh) * 60);
  };
  return {
    zones: HR_BANDS.map((b) => ({
      zone: b.zone,
      label: b.label,
      shortLabel: b.shortLabel,
      description: b.description,
      // For pace, the "low %" produces the SLOWER end (higher sec/km),
      // and "high %" produces the FASTER end (lower sec/km).
      lowPaceSecPerKm: paceFromPct(b.lowPct),
      highPaceSecPerKm: paceFromPct(b.highPct),
    })),
  };
}

export function formatPace(secPerKm: number): string {
  const mins = Math.floor(secPerKm / 60);
  const secs = secPerKm % 60;
  return `${mins}:${String(secs).padStart(2, "0")}/km`;
}
