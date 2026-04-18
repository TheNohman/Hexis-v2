import type { RecentEvent } from "@/lib/telemetry/queries";

/** Libellé FR court pour chaque type d'event connu. */
const EVENT_LABELS: Record<string, string> = {
  onboarding_started: "Onboarding commencé",
  onboarding_completed: "Onboarding terminé",
  workout_created: "Séance créée",
  workout_finished: "Séance terminée",
  hiit_started: "HIIT lancé",
  hiit_completed: "HIIT terminé",
  pr_detected: "Nouveau PR",
  pr_manual_added: "PR ajouté manuellement",
  wellness_checkin: "Bien-être enregistré",
  mentor_advice_regenerated: "Conseil mentor régénéré",
  template_created: "Template créé",
  program_created: "Programme créé",
};

/** Libellés pluriels pour le compteur 30 j. */
const COUNT_LABELS: Record<string, (n: number) => string> = {
  workout_finished: (n) => `${n} séance${n > 1 ? "s" : ""} terminée${n > 1 ? "s" : ""}`,
  workout_created: (n) => `${n} séance${n > 1 ? "s" : ""} créée${n > 1 ? "s" : ""}`,
  hiit_completed: (n) => `${n} HIIT terminé${n > 1 ? "s" : ""}`,
  pr_detected: (n) => `${n} PR détecté${n > 1 ? "s" : ""}`,
  pr_manual_added: (n) => `${n} PR ajouté${n > 1 ? "s" : ""} manuellement`,
  wellness_checkin: (n) => `${n} check-in${n > 1 ? "s" : ""} bien-être`,
  template_created: (n) => `${n} template${n > 1 ? "s" : ""} créé${n > 1 ? "s" : ""}`,
  program_created: (n) => `${n} programme${n > 1 ? "s" : ""} créé${n > 1 ? "s" : ""}`,
  onboarding_completed: (n) => `${n} onboarding terminé${n > 1 ? "s" : ""}`,
  mentor_advice_regenerated: (n) => `${n} conseil${n > 1 ? "s" : ""} mentor`,
};

function labelForEvent(name: string): string {
  return EVENT_LABELS[name] ?? name;
}

/** Formatte une date en "il y a 3 h", "hier", "il y a 5 j" etc. */
function formatRelative(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return "à l'instant";
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
    if (typeof payload.totalSets === "number") parts.push(`${payload.totalSets} séries`);
    if (typeof payload.totalVolume === "number" && payload.totalVolume > 0) {
      parts.push(`${Math.round(payload.totalVolume).toLocaleString("fr-FR")} kg`);
    }
    return parts.join(" • ") || null;
  }
  if (name === "pr_detected" || name === "pr_manual_added") {
    const ex = typeof payload.exerciseName === "string" ? payload.exerciseName : null;
    const w = typeof payload.weightKg === "number" ? `${payload.weightKg} kg` : null;
    const r = typeof payload.reps === "number" ? `× ${payload.reps}` : null;
    return [ex, [w, r].filter(Boolean).join(" ")].filter(Boolean).join(" — ") || null;
  }
  if (name === "wellness_checkin") {
    const mood = typeof payload.mood === "number" ? `mood ${payload.mood}/5` : null;
    const energy = typeof payload.energy === "number" ? `energy ${payload.energy}/5` : null;
    return [mood, energy].filter(Boolean).join(" • ") || null;
  }
  if (name === "hiit_completed" && typeof payload.rounds === "number") {
    return `${payload.rounds} rounds`;
  }
  if (name === "onboarding_completed") {
    const sport = typeof payload.primarySport === "string" ? payload.primarySport : null;
    const level = typeof payload.sportLevel === "string" ? payload.sportLevel : null;
    return [sport, level].filter(Boolean).join(" • ") || null;
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
      const label = COUNT_LABELS[name]?.(n) ?? `${n} événement${n > 1 ? "s" : ""} "${name}"`;
      return { name, n, label };
    })
    .sort((a, b) => b.n - a.n);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg tracking-tight">
          Activité récente
        </h2>
        <span className="text-[10px] uppercase tracking-widest font-semibold text-subtle">
          30 derniers jours
        </span>
      </div>

      {countRows.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {countRows.map((row) => (
            <span
              key={row.name}
              className="rounded-full bg-surface shadow-card px-3 py-1 text-[11px] font-semibold text-muted tabular-nums"
            >
              {row.label}
            </span>
          ))}
        </div>
      )}

      {events.length === 0 ? (
        <p className="text-sm text-subtle">Aucune activité enregistrée.</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl bg-surface shadow-card overflow-hidden">
          {events.map((ev) => {
            const summary = summarizePayload(ev.name, ev.payload);
            return (
              <li
                key={ev.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-display font-bold truncate">
                    {labelForEvent(ev.name)}
                  </p>
                  {summary && (
                    <p className="text-[11px] text-subtle truncate mt-0.5 tabular-nums">
                      {summary}
                    </p>
                  )}
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
