"use client";

import { useState, useTransition } from "react";
import {
  startProgramWorkoutAction,
  startSpecificProgramSlotAction,
  skipSlotAction,
} from "@/app/programs/actions";
import type { ActiveProgramInfo, ProgramSlotDetail } from "@/lib/programs/types";
import {
  formatSlotTime,
  cycleLabel,
  computeSlotDate,
  formatSlotDate,
  formatSlotDateShort,
  isToday,
} from "@/lib/programs/utils";
import { Card } from "@/app/_components/card";

type Props = { info: ActiveProgramInfo };

export function NextWorkoutCard({ info }: Props) {
  const [isPending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);

  const slot = info.currentSlot;

  if (!slot) {
    return (
      <Card>
        <p className="text-xs text-muted font-medium">{info.programName}</p>
        <p className="text-sm text-subtle mt-1">Aucun créneau configuré.</p>
      </Card>
    );
  }

  const scheduledDate = computeSlotDate(
    info.startDate,
    info.cycleDays ?? 7,
    slot.cycle,
    slot.day,
  );
  const slotLabel = scheduledDate
    ? `${formatSlotDate(scheduledDate)}${slot.startTime ? ` · ${slot.startTime}` : ""}`
    : formatSlotTime(slot.day, slot.startTime);
  const cycle = info.cycleCount > 1 ? `${cycleLabel(slot.cycle)} — ` : "";
  const todayMarker = scheduledDate && isToday(scheduledDate);

  // Slots that the user could pick INSTEAD of the scheduled one.
  const otherSlots = info.allSlots.filter((s) => s.id !== slot.id && s.templateId);
  const canPickOther = otherSlots.length > 0;

  if (!slot.templateId) {
    return (
      <Card className="space-y-3">
        <div>
          <p className="text-xs text-muted font-medium">{info.programName}</p>
          <p className="text-sm text-subtle mt-0.5">
            {cycle}
            {slotLabel}
            {slot.label && ` — ${slot.label}`}
          </p>
        </div>
        <p className="text-sm text-muted">Aucun template assigné.</p>
        <button
          type="button"
          onClick={() => startTransition(() => skipSlotAction())}
          disabled={isPending}
          className="text-xs text-accent-ink hover:text-accent-hover cursor-pointer transition-colors disabled:opacity-50"
        >
          Passer →
        </button>
      </Card>
    );
  }

  return (
    <>
      <Card variant="accent" className="space-y-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
              {info.programName}
            </p>
            {todayMarker && (
              <span className="inline-flex items-center rounded-full bg-signal px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-foreground">
                Aujourd&apos;hui
              </span>
            )}
          </div>
          <p className="text-sm text-foreground/80 mt-0.5">
            {cycle}
            {slotLabel}
            {slot.label && ` — ${slot.label}`}
          </p>
        </div>
        <p className="text-lg font-display font-bold text-foreground">{slot.templateName}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => startTransition(() => startProgramWorkoutAction())}
            disabled={isPending}
            className="flex-1 rounded-xl bg-foreground text-background py-3 text-sm font-semibold hover:bg-ink-strong transition-colors cursor-pointer disabled:opacity-50"
          >
            {isPending ? "Lancement…" : "Lancer la séance →"}
          </button>
          <button
            type="button"
            onClick={() => startTransition(() => skipSlotAction())}
            disabled={isPending}
            className="rounded-xl border border-foreground/20 bg-background/40 px-4 py-3 text-xs font-semibold text-foreground hover:bg-background/60 transition-colors cursor-pointer disabled:opacity-50"
            title="Passer ce créneau sans le faire"
          >
            Passer
          </button>
        </div>
        {canPickOther && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={isPending}
            className="w-full text-xs font-semibold text-foreground/80 hover:text-foreground underline underline-offset-2 decoration-dotted cursor-pointer transition-colors disabled:opacity-50"
          >
            Choisir une autre séance du programme
          </button>
        )}
      </Card>

      {pickerOpen && (
        <SlotPickerDialog
          slots={info.allSlots}
          currentSlotId={slot.id}
          cycleCount={info.cycleCount}
          cycleDays={info.cycleDays}
          startDate={info.startDate}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}

function SlotPickerDialog({
  slots,
  currentSlotId,
  cycleCount,
  cycleDays,
  startDate,
  onClose,
}: {
  slots: ProgramSlotDetail[];
  currentSlotId: string;
  cycleCount: number;
  cycleDays: number;
  startDate: Date | null;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="slot-picker-title"
    >
      <div className="w-full sm:max-w-lg bg-background border-t sm:border sm:rounded-3xl border-border max-h-[85vh] flex flex-col shadow-floating">
        <header className="flex items-center justify-between p-5 border-b border-border">
          <h2 id="slot-picker-title" className="font-display font-bold text-base">
            Choisir une séance
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="text-sm text-muted hover:text-foreground cursor-pointer px-3 py-1.5 rounded-lg hover:bg-surface transition-colors"
          >
            Annuler
          </button>
        </header>

        <ul className="flex-1 overflow-y-auto p-3 space-y-2">
          {slots.map((s) => {
            const isCurrent = s.id === currentSlotId;
            const date = computeSlotDate(startDate, cycleDays, s.cycle, s.day);
            const today = date && isToday(date);
            const timeStr = s.startTime ? ` · ${s.startTime}` : "";
            const meta = date
              ? `${formatSlotDateShort(date)}${timeStr}`
              : `${cycleCount > 1 ? `${cycleLabel(s.cycle)} — ` : ""}${formatSlotTime(s.day, s.startTime)}`;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(() => startSpecificProgramSlotAction(s.id))
                  }
                  className="w-full text-left rounded-2xl bg-surface shadow-card hover:shadow-hero hover:-translate-y-0.5 transition-all p-4 flex items-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-[15px] truncate">
                        {s.templateName ?? "(sans template)"}
                      </span>
                      {today && (
                        <span className="inline-flex items-center rounded-full bg-signal px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-foreground">
                          Aujourd&apos;hui
                        </span>
                      )}
                      {isCurrent && !today && (
                        <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-accent-foreground">
                          Prévue
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted mt-0.5">
                      {meta}
                      {s.label && ` — ${s.label}`}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-muted text-lg"
                  >
                    →
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="p-4 text-[11px] text-subtle text-center border-t border-border">
          La séance prévue (cursor) reste inchangée, seule cette séance sera lancée.
        </p>
      </div>
    </div>
  );
}
