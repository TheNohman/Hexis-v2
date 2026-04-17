import { formatPace, type HeartRateZones, type PaceZones } from "@/lib/endurance/zones";

export function EnduranceRefsCard({
  heartZones,
  paceZones,
}: {
  heartZones: HeartRateZones | null;
  paceZones: PaceZones | null;
}) {
  if (!heartZones && !paceZones) return null;
  return (
    <>
      {heartZones && (
        <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Zones fréquence cardiaque
            {heartZones.usedKarvonen && (
              <span className="ml-2 text-[10px] text-accent normal-case">Karvonen</span>
            )}
          </h3>
          <ul className="space-y-1.5">
            {heartZones.zones.map((z) => (
              <li
                key={z.zone}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{z.label}</p>
                  <p className="text-[11px] text-muted">{z.description}</p>
                </div>
                <span className="text-sm font-mono text-accent whitespace-nowrap tabular-nums">
                  {z.lowBpm}–{z.highBpm} bpm
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {paceZones && (
        <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Allures cibles (course)
          </h3>
          <ul className="space-y-1.5">
            {paceZones.zones.map((z) => (
              <li
                key={z.zone}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {z.shortLabel} — {z.label.split(" — ")[1]}
                  </p>
                  <p className="text-[11px] text-muted">{z.description}</p>
                </div>
                <span className="text-sm font-mono text-accent whitespace-nowrap tabular-nums">
                  {formatPace(z.highPaceSecPerKm)} – {formatPace(z.lowPaceSecPerKm)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
