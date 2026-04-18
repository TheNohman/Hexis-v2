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
    <section className="space-y-5">
      <header className="space-y-2">
        <h1 className="font-display font-extrabold tracking-tight text-[28px] sm:text-[32px]">
          Ton niveau ?
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          On adapte les recommandations et les charges par d&eacute;faut.
        </p>
      </header>
      <div
        className="grid gap-2.5"
        role="radiogroup"
        aria-label="Niveau de pratique"
      >
        {LEVELS.map((l, i) => {
          const active = value === l.value;
          return (
            <button
              key={l.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(l.value)}
              className={`text-left rounded-2xl border p-4 transition-all cursor-pointer flex items-center gap-4 ${
                active
                  ? "border-accent bg-accent-light ring-2 ring-accent/30 shadow-card"
                  : "border-border bg-surface hover:border-border-hover hover:-translate-y-0.5 hover:shadow-card"
              }`}
            >
              <span
                className={`shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-full font-display font-black text-sm tabular-nums ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "bg-surface-hover text-subtle"
                }`}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-base">{l.label}</p>
                <p className="text-xs text-muted mt-0.5">{l.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
