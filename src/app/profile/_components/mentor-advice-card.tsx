import { HubCard } from "./hub-card";

export function MentorAdviceCard({ advice }: { advice: string }) {
  return (
    <HubCard
      title="Mentor IA"
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
          <circle cx="8" cy="6" r="4" />
          <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        </svg>
      }
    >
      <p className="text-sm text-muted leading-relaxed">{advice}</p>
    </HubCard>
  );
}
