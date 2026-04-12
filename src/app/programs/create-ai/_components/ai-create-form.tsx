"use client";

import { useState, useTransition } from "react";
import { generateAIProgramAction, confirmAIProgramAction } from "@/app/programs/actions";
import { type GeneratedProgram, parseGeneratedProgram } from "@/lib/mentor/parser";

const PRESETS = [
  { label: "PPL (Push/Pull/Legs)", prompt: "Crée-moi un programme Push/Pull/Legs sur 4 semaines, 6 jours par semaine." },
  { label: "Full Body 3j/sem", prompt: "Crée-moi un programme full body 3 jours par semaine pour un débutant." },
  { label: "Upper/Lower 4j/sem", prompt: "Crée-moi un programme Upper/Lower split sur 4 jours par semaine." },
  { label: "Force 5x5", prompt: "Crée-moi un programme de force type 5x5 sur 3 jours par semaine." },
];

export function AICreateForm() {
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
          <div className="space-y-3">
            <p className="text-sm text-muted">
              D&eacute;cris tes objectifs ou choisis un preset. L&rsquo;IA cr&eacute;era un programme
              complet avec les exercices, s&eacute;ries et charges adapt&eacute;s &agrave; ton niveau.
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
                  className="rounded-xl border border-border bg-surface hover:bg-surface-hover transition-colors p-3 text-left text-sm disabled:opacity-50 cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="Ex: Je veux un programme pour prendre de la masse, 4 jours par semaine, je suis intermédiaire..."
              rows={3}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors resize-none"
            />
            <button
              type="button"
              disabled={isPending || !goals.trim()}
              onClick={() => handleGenerate(goals)}
              className="w-full rounded-xl bg-accent text-white py-3.5 font-semibold hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50"
            >
              {isPending ? "G\u00e9n\u00e9ration en cours..." : "G\u00e9n\u00e9rer le programme"}
            </button>
          </div>
        </>
      )}

      {/* Loading */}
      {isPending && !preview && (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <div className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted mt-3">L&rsquo;IA analyse tes donn&eacute;es et cr&eacute;e ton programme...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm text-danger">{error}</p>
          <button
            type="button"
            onClick={() => { setError(null); setPreview(null); setRawResponse(null); }}
            className="text-xs text-accent mt-2 cursor-pointer hover:underline"
          >
            R&eacute;essayer
          </button>
        </div>
      )}

      {/* Step 2: Preview */}
      {preview && (
        <div className="space-y-4">
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
            <h2 className="text-lg font-semibold">{preview.name}</h2>
            <p className="text-xs text-muted mt-1">
              {preview.cycleCount} cycle{preview.cycleCount > 1 ? "s" : ""} de {preview.cycleDays} jours
              &bull; {preview.slots.length} cr&eacute;neau{preview.slots.length > 1 ? "x" : ""}
            </p>
          </div>

          {preview.slots.map((slot, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold bg-surface-hover rounded-lg px-2 py-1">
                  {preview.cycleCount > 1 ? `C${slot.cycle + 1} ` : ""}J{slot.day + 1}
                </span>
                {slot.label && (
                  <span className="text-xs text-accent font-medium">{slot.label}</span>
                )}
              </div>
              <p className="text-sm font-medium">{slot.template.name}</p>
              {slot.template.blocks.map((block, bi) => (
                <div key={bi} className="pl-3 border-l-2 border-border space-y-1">
                  <p className="text-[10px] text-muted uppercase tracking-wider">{block.name}</p>
                  {block.exercises.map((ex, ei) => (
                    <p key={ei} className="text-xs text-subtle">
                      {ex.name}
                      <span className="text-muted ml-1.5">
                        {ex.sets}x{ex.reps ?? "?"}
                        {ex.weight_kg != null && ` @ ${ex.weight_kg}kg`}
                        {ex.duration_secs != null && ` ${Math.round(ex.duration_secs / 60)}min`}
                      </span>
                    </p>
                  ))}
                </div>
              ))}
            </div>
          ))}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={handleConfirm}
              className="flex-1 rounded-xl bg-accent text-white py-3.5 font-semibold hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50"
            >
              {isPending ? "Cr\u00e9ation..." : "Cr\u00e9er ce programme"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => { setPreview(null); setRawResponse(null); }}
              className="rounded-xl border border-border px-4 py-3.5 text-sm text-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
            >
              Refaire
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
