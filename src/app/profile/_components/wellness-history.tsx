"use client";

import type { WellnessLogData } from "@/lib/wellness/queries";

// Mirrors the emoji bank in dashboard/_components/wellness-checkin.tsx —
// picked for monotonic progression (worst → best) and distinctness.
const MOOD_EMOJI = ["", "\ud83d\ude2b", "\ud83d\ude1f", "\ud83d\ude10", "\ud83d\ude0a", "\ud83d\ude04"];
const SLEEP_EMOJI = ["", "\ud83d\ude35", "\ud83d\ude2a", "\ud83d\ude34", "\ud83d\ude0c", "✨"];
const ENERGY_EMOJI = ["", "\ud83e\udd74", "\ud83d\ude2a", "\ud83d\ude10", "⚡", "\ud83d\udd25"];
const STRESS_EMOJI = ["", "\ud83d\ude30", "\ud83d\ude23", "\ud83d\ude10", "\ud83d\ude0c", "\ud83e\uddd8"];

type Props = { logs: WellnessLogData[] };

export function WellnessHistorySection({ logs }: Props) {
  if (logs.length === 0) return null;

  // Calculate averages
  const avgMood = logs.reduce((s, l) => s + l.mood, 0) / logs.length;
  const avgSleep = logs.reduce((s, l) => s + l.sleep, 0) / logs.length;
  const avgEnergy = logs.reduce((s, l) => s + l.energy, 0) / logs.length;
  const avgStress = logs.reduce((s, l) => s + l.stress, 0) / logs.length;

  return (
    <section className="space-y-3">
      <h2 className="text-[10px] font-semibold text-muted uppercase tracking-widest">
        Bien-être (30 derniers jours)
      </h2>

      {/* Averages */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Humeur", avg: avgMood, emojis: MOOD_EMOJI },
          { label: "Sommeil", avg: avgSleep, emojis: SLEEP_EMOJI },
          { label: "Énergie", avg: avgEnergy, emojis: ENERGY_EMOJI },
          { label: "Stress", avg: avgStress, emojis: STRESS_EMOJI },
        ].map(({ label, avg, emojis }) => (
          <div key={label} className="rounded-2xl bg-surface shadow-card p-3 text-center">
            <p className="text-lg" aria-hidden="true">{emojis[Math.round(avg)]}</p>
            <p className="font-display font-black text-xl tabular-nums mt-0.5">{avg.toFixed(1)}</p>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted">{label}</p>
          </div>
        ))}
      </div>

      {/* History list */}
      <ul className="space-y-1.5">
        {logs.slice(0, 14).map((log) => {
          const dateLabel = new Intl.DateTimeFormat("fr-FR", {
            weekday: "short",
            day: "numeric",
            month: "short",
          }).format(new Date(log.date));

          return (
            <li
              key={log.id}
              className="rounded-2xl bg-surface shadow-card px-4 py-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">{dateLabel}</span>
                <div className="flex gap-2 text-sm">
                  <span title="Humeur" aria-label={`Humeur ${log.mood}/5`}>{MOOD_EMOJI[log.mood]}</span>
                  <span title="Sommeil" aria-label={`Sommeil ${log.sleep}/5`}>{SLEEP_EMOJI[log.sleep]}</span>
                  <span title="Énergie" aria-label={`Énergie ${log.energy}/5`}>{ENERGY_EMOJI[log.energy]}</span>
                  <span title="Stress" aria-label={`Stress ${log.stress}/5`}>{STRESS_EMOJI[log.stress]}</span>
                </div>
              </div>
              {log.notes && (
                <p className="text-xs text-subtle mt-1">{log.notes}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
