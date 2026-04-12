"use client";

import type { ProgramProposal } from "@/lib/mentor/parser";

type Props = { program: ProgramProposal };

export function ProgramPreview({ program }: Props) {
  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-accent uppercase tracking-wider">
            Programme propos&eacute;
          </p>
          <p className="text-base font-medium mt-0.5">{program.name}</p>
          <p className="text-xs text-muted">
            {program.weekCount} semaine{program.weekCount > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {program.weeks.map((week, wi) => (
        <div key={wi} className="space-y-2">
          <p className="text-xs font-semibold text-muted">Semaine {wi + 1}</p>
          {week.days.map((day, di) => (
            <div key={di} className="rounded-lg border border-border bg-background p-3 space-y-1.5">
              <p className="text-sm font-medium">{day.label}</p>
              <ul className="space-y-0.5">
                {day.exercises.map((ex, ei) => (
                  <li key={ei} className="text-xs text-muted">
                    {ex.name}
                    {ex.sets && ex.reps && (
                      <span className="text-subtle">
                        {" "}&mdash; {ex.sets}&times;{ex.reps}
                        {ex.weight_kg ? ` @ ${ex.weight_kg}kg` : ""}
                      </span>
                    )}
                    {ex.duration_secs && (
                      <span className="text-subtle">
                        {" "}&mdash; {Math.round(ex.duration_secs / 60)} min
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}

      <p className="text-[10px] text-subtle text-center">
        La cr&eacute;ation automatique de programme sera disponible prochainement.
        Pour l&rsquo;instant, utilise ces recommandations pour cr&eacute;er ton programme manuellement.
      </p>
    </div>
  );
}
