"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Repeat } from "lucide-react";
import type { TemplateDetail } from "@/lib/templates/types";
import {
  getTemplateDetailAction,
  updateTemplateEntryValuesAction,
} from "@/app/templates/actions";
import type { KpiValueInput } from "@/lib/workouts/types";

type Entry = TemplateDetail["blocks"][number]["entries"][number];
type KpiValue = Entry["values"][number];

type Props = {
  templateId: string;
  templateName: string | null;
  onChangeTemplate: () => void;
};

/**
 * Inline detail panel shown underneath a slot card when expanded. Loads the
 * template detail lazily (server action) and lets the user tweak planned KPI
 * values (weight, reps, duration, distance) for each entry without leaving
 * /programs/[id]. "Changer de modèle" reopens the picker for a full swap.
 * "Ouvrir le modèle complet" navigates to the template editor for structural
 * changes (add/remove exercise, reorder, etc.).
 */
export function SlotEntriesPanel({
  templateId,
  templateName,
  onChangeTemplate,
}: Props) {
  const [detail, setDetail] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset state when the target template id changes — React 19 "reset
  // during render" pattern avoids setState-in-effect.
  const [prevTemplateId, setPrevTemplateId] = useState(templateId);
  if (prevTemplateId !== templateId) {
    setPrevTemplateId(templateId);
    setDetail(null);
    setLoading(true);
    setError(null);
  }

  // Lazy-load template detail on mount / id change.
  useEffect(() => {
    let cancelled = false;
    getTemplateDetailAction(templateId)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Impossible de charger le modèle.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  return (
    <div className="rounded-2xl bg-surface-hover/60 border border-border/60 p-3 sm:p-4 space-y-3 animate-fade-in-up">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted">
            Contenu de la séance
          </p>
          <p className="text-sm font-display font-bold truncate">
            {templateName ?? "Modèle"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onChangeTemplate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <Repeat className="w-3 h-3" aria-hidden="true" />
            Changer de modèle
          </button>
          <Link
            href={`/templates/${templateId}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-foreground text-background px-3 py-1.5 text-[11px] font-semibold hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
            Ouvrir le modèle complet
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-subtle py-4 text-center">Chargement…</p>
      ) : error ? (
        <p className="text-xs text-danger py-4 text-center">{error}</p>
      ) : !detail || detail.blocks.length === 0 ? (
        <p className="text-xs text-subtle py-4 text-center">
          Ce modèle n&rsquo;a pas encore d&rsquo;exercice.{" "}
          <Link
            href={`/templates/${templateId}`}
            className="underline hover:text-foreground"
          >
            Ouvrir le modèle
          </Link>
        </p>
      ) : (
        <div className="space-y-3">
          {detail.blocks.map((block) => (
            <BlockSection key={block.id} templateId={templateId} block={block} />
          ))}
        </div>
      )}
    </div>
  );
}

function BlockSection({
  templateId,
  block,
}: {
  templateId: string;
  block: TemplateDetail["blocks"][number];
}) {
  if (block.entries.length === 0) return null;

  // Group entries by exercise so repeated sets collapse into a single card.
  const groups = new Map<string, Entry[]>();
  for (const e of block.entries) {
    const arr = groups.get(e.exercise.id) ?? [];
    arr.push(e);
    groups.set(e.exercise.id, arr);
  }

  return (
    <section className="space-y-2">
      <h4 className="text-[10px] uppercase tracking-widest font-bold text-ink-strong px-1">
        {block.name}
        {block.mode === "INTERVAL" && (
          <span className="ml-2 text-signal-ink">· HIIT</span>
        )}
      </h4>
      <div className="space-y-2">
        {Array.from(groups.values()).map((sets) => (
          <ExerciseGroup
            key={sets[0].id}
            templateId={templateId}
            sets={sets}
          />
        ))}
      </div>
    </section>
  );
}

function ExerciseGroup({
  templateId,
  sets,
}: {
  templateId: string;
  sets: Entry[];
}) {
  const first = sets[0];
  const type = first.exercise.type;
  return (
    <div className="rounded-xl bg-surface border border-border/80 overflow-hidden">
      <div className="px-3 py-2 border-b border-border/60 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold truncate">
          {first.exercise.name}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-subtle font-bold shrink-0">
          {type}
        </span>
      </div>
      <div className="divide-y divide-border/40">
        {sets.map((entry, idx) => (
          <EntryRow
            key={entry.id}
            templateId={templateId}
            entry={entry}
            setNumber={sets.length > 1 ? idx + 1 : null}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * For STRENGTH we render weight (kg) + reps. BODYWEIGHT: reps only.
 * CARDIO: duration (min) + distance (km). MOBILITY: duration (min).
 * Any KPI not matching those slugs is rendered as a generic numeric input so
 * odd templates (AI-generated, custom KPIs) remain editable.
 */
function EntryRow({
  templateId,
  entry,
  setNumber,
}: {
  templateId: string;
  entry: Entry;
  setNumber: number | null;
}) {
  const type = entry.exercise.type;
  // Which KPI slugs to expose, in display order, per exercise type.
  const exposed: Record<string, string[]> = {
    STRENGTH: ["weight_kg", "reps"],
    BODYWEIGHT: ["reps"],
    CARDIO: ["duration_secs", "distance_km"],
    MOBILITY: ["duration_secs"],
    REST: ["duration_secs"],
  };
  const wanted = exposed[type] ?? [];

  // Map KPI slug -> value row so we can render fields deterministically.
  const bySlug = new Map(entry.values.map((v) => [v.kpiSlug, v]));

  // Any KPI present on the entry but NOT in the exposed list — show them too
  // so we don't hide data the user entered elsewhere.
  const extras = entry.values.filter((v) => !wanted.includes(v.kpiSlug));

  return (
    <div className="px-3 py-2.5 flex items-center gap-2 flex-wrap">
      {setNumber != null && (
        <span className="text-[10px] font-bold tabular-nums text-subtle w-5 shrink-0">
          {setNumber}
        </span>
      )}
      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
        {wanted.map((slug) => {
          const v = bySlug.get(slug);
          if (!v) return null;
          return (
            <KpiField
              key={slug}
              templateId={templateId}
              entry={entry}
              value={v}
            />
          );
        })}
        {extras.map((v) => (
          <KpiField
            key={v.kpiDefinitionId}
            templateId={templateId}
            entry={entry}
            value={v}
          />
        ))}
      </div>
    </div>
  );
}

function KpiField({
  templateId,
  entry,
  value,
}: {
  templateId: string;
  entry: Entry;
  value: KpiValue;
}) {
  const [isPending, startTransition] = useTransition();
  const [local, setLocal] = useState<string>(() => formatValue(value));

  // Sync when the server pushes an updated value (revalidate after save).
  // React 19 "reset state during render" pattern — avoids setState-in-effect.
  const serverSnapshot = `${value.valueNumeric ?? ""}|${value.valueText ?? ""}`;
  const [prevSnapshot, setPrevSnapshot] = useState(serverSnapshot);
  if (prevSnapshot !== serverSnapshot) {
    setPrevSnapshot(serverSnapshot);
    setLocal(formatValue(value));
  }

  function persist(raw: string) {
    const parsed = parseValue(value, raw);
    // Skip if no change
    const sameNum =
      parsed.valueNumeric === (value.valueNumeric ?? null);
    const sameText =
      (parsed.valueText ?? null) === (value.valueText ?? null);
    if (sameNum && sameText) return;

    // Preserve the other KPIs on this entry (the mutation upserts only what
    // we send; existing rows stay untouched, but passing the single changed
    // KPI keeps the payload minimal).
    const payload: KpiValueInput[] = [
      {
        kpiDefinitionId: value.kpiDefinitionId,
        valueNumeric: parsed.valueNumeric,
        valueText: parsed.valueText,
      },
    ];
    startTransition(() => {
      updateTemplateEntryValuesAction(templateId, entry.id, payload);
    });
  }

  const label = kpiShortLabel(value);
  const isDuration = value.dataType === "DURATION";
  const inputMode: "decimal" | "numeric" | "text" =
    value.dataType === "INTEGER" || isDuration
      ? "numeric"
      : value.dataType === "DECIMAL"
        ? "decimal"
        : "text";

  return (
    <label className="inline-flex items-center gap-1.5 min-w-0">
      <span className="text-[10px] uppercase tracking-widest font-semibold text-subtle">
        {label}
      </span>
      <input
        type={value.dataType === "TEXT" ? "text" : "number"}
        inputMode={inputMode}
        step={value.dataType === "DECIMAL" ? "0.5" : "1"}
        value={local}
        disabled={isPending}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={(e) => persist(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setLocal(formatValue(value));
            (e.target as HTMLInputElement).blur();
          }
        }}
        aria-label={value.kpiName}
        className="w-16 rounded-lg bg-background border border-border px-2 py-1 text-xs font-semibold tabular-nums focus:outline-none focus:border-accent-ink transition-colors disabled:opacity-50"
      />
      {value.unit && value.dataType !== "DURATION" && (
        <span className="text-[10px] text-subtle">{value.unit}</span>
      )}
      {isDuration && <span className="text-[10px] text-subtle">sec</span>}
    </label>
  );
}

function formatValue(v: KpiValue): string {
  if (v.valueNumeric != null) return String(v.valueNumeric);
  if (v.valueText) return v.valueText;
  return "";
}

function parseValue(
  v: KpiValue,
  raw: string,
): { valueNumeric: number | null; valueText: string | null } {
  const trimmed = raw.trim();
  if (trimmed === "") return { valueNumeric: null, valueText: null };
  if (v.dataType === "TEXT") {
    return { valueNumeric: null, valueText: trimmed };
  }
  const n = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(n)) return { valueNumeric: null, valueText: null };
  return { valueNumeric: n, valueText: null };
}

/** Compact label for the KPI — prefer a short tag for common slugs. */
function kpiShortLabel(v: KpiValue): string {
  switch (v.kpiSlug) {
    case "weight_kg":
      return "Poids";
    case "reps":
      return "Reps";
    case "duration_secs":
      return "Durée";
    case "distance_km":
      return "Dist.";
    case "rpe":
      return "RPE";
    case "pace_min_per_km":
      return "Allure";
    default:
      return v.kpiName;
  }
}
