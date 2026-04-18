"use client";

import { useMemo, useState, useTransition } from "react";
import {
  confirmAITemplateAction,
  generateAITemplateVariantsAction,
} from "@/app/templates/actions";
import {
  type GeneratedTemplate,
  parseGeneratedTemplate,
} from "@/lib/mentor/parser";
import { Card } from "@/app/_components/card";

type Props = { exerciseCount: number };

type Intensity = "LIGHT" | "MODERATE" | "INTENSE";

const INTENSITIES: { value: Intensity; label: string }[] = [
  { value: "LIGHT", label: "Léger" },
  { value: "MODERATE", label: "Modéré" },
  { value: "INTENSE", label: "Intense" },
];

const EQUIPMENT_OPTIONS = [
  "Poids de corps",
  "Haltères",
  "Barre",
  "Kettlebell",
  "Machine",
  "Élastiques",
  "Cardio",
];

const ZONE_OPTIONS = [
  "Haut du corps",
  "Bas du corps",
  "Core",
  "Cardio",
  "Mobilité",
];

type PresetConfig = {
  label: string;
  duration: number;
  intensity: Intensity;
  equipment: string[];
  zones: string[];
  hint: string;
};

const PRESETS: PresetConfig[] = [
  {
    label: "Push — Pecs/Épaules/Triceps",
    duration: 60,
    intensity: "MODERATE",
    equipment: ["Haltères", "Barre"],
    zones: ["Haut du corps"],
    hint: "Séance Push axée pecs, épaules et triceps.",
  },
  {
    label: "Pull — Dos/Biceps",
    duration: 60,
    intensity: "MODERATE",
    equipment: ["Haltères", "Barre"],
    zones: ["Haut du corps"],
    hint: "Séance Pull axée dos et biceps.",
  },
  {
    label: "Jambes complet",
    duration: 75,
    intensity: "INTENSE",
    equipment: ["Barre", "Machine"],
    zones: ["Bas du corps"],
    hint: "Jambes complet : quadriceps, ischios, fessiers.",
  },
  {
    label: "Full Body express",
    duration: 45,
    intensity: "MODERATE",
    equipment: [],
    zones: ["Haut du corps", "Bas du corps"],
    hint: "Full body express, 5-6 exercices composés.",
  },
  {
    label: "Cardio + mobilité",
    duration: 45,
    intensity: "LIGHT",
    equipment: ["Cardio"],
    zones: ["Cardio", "Mobilité"],
    hint: "Mix cardio continu et mobilité.",
  },
  {
    label: "Récupération",
    duration: 30,
    intensity: "LIGHT",
    equipment: ["Poids de corps"],
    zones: ["Mobilité"],
    hint: "Récupération active : mobilité, étirements, cardio très léger.",
  },
];

type Variant = {
  raw: string;
  parsed: GeneratedTemplate;
  exerciseCount: number;
  estimatedDurationMin: number;
};

function estimateDurationMin(t: GeneratedTemplate): number {
  let secs = 0;
  for (const block of t.blocks) {
    for (const ex of block.exercises) {
      const sets = Math.max(1, ex.sets ?? 1);
      if (ex.type === "CARDIO" || ex.type === "MOBILITY") {
        secs += (ex.duration_secs ?? 0) * sets;
      } else {
        // ~45s per set of work + ~75s rest
        secs += sets * (45 + 75);
      }
    }
  }
  return Math.max(5, Math.round(secs / 60));
}

function toVariant(raw: string): Variant | null {
  const parsed = parseGeneratedTemplate(raw);
  if (!parsed) return null;
  return {
    raw,
    parsed,
    exerciseCount: parsed.blocks.reduce(
      (s, b) => s + b.exercises.length,
      0,
    ),
    estimatedDurationMin: estimateDurationMin(parsed),
  };
}

export function AICreateTemplateForm({ exerciseCount }: Props) {
  const [duration, setDuration] = useState(60);
  const [intensity, setIntensity] = useState<Intensity>("MODERATE");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [freeform, setFreeform] = useState("");

  const [variants, setVariants] = useState<Variant[] | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canGenerate = useMemo(
    () => equipment.length > 0 || zones.length > 0 || freeform.trim().length > 0,
    [equipment, zones, freeform],
  );

  function toggle(list: string[], value: string): string[] {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }

  function applyPreset(p: PresetConfig) {
    setDuration(p.duration);
    setIntensity(p.intensity);
    setEquipment(p.equipment);
    setZones(p.zones);
    setFreeform(p.hint);
    setVariants(null);
    setSelectedIdx(null);
    setError(null);
  }

  function handleGenerate() {
    setError(null);
    setVariants(null);
    setSelectedIdx(null);
    startTransition(async () => {
      const result = await generateAITemplateVariantsAction({
        duration,
        intensity,
        equipment,
        targetZones: zones,
        freeform,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      const mapped = result.previews
        .map(toVariant)
        .filter((v): v is Variant => v !== null);
      if (mapped.length === 0) {
        setError("L'IA a répondu mais aucun format n'est exploitable. Réessaie.");
        return;
      }
      setVariants(mapped);
      if (mapped.length === 1) setSelectedIdx(0);
    });
  }

  function handleConfirm() {
    if (variants == null || selectedIdx == null) return;
    const v = variants[selectedIdx];
    startTransition(async () => {
      const result = await confirmAITemplateAction(v.raw);
      if (result?.error) setError(result.error);
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

  // ── Variant selection view ───────────────────────────────────────
  if (variants && variants.length > 1) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-muted">
          {variants.length} variantes générées. Choisis celle qui te parle le plus.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {variants.map((v, i) => {
            const isSelected = selectedIdx === i;
            const dimmed = selectedIdx != null && !isSelected;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedIdx(i)}
                className={[
                  "text-left rounded-2xl bg-surface shadow-card p-4 border transition-all cursor-pointer",
                  isSelected
                    ? "border-accent-ink ring-2 ring-accent-ink shadow-hero"
                    : "border-border hover:-translate-y-0.5 hover:shadow-hero",
                  dimmed ? "opacity-40" : "",
                ].join(" ")}
              >
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted">
                  Variante {i + 1}
                </p>
                <h3 className="font-display font-bold text-base mt-1 leading-tight">
                  {v.parsed.name}
                </h3>
                <p className="text-xs text-muted mt-2 tabular-nums">
                  {v.parsed.blocks.length} bloc
                  {v.parsed.blocks.length > 1 ? "s" : ""} ·{" "}
                  {v.exerciseCount} exercice
                  {v.exerciseCount > 1 ? "s" : ""} · ~
                  {v.estimatedDurationMin} min
                </p>
                <ul className="mt-3 space-y-1">
                  {v.parsed.blocks.slice(0, 4).map((b, bi) => (
                    <li key={bi} className="text-xs text-muted truncate">
                      · {b.name}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {selectedIdx != null && (
          <VariantDetails variant={variants[selectedIdx]} />
        )}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending || selectedIdx == null}
            onClick={handleConfirm}
            className="flex-1 rounded-xl bg-foreground text-background py-3.5 font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-card"
          >
            {isPending
              ? "Création…"
              : selectedIdx == null
                ? "Choisis une variante"
                : "Créer ce modèle"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleGenerate}
            className="rounded-xl border border-border bg-surface px-4 py-3.5 text-sm font-medium text-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
          >
            Refaire 3 variantes
          </button>
        </div>

        {error && (
          <Card variant="danger" rounded="2xl" padding="md" as="div" role="alert">
            <p className="text-sm text-danger font-medium">{error}</p>
          </Card>
        )}
      </div>
    );
  }

  // ── Single-variant fallback (behaves like old flow) ──────────────
  if (variants && variants.length === 1) {
    const v = variants[0];
    return (
      <div className="space-y-4">
        <section className="rounded-3xl bg-foreground text-background p-5 shadow-hero">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-accent">
            Aperçu du modèle
          </p>
          <h2 className="font-display font-extrabold text-xl tracking-tight mt-1">
            {v.parsed.name}
          </h2>
          <p className="text-xs text-background/70 mt-1 tabular-nums">
            {v.parsed.blocks.length} bloc
            {v.parsed.blocks.length > 1 ? "s" : ""} · {v.exerciseCount} exercice
            {v.exerciseCount > 1 ? "s" : ""} · ~{v.estimatedDurationMin} min
          </p>
        </section>

        <VariantDetails variant={v} />

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
            onClick={handleGenerate}
            className="rounded-xl border border-border bg-surface px-4 py-3.5 text-sm font-medium text-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
          >
            Refaire
          </button>
        </div>

        {error && (
          <Card variant="danger" rounded="2xl" padding="md" as="div" role="alert">
            <p className="text-sm text-danger font-medium">{error}</p>
          </Card>
        )}
      </div>
    );
  }

  // ── Constructor form ─────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Configure les paramètres — l&rsquo;IA pioche UNIQUEMENT dans tes exercices
        existants et te proposera 3 variantes.
      </p>

      {/* Presets */}
      <section className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted">
          Presets rapides
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              disabled={isPending}
              onClick={() => applyPreset(p)}
              className="rounded-2xl bg-surface shadow-card p-3 text-left text-xs font-medium hover:shadow-hero hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      {/* Duration slider */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <label
            htmlFor="duration-slider"
            className="text-[10px] uppercase tracking-widest font-semibold text-muted"
          >
            Durée
          </label>
          <span className="text-sm font-semibold tabular-nums">
            {duration} min
          </span>
        </div>
        <input
          id="duration-slider"
          type="range"
          min={15}
          max={120}
          step={5}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          disabled={isPending}
          className="w-full accent-accent-ink cursor-pointer disabled:opacity-50"
        />
        <div className="flex justify-between text-[10px] text-muted tabular-nums">
          <span>15</span>
          <span>60</span>
          <span>120</span>
        </div>
      </section>

      {/* Intensity */}
      <section className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted">
          Intensité
        </p>
        <div className="grid grid-cols-3 gap-2">
          {INTENSITIES.map((opt) => {
            const active = intensity === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={isPending}
                onClick={() => setIntensity(opt.value)}
                className={[
                  "rounded-full py-2.5 text-sm font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                  active
                    ? "bg-accent text-accent-foreground shadow-card"
                    : "bg-surface border border-border text-muted hover:text-foreground",
                ].join(" ")}
                aria-pressed={active}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Equipment */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted">
            Équipement
          </p>
          <span className="text-[10px] text-muted">
            {equipment.length === 0 ? "tout autorisé" : `${equipment.length} sélectionné${equipment.length > 1 ? "s" : ""}`}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_OPTIONS.map((opt) => {
            const active = equipment.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                disabled={isPending}
                onClick={() => setEquipment((cur) => toggle(cur, opt))}
                aria-pressed={active}
                className={[
                  "rounded-full px-3.5 py-1.5 text-xs font-medium border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                  active
                    ? "bg-accent text-accent-foreground border-accent-ink shadow-card"
                    : "bg-surface text-muted border-border hover:text-foreground",
                ].join(" ")}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </section>

      {/* Target zones */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted">
            Zones ciblées
          </p>
          <span className="text-[10px] text-muted">
            {zones.length === 0 ? "au choix du coach" : `${zones.length} sélectionnée${zones.length > 1 ? "s" : ""}`}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {ZONE_OPTIONS.map((opt) => {
            const active = zones.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                disabled={isPending}
                onClick={() => setZones((cur) => toggle(cur, opt))}
                aria-pressed={active}
                className={[
                  "rounded-full px-3.5 py-1.5 text-xs font-medium border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                  active
                    ? "bg-accent text-accent-foreground border-accent-ink shadow-card"
                    : "bg-surface text-muted border-border hover:text-foreground",
                ].join(" ")}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </section>

      {/* Freeform */}
      <section className="space-y-2">
        <label className="block">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-muted">
            Précisions libres
          </span>
          <textarea
            value={freeform}
            onChange={(e) => setFreeform(e.target.value)}
            placeholder="Ex : éviter les squats (genou), finir par du gainage, pyramide montante…"
            rows={3}
            disabled={isPending}
            className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm focus:outline-none focus:border-accent-ink transition-colors resize-none disabled:opacity-50"
          />
        </label>
      </section>

      {/* CTA */}
      <button
        type="button"
        disabled={isPending || !canGenerate}
        onClick={handleGenerate}
        className="w-full rounded-xl bg-foreground text-background py-3.5 font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-card"
      >
        {isPending ? "Génération des 3 variantes…" : "Générer 3 variantes"}
      </button>
      {!canGenerate && (
        <p className="text-xs text-muted text-center -mt-3">
          Sélectionne au moins une zone, un équipement, ou écris des précisions.
        </p>
      )}

      {isPending && (
        <Card rounded="2xl" padding="xl" className="text-center">
          <div
            className="inline-block w-6 h-6 border-2 border-accent-ink border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
          <p className="text-sm text-muted mt-3">
            L&rsquo;IA compose 3 versions en parallèle…
          </p>
        </Card>
      )}

      {error && (
        <Card variant="danger" rounded="2xl" padding="md" as="div" role="alert">
          <p className="text-sm text-danger font-medium">{error}</p>
        </Card>
      )}
    </div>
  );
}

function VariantDetails({ variant }: { variant: Variant }) {
  return (
    <div className="space-y-3">
      {variant.parsed.blocks.map((block, bi) => (
        <Card key={bi} rounded="2xl" padding="lg" className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted">
            {block.name}
          </p>
          <div className="space-y-1">
            {block.exercises.map((ex, ei) => (
              <div
                key={ei}
                className="flex items-baseline justify-between gap-3 text-xs"
              >
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
    </div>
  );
}
