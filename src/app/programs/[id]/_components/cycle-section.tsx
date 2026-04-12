"use client";

import type { ProgramSlotDetail } from "@/lib/programs/types";
import { cycleLabel, dayLabel } from "@/lib/programs/utils";
import { SlotCard } from "./slot-card";

type Props = {
  cycle: number;
  cycleDays: number;
  slots: ProgramSlotDetail[];
  currentSlotId: string | null;
  onSlotClickTemplate: (slotId: string) => void;
  onAddSlot: () => void;
  onDeleteSlot: (slotId: string) => void;
  onUpdateSlot: (slotId: string, data: { day?: number; startTime?: string | null; label?: string | null }) => void;
  isPending: boolean;
};

export function CycleSection({
  cycle,
  cycleDays,
  slots,
  currentSlotId,
  onSlotClickTemplate,
  onAddSlot,
  onDeleteSlot,
  onUpdateSlot,
  isPending,
}: Props) {
  const isCurrent = slots.some((s) => s.id === currentSlotId);

  return (
    <section className="space-y-2">
      <h2 className={`text-xs font-semibold uppercase tracking-wider ${isCurrent ? "text-accent" : "text-muted"}`}>
        {cycleLabel(cycle)}
        {isCurrent && (
          <span className="ml-2 text-[10px] font-medium normal-case bg-accent/10 text-accent rounded-full px-2 py-0.5">
            en cours
          </span>
        )}
      </h2>

      <div className="space-y-1.5">
        {slots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-center">
            <p className="text-xs text-subtle">Aucun cr&eacute;neau</p>
          </div>
        ) : (
          slots.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              cycleDays={cycleDays}
              isCurrent={slot.id === currentSlotId}
              onClickTemplate={() => onSlotClickTemplate(slot.id)}
              onDelete={() => onDeleteSlot(slot.id)}
              onUpdateDay={(day) => onUpdateSlot(slot.id, { day })}
              onUpdateTime={(startTime) => onUpdateSlot(slot.id, { startTime })}
              onUpdateLabel={(label) => onUpdateSlot(slot.id, { label })}
              isPending={isPending}
            />
          ))
        )}
      </div>

      <button
        type="button"
        onClick={onAddSlot}
        disabled={isPending}
        className="w-full rounded-lg border border-dashed border-border py-2.5 text-xs text-muted hover:text-foreground hover:border-accent transition-colors cursor-pointer disabled:opacity-50"
      >
        + Ajouter un cr&eacute;neau
      </button>
    </section>
  );
}
