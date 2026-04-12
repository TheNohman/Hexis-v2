"use client";

import type { ProgramDetail } from "@/lib/programs/types";
import { SlotCard } from "./slot-card";

type Slot = ProgramDetail["slots"][number];

type Props = {
  week: number;
  slots: Slot[];
  isCurrent: boolean;
  currentDay: number;
  onSlotClick: (day: number) => void;
  onAddDay: () => void;
  onDeleteDay: (day: number) => void;
  onUpdateLabel: (day: number, label: string | null) => void;
  isPending: boolean;
};

export function WeekSection({
  week,
  slots,
  isCurrent,
  currentDay,
  onSlotClick,
  onAddDay,
  onDeleteDay,
  onUpdateLabel,
  isPending,
}: Props) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className={`text-xs font-semibold uppercase tracking-wider ${isCurrent ? "text-accent" : "text-muted"}`}>
          Semaine {week + 1}
          {isCurrent && (
            <span className="ml-2 text-[10px] font-medium normal-case bg-accent/10 text-accent rounded-full px-2 py-0.5">
              en cours
            </span>
          )}
        </h2>
      </div>

      <div className="space-y-1.5">
        {slots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-center">
            <p className="text-xs text-subtle">Aucun jour configur&eacute;</p>
          </div>
        ) : (
          slots.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              isCurrentSlot={isCurrent && slot.day === currentDay}
              onClick={() => onSlotClick(slot.day)}
              onDelete={() => onDeleteDay(slot.day)}
              onUpdateLabel={(label) => onUpdateLabel(slot.day, label)}
              isPending={isPending}
            />
          ))
        )}
      </div>

      <button
        type="button"
        onClick={onAddDay}
        disabled={isPending}
        className="w-full rounded-lg border border-dashed border-border py-2.5 text-xs text-muted hover:text-foreground hover:border-accent transition-colors cursor-pointer disabled:opacity-50"
      >
        + Ajouter un jour
      </button>
    </section>
  );
}
