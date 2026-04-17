import type { RecentEvent } from "@/lib/telemetry/queries";

/** Libellé FR court pour chaque type d'event connu. */
const EVENT_LABELS: Record<string, string> = {
  onboarding_started: "Onboarding commenc\u00e9",
  onboarding_completed: "Onboarding termin\u00e9",
  workout_created: "S\u00e9ance cr\u00e9\u00e9e",
  workout_finished: "S\u00e9ance termin\u00e9e",
  hiit_started: "HIIT lanc\u00e9",
  hiit_completed: "HIIT termin\u00e9",
  pr_detected: "Nouveau PR",
  pr_manual_added: "PR ajout\u00e9 manuellement",
  wellness_checkin: "Bien-\u00eatre enregistr\u00e9",
  mentor_advice_regenerated: "Conseil mentor r\u00e9g\u00e9n\u00e9r\u00e9",
  template_created: "Template cr\u00e9\u00e9",
  program_created: "Programme cr\u00e9\u00e9",
};

/** Libellés pluriels pour le compteur 30 j. */
const COUNT_LABELS: Record<string, (n: number) => string> = {
  workout_finished: (n) => `${n} s\u00e9ance${n > 1 ? "s" : ""} termin\u00e9e${n > 1 ? "s" : ""}`,
  workout_created: (n) => `${n} s\u00e9ance${n > 1 ? "s" : ""} cr\u00e9\u00e9e${n > 1 ? "s" : ""}`,
  hiit_completed: (n) => `${n} HIIT termin\u00e9${n > 1 ? "s" : ""}`,
  pr_detected: (n) => `${n} PR d\u00e9tect\u00e9${n > 1 ? "s" : ""}`,
  pr_manual_added: (n) => `${n} PR ajout\u00e9${n > 1 ? "s" : ""} manuellement`,
  wellness_checkin: (n) => `${n} check-in${n > 1 ? "s" : ""} bien-\u00eatre`,
  template_created: (n) => `${n} template${n > 1 ? "s" : ""} cr\u00e9\u00e9${n > 1 ? "s" : ""}`,
  program_created: (n) => `${n} programme${n > 1 ? "s" : ""} cr\u00e9\u00e9${n > 1 ? "s" : ""}`,
  onboarding_completed: (n) => `${n} onboarding termin\u00e9${n > 1 ? "s" : ""}`,
  mentor_advice_regenerated: (n) => `${n} conseil${n > 1 ? "s" : ""} mentor`,
};

function labelForEvent(name: string): string {
  return EVENT_LABELS[name] ?? name;
}

/** Formatte une date en "il y a 3 h", "hier", "il y a 5 j" etc. */
function formatRelative(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return "\u00e0 l'instant";
  if (diffMins < 60) return `il y a ${diffMins} min`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `il y a ${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "hier";
  if (diffDays < 30) return `il y a ${diffDays} j`;
  const diffMonths = Math.round(diffDays / 30);
  return `il y a ${diffMonths} mois`;
}

/** Résumé textuel d'un payload selon le type d'event. */
function summarizePayload(name: string, payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  if (name === "workout_finished") {
    const parts: string[] = [];
    if (typeof payload.durationMins === "number") parts.push(`${Math.round(payload.durationMins)} min`);
    if (typeof payload.totalSets === "number") parts.push(`${payload.totalSets} s\u00e9ries`);
    if (typeof payload.totalVolume === "number" && payload.totalVolume > 0) {
      parts.push(`${Math.round(payload.totalVolume).toLocaleString("fr-FR")} kg`);
    }
    return parts.join(" \u2022 ") || null;
  }
  if (name === "pr_detected" || name === "pr_manual_added") {
    const ex = typeof payload.exerciseName === "string" ? payload.exerciseName : null;
    const w = typeof payload.weightKg === "number" ? `${payload.weightKg} kg` : null;
    const r = typeof payload.reps === "number" ? `\u00d7 ${payload.reps}` : null;
    return [ex, [w, r].filter(Boolean).join(" ")].filter(Boolean).join(" \u2014 ") || null;
  }
  if (name === "wellness_checkin") {
    const mood = typeof payload.mood === "number" ? `mood ${payload.mood}/5` : null;
    const energy = typeof payload.energy === "number" ? `energy ${payload.energy}/5` : null;
    return [mood, energy].filter(Boolean).join(" \u2022 ") || null;
  }
  if (name === "hiit_completed" && typeof payload.rounds === "number") {
    return `${payload.rounds} rounds`;
  }
  if (name === "onboarding_completed") {
    const sport = typeof payload.primarySport === "string" ? payload.primarySport : null;
    const level = typeof payload.sportLevel === "string" ? payload.sportLevel : null;
    return [sport, level].filter(Boolean).join(" \u2022 ") || null;
  }
  return null;
}

export function RecentEvents({
  events,
  counts,
}: {
  events: RecentEvent[];
  counts: Record<string, number>;
}) {
  const countRows = Object.entries(counts)
    .map(([name, n]) => {
      const label = COUNT_LABELS[name]?.(n) ?? `${n} \u00e9v\u00e9nement${n > 1 ? "s" : ""} "${name}"`;
      return { name, n, label };
    })
    .sort((a, b) => b.n - a.n);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
          Activit&eacute; r&eacute;cente
        </h2>
        <span className="text-[10px] text-subtle">30 derniers jours</span>
      </div>

      {countRows.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {countRows.map((row) => (
            <span
              key={row.name}
              className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-muted"
            >
              {row.label}
            </span>
          ))}
        </div>
      )}

      {events.length === 0 ? (
        <p className="text-sm text-subtle">Aucune activit&eacute; enregistr&eacute;e.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {events.map((ev) => {
            const summary = summarizePayload(ev.name, ev.payload);
            return (
              <li key={ev.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{labelForEvent(ev.name)}</p>
                  {summary && <p className="text-[11px] text-subtle truncate">{summary}</p>}
                </div>
                <span className="text-[11px] text-muted shrink-0 tabular-nums">
                  {formatRelative(ev.createdAt)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
