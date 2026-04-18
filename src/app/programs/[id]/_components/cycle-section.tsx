"use client";

import type { ProgramSlotDetail } from "@/lib/programs/types";
import { cycleLabel } from "@/lib/programs/utils";
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
    <section className="space-y-2.5" aria-labelledby={`cycle-${cycle}`}>
      <h2
        id={`cycle-${cycle}`}
        className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold text-muted"
      >
        <span>{cycleLabel(cycle)}</span>
        {isCurrent && (
          <span className="normal-case tracking-normal inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
            En cours
          </span>
        )}
      </h2>

      <div className="space-y-2">
        {slots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-5 text-center">
            <p className="text-xs text-subtle">Aucun créneau</p>
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
        className="w-full rounded-xl border border-dashed border-border py-2.5 text-xs font-medium text-muted hover:text-foreground hover:border-foreground/40 transition-colors cursor-pointer disabled:opacity-50"
      >
        + Ajouter un créneau
      </button>
    </section>
  );
}
