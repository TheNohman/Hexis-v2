"use client";

import { useTransition } from "react";
import { startProgramWorkoutAction, skipSlotAction } from "@/app/programs/actions";
import type { ActiveProgramInfo } from "@/lib/programs/types";
import { formatSlotTime, cycleLabel } from "@/lib/programs/utils";

type Props = { info: ActiveProgramInfo };

export function NextWorkoutCard({ info }: Props) {
  const [isPending, startTransition] = useTransition();

  const slot = info.currentSlot;

  if (!slot) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs text-muted font-medium">{info.programName}</p>
        <p className="text-sm text-subtle mt-1">Aucun cr&eacute;neau configur&eacute;.</p>
      </div>
    );
  }

  const slotLabel = formatSlotTime(slot.day, slot.startTime);
  const cycle = info.cycleCount > 1 ? `${cycleLabel(slot.cycle)} \u2014 ` : "";

  if (!slot.templateId) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <div>
          <p className="text-xs text-muted font-medium">{info.programName}</p>
          <p className="text-sm text-subtle mt-0.5">
            {cycle}{slotLabel}
            {slot.label && ` \u2014 ${slot.label}`}
          </p>
        </div>
        <p className="text-sm text-muted">Aucun template assign&eacute;.</p>
        <button type="button" onClick={() => startTransition(() => skipSlotAction())} disabled={isPending} className="text-xs text-accent hover:text-accent-hover cursor-pointer transition-colors disabled:opacity-50">
          Passer &rarr;
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
      <div>
        <p className="text-xs text-accent font-medium">{info.programName}</p>
        <p className="text-sm text-muted mt-0.5">
          {cycle}{slotLabel}
          {slot.label && ` \u2014 ${slot.label}`}
        </p>
      </div>
      <p className="text-base font-medium">{slot.templateName}</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => startTransition(() => startProgramWorkoutAction())} disabled={isPending} className="flex-1 rounded-lg bg-accent text-white py-3 text-sm font-semibold hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50">
          {isPending ? "Lancement\u2026" : "Lancer la s\u00e9ance \u2192"}
        </button>
        <button type="button" onClick={() => startTransition(() => skipSlotAction())} disabled={isPending} className="rounded-lg border border-border px-3 py-3 text-xs text-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50" title="Passer">
          Passer
        </button>
      </div>
    </div>
  );
}
