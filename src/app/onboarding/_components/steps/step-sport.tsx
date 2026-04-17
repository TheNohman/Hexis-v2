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
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-display font-bold">Bienvenue sur Hexis !</h1>
        <p className="text-sm text-muted mt-1">
          Quelle est ta discipline principale ? On adaptera l&rsquo;app à ton profil.
        </p>
      </header>
      <div className="grid gap-2">
        {SPORTS.map((s) => {
          const active = value === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => onChange(s.value)}
              className={`text-left rounded-2xl border p-4 transition-all cursor-pointer flex items-center gap-4 ${
                active
                  ? "border-accent bg-accent/10 ring-2 ring-accent/30"
                  : "border-border bg-surface hover:border-accent/40"
              }`}
            >
              <span className="text-3xl shrink-0">{s.icon}</span>
              <div className="min-w-0">
                <p className="font-semibold">{s.label}</p>
                <p className="text-xs text-muted">{s.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
