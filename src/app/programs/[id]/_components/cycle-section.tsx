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
    <section
      className="space-y-4 animate-fade-in-up"
      style={{ animationDelay: `${cycle * 60}ms` }}
      aria-labelledby={`cycle-${cycle}`}
    >
      {/* Chapter header — tighter number, label inline with pill, range bold */}
      <div className="flex items-center gap-3.5 pt-2">
        <span
          aria-hidden="true"
          className="font-display font-black text-[56px] sm:text-[64px] leading-none text-transparent tabular-nums shrink-0 select-none"
          style={{
            WebkitTextStroke: "2px var(--foreground)",
          }}
        >
          {String(cycle + 1).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2
              id={`cycle-${cycle}`}
              className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted"
            >
              {cycleLabel(cycle)}
            </h2>
            {isCurrent && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-accent-foreground">
                <span className="w-1 h-1 rounded-full bg-accent-foreground animate-pulse" aria-hidden="true" />
                En cours
              </span>
            )}
          </div>
          {cycleRange ? (
            <p className="text-[15px] font-display font-bold text-foreground leading-tight mt-0.5">
              {formatCycleRange(cycleRange.from, cycleRange.to)}
            </p>
          ) : (
            <p className="text-sm text-muted mt-0.5">{cycleDays} jours</p>
          )}
        </div>
      </div>

      {startDate ? (
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
    <div className="space-y-5">
      {Array.from({ length: cycleDays }, (_, day) => {
        const slotsForDay = (slotsByDay.get(day) ?? []).sort((a, b) =>
          (a.startTime ?? "99").localeCompare(b.startTime ?? "99"),
        );
        const date = computeSlotDate(startDate, cycleDays, cycle, day)!;
        const today = isToday(date);
        const hasSlots = slotsForDay.length > 0;

        return (
          <div
            key={day}
            className={`group/day space-y-2 animate-fade-in-up ${
              today
                ? "relative -mx-3 px-3 py-2 rounded-2xl bg-signal-light/40 ring-1 ring-signal/20"
                : ""
            }`}
            style={{ animationDelay: `${day * 25}ms` }}
          >
            {/* Day header */}
            <div className="flex items-center justify-between gap-2 px-1 min-h-[22px]">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`text-[12px] font-bold tabular-nums uppercase tracking-wider ${
                    today ? "text-foreground" : "text-ink-strong"
                  }`}
                >
                  {formatSlotDateShort(date)}
                </span>
                <span className="text-[10px] text-subtle/70 tabular-nums">
                  J{day + 1}
                </span>
                {today && (
                  <span className="relative inline-flex items-center gap-1 rounded-full bg-signal px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-foreground">
                    <span
                      aria-hidden="true"
                      className="absolute -left-0.5 -top-0.5 -right-0.5 -bottom-0.5 rounded-full bg-signal animate-ping opacity-40"
                    />
                    <span className="relative">Aujourd&apos;hui</span>
                  </span>
                )}
              </div>
              {/* "+ Séance" — always visible on empty days, hover-only when populated */}
              <button
                type="button"
                onClick={() => onAddSlotAtDay(cycle, day)}
                disabled={isPending}
                aria-label={`Ajouter une séance le ${formatSlotDateShort(date)}`}
                className={`shrink-0 inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[10px] font-semibold text-muted hover:text-accent-ink hover:bg-accent-light shadow-sm cursor-pointer transition-all disabled:opacity-50 ${
                  hasSlots ? "opacity-0 group-hover/day:opacity-100 focus:opacity-100" : ""
                }`}
              >
                <span aria-hidden="true" className="text-sm leading-none">+</span>
                <span>Séance</span>
              </button>
            </div>

            {/* Slots for this day */}
            {!hasSlots ? (
              <button
                type="button"
                onClick={() => onAddSlotAtDay(cycle, day)}
                disabled={isPending}
                aria-label={`Ajouter une séance le ${formatSlotDateShort(date)}`}
                className="w-full rounded-xl border border-dashed border-border/80 py-2.5 flex items-center justify-center gap-2 text-[11px] font-medium text-subtle hover:text-accent-ink hover:border-accent-ink/40 hover:bg-accent-light/40 cursor-pointer transition-all disabled:opacity-50"
              >
                <span aria-hidden="true" className="text-[10px] font-bold tracking-wider uppercase">
                  Repos
                </span>
                <span aria-hidden="true" className="text-subtle/60">·</span>
                <span aria-hidden="true">+ Ajouter</span>
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
