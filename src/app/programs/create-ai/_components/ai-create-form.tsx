"use client";

import { useState, useTransition } from "react";
import { generateAIProgramAction, confirmAIProgramAction } from "@/app/programs/actions";
import { type GeneratedProgram, parseGeneratedProgram } from "@/lib/mentor/parser";
import { Card } from "@/app/_components/card";

const PRESETS = [
  { label: "PPL (Push/Pull/Legs)", prompt: "Crée-moi un programme Push/Pull/Legs sur 4 semaines, 6 jours par semaine." },
  { label: "Full Body 3j/sem", prompt: "Crée-moi un programme full body 3 jours par semaine pour un débutant." },
  { label: "Upper/Lower 4j/sem", prompt: "Crée-moi un programme Upper/Lower split sur 4 jours par semaine." },
  { label: "Force 5x5", prompt: "Crée-moi un programme de force type 5x5 sur 3 jours par semaine." },
];

type AICreateContext = {
  exerciseCount: number;
  workoutCount: number;
  wellnessCount: number;
  hasBodyWeight: boolean;
};

export function AICreateForm({ context }: { context?: AICreateContext }) {
  const [goals, setGoals] = useState("");
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [preview, setPreview] = useState<GeneratedProgram | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate(prompt: string) {
    setError(null);
    setPreview(null);
    setRawResponse(null);
    startTransition(async () => {
      const result = await generateAIProgramAction(prompt);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.preview) {
        setRawResponse(result.preview);
        const parsed = parseGeneratedProgram(result.preview);
        if (parsed) {
          setPreview(parsed);
        } else {
          setError("L'IA a répondu mais le format est invalide. Réessaie.");
        }
      }
    });
  }

  function handleConfirm() {
    if (!rawResponse) return;
    startTransition(async () => {
      const result = await confirmAIProgramAction(rawResponse);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Goals input */}
      {!preview && (
        <>
          {context && (
            <div className="rounded-2xl border border-border bg-surface shadow-card p-4">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-accent-ink">
                Ce que l&rsquo;IA lit de toi
              </p>
              <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted tabular-nums">
                <li className="flex items-baseline gap-1.5">
                  <span className="font-semibold text-foreground">
                    {context.exerciseCount}
                  </span>
                  <span>exercice{context.exerciseCount > 1 ? "s" : ""} dispo.</span>
                </li>
                <li className="flex items-baseline gap-1.5">
                  <span className="font-semibold text-foreground">
                    {context.workoutCount}
                  </span>
                  <span>séance{context.workoutCount > 1 ? "s" : ""} d&rsquo;historique</span>
                </li>
                <li className="flex items-baseline gap-1.5">
                  <span
                    className={`font-semibold ${context.hasBodyWeight ? "text-foreground" : "text-subtle"}`}
                  >
                    {context.hasBodyWeight ? "✓" : "—"}
                  </span>
                  <span>poids de corps</span>
                </li>
                <li className="flex items-baseline gap-1.5">
                  <span className="font-semibold text-foreground">
                    {context.wellnessCount}
                  </span>
                  <span>wellness 30j</span>
                </li>
              </ul>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-muted">
              Décris tes objectifs ou choisis un preset. L&rsquo;IA créera un programme
              complet avec les exercices, séries et charges adaptés à ton niveau.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setGoals(p.prompt);
                    handleGenerate(p.prompt);
                  }}
                  className="rounded-2xl bg-surface shadow-card p-4 text-left text-sm font-medium hover:shadow-hero hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="sr-only">Objectifs</span>
              <textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="Ex: Je veux un programme pour prendre de la masse, 4 jours par semaine, je suis intermédiaire..."
                rows={3}
                className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors resize-none"
              />
            </label>
            <button
              type="button"
              disabled={isPending || !goals.trim()}
              onClick={() => handleGenerate(goals)}
              className="w-full rounded-xl bg-foreground text-background py-3.5 font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-card"
            >
              {isPending ? "Génération en cours…" : "Générer le programme"}
            </button>
          </div>
        </>
      )}

      {/* Loading */}
      {isPending && !preview && (
        <Card rounded="2xl" padding="xl" className="text-center">
          <div
            className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
          <p className="text-sm text-muted mt-3">
            L&rsquo;IA analyse tes données et crée ton programme…
          </p>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card variant="danger" rounded="2xl" padding="md" as="div" role="alert">
          <p className="text-sm text-danger font-medium">{error}</p>
          <button
            type="button"
            onClick={() => { setError(null); setPreview(null); setRawResponse(null); }}
            className="text-xs font-semibold text-accent-ink mt-2 cursor-pointer hover:underline"
          >
            Réessayer
          </button>
        </Card>
      )}

      {/* Step 2: Preview */}
      {preview && (
        <div className="space-y-4">
          <section className="rounded-3xl bg-foreground text-background p-5 shadow-hero">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-accent">
              Aperçu du programme
            </p>
            <h2 className="font-display font-extrabold text-xl tracking-tight mt-1">
              {preview.name}
            </h2>
            <p className="text-xs text-background/70 mt-1 tabular-nums">
              {preview.cycleCount} cycle{preview.cycleCount > 1 ? "s" : ""} de {preview.cycleDays} jours
              {" · "}
              {preview.slots.length} créneau{preview.slots.length > 1 ? "x" : ""}
            </p>
          </section>

          {preview.slots.map((slot, i) => (
            <Card key={i} rounded="2xl" padding="lg" className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent-foreground tabular-nums">
                  {preview.cycleCount > 1 ? `C${slot.cycle + 1} ` : ""}J{slot.day + 1}
                </span>
                {slot.label && (
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-accent-ink">
                    {slot.label}
                  </span>
                )}
              </div>
              <p className="text-sm font-display font-bold">{slot.template.name}</p>
              {slot.template.blocks.map((block, bi) => (
                <div key={bi} className="pl-3 border-l-2 border-border space-y-1">
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-muted">
                    {block.name}
                  </p>
                  {block.exercises.map((ex, ei) => (
                    <p key={ei} className="text-xs text-subtle">
                      {ex.name}
                      <span className="text-muted ml-1.5 tabular-nums">
                        {ex.sets}×{ex.reps ?? "?"}
                        {ex.weight_kg != null && ` @ ${ex.weight_kg}kg`}
                        {ex.duration_secs != null && ` ${Math.round(ex.duration_secs / 60)}min`}
                      </span>
                    </p>
                  ))}
                </div>
              ))}
            </Card>
          ))}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={handleConfirm}
              className="flex-1 rounded-xl bg-foreground text-background py-3.5 font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-card"
            >
              {isPending ? "Création…" : "Créer ce programme"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => { setPreview(null); setRawResponse(null); }}
              className="rounded-xl border border-border bg-surface px-4 py-3.5 text-sm font-medium text-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
            >
              Refaire
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
