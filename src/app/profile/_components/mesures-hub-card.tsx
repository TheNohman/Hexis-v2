import { HubCard } from "./hub-card";

export type MeasureRow = {
  label: string;
  value: string;
  delta?: string;
  deltaClass?: string;
};

export function MesuresHubCard({ rows }: { rows: MeasureRow[] }) {
  return (
    <HubCard
      href="/profile/mesures"
      title="Mesures"
      className="col-span-2"
      icon={
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 14V4l4 3 4-5 4 4v8H2z" />
        </svg>
      }
    >
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2"
          >
            <span className="text-sm text-muted">{row.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium tabular-nums">{row.value}</span>
              {row.delta && (
                <span className={`text-xs tabular-nums ${row.deltaClass}`}>
                  {row.delta}
                </span>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-xs text-subtle text-center py-1">
            Aucune mesure enregistrée
          </p>
        )}
      </div>
    </HubCard>
  );
}
