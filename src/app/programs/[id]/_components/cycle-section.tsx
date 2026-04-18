"use client";

import type { ProgramSlotDetail } from "@/lib/programs/types";
import {
  cycleLabel,
  computeCycleRange,
  formatCycleRange,
  computeSlotDate,
  formatSlotDateShort,
  isToday,
  dayLabel,
} from "@/lib/programs/utils";
import { SlotCard } from "./slot-card";

type Props = {
  cycle: number;
  cycleDays: number;
  startDate: Date | null;
  slots: ProgramSlotDetail[];
  currentSlotId: string | null;
  onSlotClickTemplate: (slotId: string) => void;
  onAddSlot: () => void;
  onAddSlotAtDay: (cycle: number, day: number) => void;
  onDeleteSlot: (slotId: string) => void;
  onUpdateSlot: (
    slotId: string,
    data: { day?: number; startTime?: string | null; label?: string | null },
  ) => void;
  isPending: boolean;
};

export function CycleSection({
  cycle,
  cycleDays,
  startDate,
  slots,
  currentSlotId,
  onSlotClickTemplate,
  onAddSlot,
  onAddSlotAtDay,
  onDeleteSlot,
  onUpdateSlot,
  isPending,
}: Props) {
  const isCurrent = slots.some((s) => s.id === currentSlotId);
  const cycleRange = computeCycleRange(startDate, cycleDays, cycle);

  // Group slots by day when a start date is set — makes multi-session days obvious.
  const slotsByDay = new Map<number, ProgramSlotDetail[]>();
  for (const s of slots) {
    const arr = slotsByDay.get(s.day) ?? [];
    arr.push(s);
    slotsByDay.set(s.day, arr);
  }

  return (
    <section className="space-y-2.5" aria-labelledby={`cycle-${cycle}`}>
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
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
        {cycleRange && (
          <p className="text-[11px] font-medium text-accent-ink">
            {formatCycleRange(cycleRange.from, cycleRange.to)}
          </p>
        )}
      </div>

      {startDate ? (
        // Date-mode: group by day, show each day with its calendar date, allow
        // multiple slots per day, offer "+" button per day for quick add.
        <DateGroupedDays
          cycle={cycle}
          cycleDays={cycleDays}
          startDate={startDate}
          slotsByDay={slotsByDay}
          currentSlotId={currentSlotId}
          onSlotClickTemplate={onSlotClickTemplate}
          onAddSlotAtDay={onAddSlotAtDay}
          onDeleteSlot={onDeleteSlot}
          onUpdateSlot={onUpdateSlot}
          isPending={isPending}
        />
      ) : (
        // Legacy mode: flat list of slots, add button at bottom.
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
                scheduledDate={null}
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
          <button
            type="button"
            onClick={onAddSlot}
            disabled={isPending}
            className="w-full rounded-xl border border-dashed border-border py-2.5 text-xs font-medium text-muted hover:text-foreground hover:border-foreground/40 transition-colors cursor-pointer disabled:opacity-50"
          >
            + Ajouter un créneau
          </button>
        </div>
      )}
    </section>
  );
}

function DateGroupedDays({
  cycle,
  cycleDays,
  startDate,
  slotsByDay,
  currentSlotId,
  onSlotClickTemplate,
  onAddSlotAtDay,
  onDeleteSlot,
  onUpdateSlot,
  isPending,
}: {
  cycle: number;
  cycleDays: number;
  startDate: Date;
  slotsByDay: Map<number, ProgramSlotDetail[]>;
  currentSlotId: string | null;
  onSlotClickTemplate: (slotId: string) => void;
  onAddSlotAtDay: (cycle: number, day: number) => void;
  onDeleteSlot: (slotId: string) => void;
  onUpdateSlot: (
    slotId: string,
    data: { day?: number; startTime?: string | null; label?: string | null },
  ) => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: cycleDays }, (_, day) => {
        const slotsForDay = (slotsByDay.get(day) ?? []).sort(
          (a, b) => (a.startTime ?? "99").localeCompare(b.startTime ?? "99"),
        );
        const date = computeSlotDate(startDate, cycleDays, cycle, day)!;
        const today = isToday(date);

        return (
          <div key={day} className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-foreground">
                  {formatSlotDateShort(date)}
                </span>
                <span className="text-[10px] text-subtle">— {dayLabel(day)}</span>
                {today && (
                  <span className="inline-flex items-center rounded-full bg-signal px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-foreground">
                    Aujourd&apos;hui
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onAddSlotAtDay(cycle, day)}
                disabled={isPending}
                aria-label={`Ajouter une séance le ${formatSlotDateShort(date)}`}
                className="text-[11px] font-semibold text-muted hover:text-accent-ink cursor-pointer transition-colors disabled:opacity-50"
              >
                + Séance
              </button>
            </div>
            {slotsForDay.length === 0 ? (
              <button
                type="button"
                onClick={() => onAddSlotAtDay(cycle, day)}
                disabled={isPending}
                className="w-full rounded-xl border border-dashed border-border py-2 text-[11px] text-subtle hover:text-muted hover:border-border-hover cursor-pointer transition-colors disabled:opacity-50"
              >
                Jour libre
              </button>
            ) : (
              <div className="space-y-2">
                {slotsForDay.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    cycleDays={cycleDays}
                    scheduledDate={date}
                    isCurrent={slot.id === currentSlotId}
                    onClickTemplate={() => onSlotClickTemplate(slot.id)}
                    onDelete={() => onDeleteSlot(slot.id)}
                    onUpdateDay={(d) => onUpdateSlot(slot.id, { day: d })}
                    onUpdateTime={(startTime) =>
                      onUpdateSlot(slot.id, { startTime })
                    }
                    onUpdateLabel={(label) => onUpdateSlot(slot.id, { label })}
                    isPending={isPending}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
