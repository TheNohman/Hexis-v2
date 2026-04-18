"use client";

import type { PrimarySport } from "@/generated/prisma/client";
import { SPORTS } from "@/app/_components/sport-options";

export function StepSport({
  value,
  onChange,
}: {
  value: PrimarySport | null;
  onChange: (s: PrimarySport) => void;
}) {
  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <h1 className="font-display font-extrabold tracking-tight text-[28px] sm:text-[32px]">
          Bienvenue sur Hexis !
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          Quelle est ta discipline principale ? On adaptera l&rsquo;app &agrave; ton profil.
        </p>
      </header>
      <div
        className="grid gap-2.5"
        role="radiogroup"
        aria-label="Discipline principale"
      >
        {SPORTS.map((s) => {
          const active = value === s.value;
          return (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(s.value)}
              className={`text-left rounded-2xl border p-4 transition-all cursor-pointer flex items-center gap-4 ${
                active
                  ? "border-accent bg-accent-light ring-2 ring-accent/30 shadow-card"
                  : "border-border bg-surface hover:border-border-hover hover:-translate-y-0.5 hover:shadow-card"
              }`}
            >
              <span
                className={`shrink-0 inline-flex items-center justify-center h-12 w-12 rounded-2xl text-2xl ${
                  active ? "bg-accent text-accent-foreground" : "bg-surface-hover"
                }`}
                aria-hidden="true"
              >
                {s.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-base">{s.label}</p>
                <p className="text-xs text-muted mt-0.5">{s.description}</p>
              </div>
              {active && (
                <span
                  className="shrink-0 text-[10px] uppercase tracking-widest font-semibold rounded-full bg-accent text-accent-foreground px-2 py-0.5"
                  aria-hidden="true"
                >
                  Choisi
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
