"use client";

import { useTransition } from "react";
import { startProgramWorkoutAction, skipSlotAction } from "@/app/programs/actions";
import type { ActiveProgramInfo } from "@/lib/programs/types";
import { formatSlotTime, cycleLabel } from "@/lib/programs/utils";
import { Card } from "@/app/_components/card";

type Props = { info: ActiveProgramInfo };

export function NextWorkoutCard({ info }: Props) {
  const [isPending, startTransition] = useTransition();

  const slot = info.currentSlot;

  if (!slot) {
    return (
      <Card>
        <p className="text-xs text-muted font-medium">{info.programName}</p>
        <p className="text-sm text-subtle mt-1">Aucun cr&eacute;neau configur&eacute;.</p>
      </Card>
    );
  }

  const slotLabel = formatSlotTime(slot.day, slot.startTime);
  const cycle = info.cycleCount > 1 ? `${cycleLabel(slot.cycle)} — ` : "";

  if (!slot.templateId) {
    return (
      <Card className="space-y-3">
        <div>
          <p className="text-xs text-muted font-medium">{info.programName}</p>
          <p className="text-sm text-subtle mt-0.5">
            {cycle}{slotLabel}
            {slot.label && ` — ${slot.label}`}
          </p>
        </div>
        <p className="text-sm text-muted">Aucun template assign&eacute;.</p>
        <button type="button" onClick={() => startTransition(() => skipSlotAction())} disabled={isPending} className="text-xs text-accent hover:text-accent-hover cursor-pointer transition-colors disabled:opacity-50">
          Passer &rarr;
        </button>
      </Card>
    );
  }

  return (
    <Card variant="accent" className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
          {info.programName}
        </p>
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
          title="Passer"
        >
          Passer
        </button>
      </div>
    </Card>
  );
}
