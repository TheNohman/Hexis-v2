"use client";

import type { ProgramDetail } from "@/lib/programs/types";
import { DAY_NAMES } from "@/lib/programs/utils";
import { SlotCard } from "./slot-card";

type Slot = ProgramDetail["slots"][number];

type Props = {
  week: number;
  slots: Slot[];
  isCurrent: boolean;
  currentDay: number;
  onSlotClick: (day: number) => void;
  onAddDay: (day: number) => void;
  onDeleteDay: (day: number) => void;
  onUpdateLabel: (day: number, label: string | null) => void;
  onUpdateTime: (day: number, startTime: string | null) => void;
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
  onUpdateTime,
  isPending,
}: Props) {
  const usedDays = new Set(slots.map((s) => s.day));

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

      {/* Slots existants */}
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
              onUpdateTime={(time) => onUpdateTime(slot.day, time)}
              isPending={isPending}
            />
          ))
        )}
      </div>

      {/* Ajouter un jour — afficher les jours disponibles */}
      {usedDays.size < 7 && (
        <div className="flex flex-wrap gap-1.5">
          {DAY_NAMES.map((name, dayIndex) => {
            if (usedDays.has(dayIndex)) return null;
            return (
              <button
                key={dayIndex}
                type="button"
                onClick={() => onAddDay(dayIndex)}
                disabled={isPending}
                className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted hover:text-foreground hover:border-accent transition-colors cursor-pointer disabled:opacity-50"
              >
                + {name.slice(0, 3)}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
