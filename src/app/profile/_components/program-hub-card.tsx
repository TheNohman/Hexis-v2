import { HubCard } from "./hub-card";

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

type ActiveProgram = {
  programId: string;
  programName: string;
  currentSlot?: {
    cycle: number;
    day: number;
    startTime?: string | null;
    templateName?: string | null;
  } | null;
};

export function ProgramHubCard({ activeProgram }: { activeProgram: ActiveProgram }) {
  const currentSlot = activeProgram.currentSlot;
  const currentCycleDisplay = currentSlot ? `Cycle ${currentSlot.cycle + 1}` : null;
  const currentDayDisplay = currentSlot
    ? DAY_NAMES[currentSlot.day] ?? `Jour ${currentSlot.day + 1}`
    : null;

  return (
    <HubCard
      href={`/programs/${activeProgram.programId}`}
      title="Programme"
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
          <rect x="2" y="3" width="12" height="11" rx="1.5" />
          <line x1="5" y1="1" x2="5" y2="4" />
          <line x1="11" y1="1" x2="11" y2="4" />
          <line x1="2" y1="7" x2="14" y2="7" />
        </svg>
      }
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{activeProgram.programName}</p>
          {currentSlot && (
            <p className="text-xs text-muted mt-0.5">
              {currentCycleDisplay} &middot; {currentDayDisplay}
              {currentSlot.startTime && ` — ${currentSlot.startTime}`}
            </p>
          )}
        </div>
        {currentSlot?.templateName && (
          <div className="text-right shrink-0 ml-4">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-accent-ink">Prochaine</p>
            <p className="text-sm font-medium mt-0.5">{currentSlot.templateName}</p>
          </div>
        )}
      </div>
    </HubCard>
  );
}
