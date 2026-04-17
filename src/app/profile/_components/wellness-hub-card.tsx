import { HubCard } from "./hub-card";

type WellnessLog = { mood: number; stress: number };

const TREND_ARROW = { up: "↑", down: "↓", stable: "→" } as const;
const MOOD_EMOJI = [
  "",
  "\ud83d\ude2b",
  "\ud83d\ude1f",
  "\ud83d\ude10",
  "\ud83d\ude0a",
  "\ud83d\ude04",
];

function trend(values: number[]): "up" | "down" | "stable" {
  if (values.length < 3) return "stable";
  const recent = values.slice(-3).reduce((s, v) => s + v, 0) / 3;
  const older = values.slice(0, 3).reduce((s, v) => s + v, 0) / 3;
  const diff = recent - older;
  if (diff > 0.5) return "up";
  if (diff < -0.5) return "down";
  return "stable";
}

export function WellnessHubCard({
  wellnessLogs,
}: {
  wellnessLogs: WellnessLog[];
}) {
  const last7 = wellnessLogs.slice(0, 7).reverse();
  const lastLog = wellnessLogs.length > 0 ? wellnessLogs[0] : null;
  const moodTrend = trend(last7.map((l) => l.mood));
  const stressTrend = trend(last7.map((l) => l.stress));

  return (
    <HubCard
      href="/profile/bien-etre"
      title="Bien-être"
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
          <path d="M8 14s-5.5-3.5-5.5-7A3.5 3.5 0 018 4a3.5 3.5 0 015.5 3c0 3.5-5.5 7-5.5 7z" />
        </svg>
      }
    >
      {lastLog ? (
        <>
          {last7.length >= 2 && (
            <div className="flex items-end gap-0.5 h-5 mb-2">
              {last7.map((l, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-done transition-all"
                  style={{
                    height: `${(l.mood / 5) * 100}%`,
                    opacity: 0.4 + (l.mood / 5) * 0.6,
                  }}
                />
              ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="text-lg">{MOOD_EMOJI[lastLog.mood]}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted">
                  Humeur {TREND_ARROW[moodTrend]}
                </span>
                <span className="text-muted">
                  Stress {TREND_ARROW[stressTrend]}
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-subtle mt-1">
            {wellnessLogs.length} jour{wellnessLogs.length !== 1 ? "s" : ""}{" "}
            enregistré{wellnessLogs.length !== 1 ? "s" : ""}
          </p>
        </>
      ) : (
        <p className="text-xs text-subtle">Aucune donnée</p>
      )}
    </HubCard>
  );
}
