"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  X as XIcon,
  Sparkles,
  Play,
  Dumbbell,
  ArrowUp,
  ArrowDown,
  HeartPulse,
  Flame,
  Activity,
  Zap,
  ClipboardList,
} from "lucide-react";
import { EmptyState } from "@/app/_components/empty-state";
import { startSessionFromTemplateAction } from "../actions";
import type { TemplateListItem } from "@/lib/templates/types";

type Category =
  | "strength-upper"
  | "strength-lower"
  | "strength"
  | "cardio"
  | "hiit"
  | "mobility"
  | "endurance"
  | "default";

function slotCategory(name: string | null | undefined): Category {
  if (!name) return "default";
  const n = name.toLowerCase();
  if (/hiit|wod|crossfit|tabata|emom|amrap/.test(n)) return "hiit";
  if (/run|course|v[ée]lo|bike|cardio|swim|nat/.test(n)) return "cardio";
  if (/endur|long|sortie/.test(n)) return "endurance";
  if (/mobilit|yoga|stretch|souplesse/.test(n)) return "mobility";
  if (/upper|haut|push|pull|pec|\bbras\b|bench/.test(n)) return "strength-upper";
  if (/lower|jambe|bas|leg|squat|quad|fess|deadlift|soulev/.test(n))
    return "strength-lower";
  if (/force|muscu/.test(n)) return "strength";
  return "default";
}

const CATEGORY_STYLE: Record<
  Category,
  {
    band: string;
    tileBg: string;
    tileInk: string;
    chip: string;
    label: string;
    Picto: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  }
> = {
  "strength-upper": {
    band: "bg-accent",
    tileBg: "bg-accent-light",
    tileInk: "text-accent-ink",
    chip: "text-accent-ink",
    label: "Upper",
    Picto: ArrowUp,
  },
  "strength-lower": {
    band: "bg-[var(--accent-ink)]",
    tileBg: "bg-accent-light",
    tileInk: "text-accent-ink",
    chip: "text-accent-ink",
    label: "Lower",
    Picto: ArrowDown,
  },
  strength: {
    band: "bg-accent",
    tileBg: "bg-accent-light",
    tileInk: "text-accent-ink",
    chip: "text-accent-ink",
    label: "Force",
    Picto: Dumbbell,
  },
  cardio: {
    band: "bg-[var(--lavender-ink)]",
    tileBg: "bg-lavender-soft",
    tileInk: "text-lavender-ink",
    chip: "text-lavender-ink",
    label: "Cardio",
    Picto: HeartPulse,
  },
  hiit: {
    band: "bg-signal",
    tileBg: "bg-signal-light",
    tileInk: "text-signal-ink",
    chip: "text-signal-ink",
    label: "HIIT",
    Picto: Flame,
  },
  endurance: {
    band: "bg-[var(--butter-ink)]",
    tileBg: "bg-butter-soft",
    tileInk: "text-butter-ink",
    chip: "text-butter-ink",
    label: "Endur.",
    Picto: Activity,
  },
  mobility: {
    band: "bg-[var(--peach-ink)]",
    tileBg: "bg-peach-soft",
    tileInk: "text-peach-ink",
    chip: "text-peach-ink",
    label: "Mobilité",
    Picto: Zap,
  },
  default: {
    band: "bg-border",
    tileBg: "bg-surface-hover",
    tileInk: "text-subtle",
    chip: "text-subtle",
    label: "Séance",
    Picto: Dumbbell,
  },
};

type CategoryFilter = "all" | Category;

const FILTER_CHIPS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "strength-upper", label: "Upper" },
  { value: "strength-lower", label: "Lower" },
  { value: "hiit", label: "HIIT" },
  { value: "cardio", label: "Cardio" },
  { value: "mobility", label: "Mobilité" },
  { value: "endurance", label: "Endurance" },
];

type SortKey = "recent" | "name" | "used" | "long";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Récent" },
  { value: "name", label: "Nom A-Z" },
  { value: "used", label: "Plus utilisés" },
  { value: "long", label: "Plus longs" },
];

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatDurationMin(secs: number): string {
  const m = Math.max(1, Math.round(secs / 60));
  return `${m} min`;
}

export function TemplatesList({ templates }: { templates: TemplateListItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const enriched = useMemo(() => {
    return templates.map((t) => ({
      ...t,
      category: slotCategory(t.name),
      normName: normalize(t.name),
      normTags: t.tags.map((tag) => normalize(tag)),
    }));
  }, [templates]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    let list = enriched;
    if (q) {
      list = list.filter(
        (t) =>
          t.normName.includes(q) ||
          t.normTags.some((tag) => tag.includes(q)),
      );
    }
    if (filter !== "all") {
      list = list.filter((t) => t.category === filter);
    }
    const sorted = [...list];
    switch (sort) {
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name, "fr"));
        break;
      case "used":
        sorted.sort((a, b) => b.programUsageCount - a.programUsageCount);
        break;
      case "long":
        sorted.sort((a, b) => b.estimatedDurationSecs - a.estimatedDurationSecs);
        break;
      case "recent":
      default:
        sorted.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
    return sorted;
  }, [enriched, query, filter, sort]);

  const total = templates.length;
  const shown = filtered.length;
  const isFiltered = query.trim().length > 0 || filter !== "all";

  function handleStart(id: string) {
    setPendingId(id);
    startTransition(async () => {
      await startSessionFromTemplateAction(id);
    });
  }

  return (
    <div className="space-y-4">
      {/* Meta counter */}
      <p className="text-xs text-muted tabular-nums">
        {isFiltered ? `${shown} / ${total}` : `${total}`} modèle{total > 1 ? "s" : ""}
      </p>

      {/* Search bar */}
      <div className="relative">
        <Search
          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un modèle, un tag…"
          aria-label="Rechercher un modèle"
          className="w-full rounded-xl bg-surface border border-border pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:border-accent-ink transition-colors shadow-card"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Effacer la recherche"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-subtle hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <XIcon className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER_CHIPS.map((chip) => {
          const active = filter === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => setFilter(chip.value)}
              aria-pressed={active}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer border ${
                active
                  ? "bg-foreground text-background border-foreground"
                  : "bg-surface text-muted border-border hover:border-foreground/40 hover:text-foreground"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Sort row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {SORT_OPTIONS.map((opt) => {
            const active = sort === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSort(opt.value)}
                aria-pressed={active}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {total === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucun modèle"
          description="Un modèle est une séance réutilisable. Utilise le bouton ci-dessus pour en créer un."
        />
      ) : shown === 0 ? (
        <div className="rounded-2xl bg-surface shadow-card p-6 text-center">
          <p className="text-sm text-muted">
            Aucun résultat{query ? ` pour « ${query} »` : ""}.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((t) => {
            const style = CATEGORY_STYLE[t.category];
            const Picto = style.Picto;
            const isAI = t.source === "AI";
            const durationMin = formatDurationMin(t.estimatedDurationSecs);
            const isPending = pendingId === t.id;
            return (
              <li key={t.id}>
                <Link
                  href={`/templates/${t.id}`}
                  className="group/card relative block overflow-hidden rounded-2xl bg-surface shadow-card hover:shadow-hero hover:-translate-y-0.5 transition-all"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-0 bottom-0 w-1 ${style.band}`}
                  />
                  <div className="flex items-start gap-3 pl-4 pr-3 py-3">
                    <div
                      aria-hidden="true"
                      className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${style.tileBg} ${style.tileInk}`}
                    >
                      <Picto className="w-5 h-5" aria-hidden="true" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] uppercase tracking-widest font-bold ${style.chip}`}
                        >
                          {style.label}
                        </span>
                      </div>
                      <p className="font-display font-bold text-[15px] truncate mt-0.5">
                        {t.name}
                      </p>
                      {t.description && (
                        <p className="text-xs text-muted truncate mt-0.5">
                          {t.description}
                        </p>
                      )}

                      {/* Chip row */}
                      {(isAI || t.tags.length > 0) && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {isAI && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-wider">
                              <Sparkles className="w-3 h-3" aria-hidden="true" />
                              IA
                            </span>
                          )}
                          {t.tags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-full bg-surface-hover text-muted text-[10px] font-semibold"
                            >
                              {tag}
                            </span>
                          ))}
                          {t.tags.length > 4 && (
                            <span className="text-[10px] text-subtle">
                              +{t.tags.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Meta row */}
                      <p className="text-[11px] text-muted mt-2 tabular-nums">
                        {t.entryCount} exercice{t.entryCount > 1 ? "s" : ""}
                        {" · "}
                        {t.blockCount} bloc{t.blockCount > 1 ? "s" : ""}
                        {" · durée ~"}
                        {durationMin}
                        {t.programUsageCount > 0 && (
                          <>
                            {" · utilisé dans "}
                            {t.programUsageCount} programme
                            {t.programUsageCount > 1 ? "s" : ""}
                          </>
                        )}
                      </p>
                    </div>

                    {/* Quick action: Démarrer */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleStart(t.id);
                      }}
                      disabled={isPending}
                      aria-label={`Démarrer ${t.name}`}
                      className="shrink-0 self-center inline-flex items-center gap-1 rounded-lg bg-accent text-accent-foreground px-2.5 py-1.5 text-[11px] font-bold opacity-0 group-hover/card:opacity-100 focus:opacity-100 hover:bg-accent-hover transition-opacity cursor-pointer disabled:opacity-60"
                    >
                      <Play className="w-3 h-3" aria-hidden="true" />
                      {isPending ? "…" : "Démarrer"}
                    </button>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
