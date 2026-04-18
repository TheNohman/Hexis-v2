import { formatDuration } from "@/lib/format";
import { HubCard } from "./hub-card";

type Stats = {
  totalWorkouts: number;
  avgDurationMins: number | null;
  weeklyActivity: { weekStart: string; count: number }[];
  weeklyVolume: { weekStart: string; volume: number }[];
};

export function ActivityHubCard({ stats }: { stats: Stats }) {
  const thisWeek =
    stats.weeklyActivity.length > 0
      ? stats.weeklyActivity[stats.weeklyActivity.length - 1]
      : null;
  const thisWeekVolume =
    stats.weeklyVolume.length > 0
      ? stats.weeklyVolume[stats.weeklyVolume.length - 1]
      : null;
  const count = thisWeek ? thisWeek.count : stats.totalWorkouts;

  return (
    <HubCard
      href="/stats"
      title="Activité"
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
          <path d="M4 2v12M12 2v12M2 6h4M10 6h4M2 10h4M10 10h4" />
        </svg>
      }
    >
      <p className="font-display font-black text-3xl tabular-nums leading-none">
        {count}
        <span className="ml-2 text-sm font-sans font-normal text-muted">
          séance{count !== 1 ? "s" : ""}
        </span>
      </p>
      <div className="flex items-center gap-3 mt-1">
        {stats.avgDurationMins != null && (
          <span className="text-xs text-subtle">
            Moy. {formatDuration(stats.avgDurationMins * 60)}
          </span>
        )}
        {thisWeekVolume && thisWeekVolume.volume > 0 && (
          <span className="text-xs text-subtle">
            {Math.round(thisWeekVolume.volume / 1000)}t vol.
          </span>
        )}
      </div>
      {stats.weeklyActivity.some((w) => w.count > 0) && (
        <div className="flex items-end gap-0.5 h-6 mt-2">
          {stats.weeklyActivity.map((week) => {
            const max = Math.max(...stats.weeklyActivity.map((w) => w.count), 1);
            const pct = (week.count / max) * 100;
            return (
              <div
                key={week.weekStart}
                className="flex-1 rounded-sm bg-accent transition-all"
                style={{
                  height: week.count > 0 ? `${Math.max(pct, 15)}%` : "2px",
                  opacity: week.count > 0 ? 0.6 : 0.15,
                }}
              />
            );
          })}
        </div>
      )}
    </HubCard>
  );
}
