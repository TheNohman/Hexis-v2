"use client";

import { useState, useTransition } from "react";
import {
  generateAITemplateAction,
  confirmAITemplateAction,
} from "@/app/templates/actions";
import {
  type GeneratedTemplate,
  parseGeneratedTemplate,
} from "@/lib/mentor/parser";
import { Card } from "@/app/_components/card";

type Props = { exerciseCount: number };

const PRESETS = [
  {
    label: "Push — Pecs/Épaules/Triceps",
    prompt:
      "Crée-moi une séance Push axée pecs, épaules et triceps, 60 min, niveau intermédiaire.",
  },
  {
    label: "Pull — Dos/Biceps",
    prompt:
      "Crée-moi une séance Pull axée dos et biceps, 60 min, niveau intermédiaire.",
  },
  {
    label: "Jambes complet",
    prompt: "Crée-moi une séance Legs complète, quadriceps/ischios/fessiers, 75 min.",
  },
  {
    label: "Full Body express",
    prompt: "Crée-moi un full body express de 45 min, 5-6 exercices composés.",
  },
  {
    label: "Cardio + mobilité",
    prompt:
      "Crée-moi une séance mixte : 20 min de cardio continu + 15 min de mobilité.",
  },
  {
    label: "Récupération",
    prompt:
      "Crée-moi une séance de récupération active : mobilité, étirements, cardio très léger, 30 min.",
  },
];

export function AICreateTemplateForm({ exerciseCount }: Props) {
  const [goals, setGoals] = useState("");
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [preview, setPreview] = useState<GeneratedTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate(prompt: string) {
    setError(null);
    setPreview(null);
    setRawResponse(null);
    startTransition(async () => {
      const result = await generateAITemplateAction(prompt);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.preview) {
        setRawResponse(result.preview);
        const parsed = parseGeneratedTemplate(result.preview);
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
      const result = await confirmAITemplateAction(rawResponse);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  if (exerciseCount === 0) {
    return (
      <Card rounded="2xl" padding="xl" className="text-center">
        <p className="text-sm font-semibold">
          Ta bibliothèque d&rsquo;exercices est vide.
        </p>
        <p className="text-xs text-muted mt-1">
          Ajoute quelques exercices avant que l&rsquo;IA puisse composer un modèle pour toi.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Goals input */}
      {!preview && (
        <>
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Décris ta séance idéale ou choisis un preset. L&rsquo;IA pioche
              UNIQUEMENT dans tes exercices existants — pas d&rsquo;exercice
              inventé.
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
                placeholder="Ex: Séance épaules + triceps, 50 minutes, surcharge progressive, niveau intermédiaire…"
                rows={3}
                className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm focus:outline-none focus:border-accent-ink transition-colors resize-none"
              />
            </label>
            <button
              type="button"
              disabled={isPending || !goals.trim()}
              onClick={() => handleGenerate(goals)}
              className="w-full rounded-xl bg-foreground text-background py-3.5 font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-card"
            >
              {isPending ? "Génération…" : "Générer le modèle"}
            </button>
          </div>
        </>
      )}

      {/* Loading */}
      {isPending && !preview && (
        <Card rounded="2xl" padding="xl" className="text-center">
          <div
            className="inline-block w-6 h-6 border-2 border-accent-ink border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
          <p className="text-sm text-muted mt-3">
            L&rsquo;IA compose ta séance à partir de tes exercices…
          </p>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card variant="danger" rounded="2xl" padding="md" as="div" role="alert">
          <p className="text-sm text-danger font-medium">{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setPreview(null);
              setRawResponse(null);
            }}
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
              Aperçu du modèle
            </p>
            <h2 className="font-display font-extrabold text-xl tracking-tight mt-1">
              {preview.name}
            </h2>
            <p className="text-xs text-background/70 mt-1 tabular-nums">
              {preview.blocks.length} bloc{preview.blocks.length > 1 ? "s" : ""}
              {" · "}
              {preview.blocks.reduce((s, b) => s + b.exercises.length, 0)} exercice
              {preview.blocks.reduce((s, b) => s + b.exercises.length, 0) > 1
                ? "s"
                : ""}
            </p>
          </section>

          {preview.blocks.map((block, bi) => (
            <Card key={bi} rounded="2xl" padding="lg" className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-muted">
                {block.name}
              </p>
              <div className="space-y-1">
                {block.exercises.map((ex, ei) => (
                  <div key={ei} className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="font-semibold text-foreground truncate">
                      {ex.name}
                    </span>
                    <span className="text-muted tabular-nums shrink-0">
                      {ex.sets}×{ex.reps ?? "?"}
                      {ex.weight_kg != null && ` · ${ex.weight_kg} kg`}
                      {ex.duration_secs != null &&
                        ` · ${Math.round(ex.duration_secs / 60)} min`}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={handleConfirm}
              className="flex-1 rounded-xl bg-foreground text-background py-3.5 font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-card"
            >
              {isPending ? "Création…" : "Créer ce modèle"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setPreview(null);
                setRawResponse(null);
              }}
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
