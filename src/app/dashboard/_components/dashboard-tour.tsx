"use client";

import { useSyncExternalStore, useState } from "react";

const STORAGE_KEY = "hexis.tour.dismissed";

/** Subscribe to localStorage "storage" events so multi-tab works. */
function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** Read the flag from localStorage on the client. Returns null on
 *  the server so SSR never outputs the tour (avoids hydration flash). */
function getDismissed(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerDismissed(): string | null {
  // Server always says "not dismissed yet" — but we also render null
  // on the client until we've read, so the tour only appears after
  // hydration. This keeps SSR + client consistent.
  return "1";
}

/**
 * One-time inline mini-tour for brand-new users. Shows three cards
 * that define Programme / Modèle / Séance — the vocabulary the rest
 * of the app relies on. Dismissed forever via localStorage.
 *
 * Rendered between the welcome header and the content. CSS-only, no
 * extra deps, no portal.
 */
export function DashboardTour() {
  const dismissed = useSyncExternalStore(
    subscribe,
    getDismissed,
    getServerDismissed,
  );
  // Local override so the dismiss button reflects instantly without
  // waiting for the "storage" event (which doesn't fire in the same tab).
  const [locallyDismissed, setLocallyDismissed] = useState(false);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* private browsing or storage disabled — silently noop */
    }
    setLocallyDismissed(true);
  }

  if (dismissed === "1" || locallyDismissed) return null;

  return (
    <section
      aria-label="Présentation des concepts"
      className="rounded-3xl border border-accent/20 bg-accent/5 p-4 space-y-3 animate-fade-in-up"
    >
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-accent-ink">
            Bienvenue sur Hexis
          </p>
          <h2 className="font-display font-bold text-base mt-0.5">
            3 mots à connaître
          </h2>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Masquer cette présentation"
          className="text-xs text-subtle hover:text-foreground transition-colors cursor-pointer"
        >
          Ignorer
        </button>
      </header>

      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <li className="rounded-2xl bg-background shadow-card p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-widest font-bold text-accent-ink">
            1. Programme
          </p>
          <p className="font-display font-bold text-sm leading-tight">
            Le plan sur plusieurs semaines
          </p>
          <p className="text-[11px] text-muted leading-snug">
            Tes cycles, tes jours de séance, tes objectifs — le cadre.
          </p>
        </li>
        <li className="rounded-2xl bg-background shadow-card p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-widest font-bold text-accent-ink">
            2. Modèle
          </p>
          <p className="font-display font-bold text-sm leading-tight">
            Un gabarit de séance réutilisable
          </p>
          <p className="text-[11px] text-muted leading-snug">
            La liste d&rsquo;exos prête à lancer — que tu peux cloner.
          </p>
        </li>
        <li className="rounded-2xl bg-background shadow-card p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-widest font-bold text-accent-ink">
            3. Séance
          </p>
          <p className="font-display font-bold text-sm leading-tight">
            Ce que tu fais vraiment aujourd&rsquo;hui
          </p>
          <p className="text-[11px] text-muted leading-snug">
            Tes séries, tes charges, tes ressentis du jour.
          </p>
        </li>
      </ol>

      <div className="pt-1">
        <button
          type="button"
          onClick={dismiss}
          className="w-full sm:w-auto rounded-full bg-foreground text-background px-5 py-2 text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
        >
          Compris
        </button>
      </div>
    </section>
  );
}
