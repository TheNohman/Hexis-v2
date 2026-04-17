"use client";

import type { SportLevel } from "@/generated/prisma/client";
import { LEVELS } from "@/app/_components/sport-options";

export function StepLevel({
  value,
  onChange,
}: {
  value: SportLevel | null;
  onChange: (l: SportLevel) => void;
}) {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-display font-bold">Ton niveau ?</h1>
        <p className="text-sm text-muted mt-1">
          On adapte les recommandations et les charges par défaut.
        </p>
      </header>
      <div className="grid gap-2">
        {LEVELS.map((l) => {
          const active = value === l.value;
          return (
            <button
              key={l.value}
              type="button"
              onClick={() => onChange(l.value)}
              className={`text-left rounded-2xl border p-4 transition-all cursor-pointer ${
                active
                  ? "border-accent bg-accent/10 ring-2 ring-accent/30"
                  : "border-border bg-surface hover:border-accent/40"
              }`}
            >
              <p className="font-semibold">{l.label}</p>
              <p className="text-xs text-muted mt-0.5">{l.description}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
