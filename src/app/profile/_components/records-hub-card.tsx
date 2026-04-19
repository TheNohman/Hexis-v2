import { HubCard } from "./hub-card";

type PR = {
  exerciseId: string;
  name: string;
  maxWeight: number;
  reps: number | null;
  date: Date;
};

export function RecordsHubCard({ prs }: { prs: PR[] }) {
  if (prs.length === 0) return null;
  return (
    <HubCard
      href="/stats"
      title="Records"
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
          <path d="M8 1l2 4h4l-3 3 1 5-4-2.5L4 13l1-5-3-3h4z" />
        </svg>
      }
    >
      <div className="grid grid-cols-2 gap-1.5">
        {prs.map((pr) => {
          // Match Stats/Summary page format: "40 kg × 10 reps" when reps
          // are known. Summary says "≈ 53 kg 1RM" but the profile tile is
          // tighter — reps alone is enough context here.
          const repsLabel =
            pr.reps != null && pr.reps > 0 ? ` × ${pr.reps}` : "";
          return (
            <div
              key={pr.exerciseId}
              className="flex items-center justify-between rounded-xl bg-background px-3 py-2"
            >
              <span className="text-xs text-muted truncate mr-2">{pr.name}</span>
              <span className="text-sm font-medium tabular-nums shrink-0">
                {pr.maxWeight} kg{repsLabel}
              </span>
            </div>
          );
        })}
      </div>
    </HubCard>
  );
}
