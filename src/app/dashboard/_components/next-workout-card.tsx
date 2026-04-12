"use client";

import { useTransition } from "react";
import { startProgramWorkoutAction, skipSlotAction } from "@/app/programs/actions";
import type { ActiveProgramInfo } from "@/lib/programs/types";

type Props = { info: ActiveProgramInfo };

export function NextWorkoutCard({ info }: Props) {
  const [isPending, startTransition] = useTransition();

  if (!info.currentSlot?.templateId) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <div>
          <p className="text-xs text-muted font-medium">{info.programName}</p>
          <p className="text-sm text-subtle mt-0.5">
            Semaine {info.currentWeek + 1} &bull; Jour {info.currentDay + 1}
            {info.currentSlot?.label && ` — ${info.currentSlot.label}`}
          </p>
        </div>
        <p className="text-sm text-muted">Aucun template assign&eacute; pour ce cr&eacute;neau.</p>
        <button
          type="button"
          onClick={() => startTransition(() => skipSlotAction())}
          disabled={isPending}
          className="text-xs text-accent hover:text-accent-hover cursor-pointer transition-colors disabled:opacity-50"
        >
          Passer ce jour &rarr;
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
      <div>
        <p className="text-xs text-accent font-medium">{info.programName}</p>
        <p className="text-sm text-muted mt-0.5">
          Semaine {info.currentWeek + 1} &bull; Jour {info.currentDay + 1}
          {info.currentSlot.label && ` — ${info.currentSlot.label}`}
        </p>
      </div>

      <p className="text-base font-medium">{info.currentSlot.templateName}</p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => startTransition(() => startProgramWorkoutAction())}
          disabled={isPending}
          className="flex-1 rounded-lg bg-accent text-white py-3 text-sm font-semibold hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50"
        >
          {isPending ? "Lancement\u2026" : "Lancer la s\u00e9ance \u2192"}
        </button>
        <button
          type="button"
          onClick={() => startTransition(() => skipSlotAction())}
          disabled={isPending}
          className="rounded-lg border border-border px-3 py-3 text-xs text-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
          title="Passer ce jour"
        >
          Passer
        </button>
      </div>
    </div>
  );
}
