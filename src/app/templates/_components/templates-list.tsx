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
  Star,
  Trash2,
} from "lucide-react";
import { EmptyState } from "@/app/_components/empty-state";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import {
  bulkDeleteTemplatesAction,
  startSessionFromTemplateAction,
  toggleTemplateFavoriteAction,
} from "../actions";
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

type EnrichedTemplate = TemplateListItem & {
  category: Category;
  normName: string;
  normTags: string[];
};

export function TemplatesList({ templates }: { templates: TemplateListItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("recent");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [favPendingId, setFavPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [bulkPending, startBulkTransition] = useTransition();

  const enriched = useMemo<EnrichedTemplate[]>(() => {
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
    if (tagFilter) {
      const nt = normalize(tagFilter);
      list = list.filter((t) => t.normTags.some((tag) => tag === nt));
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
  }, [enriched, query, filter, tagFilter, sort]);

  const favorites = useMemo(
    () => filtered.filter((t) => t.isFavorite),
    [filtered],
  );
  const nonFavorites = useMemo(
    () => filtered.filter((t) => !t.isFavorite),
    [filtered],
  );

  const total = templates.length;
  const shown = filtered.length;
  const isFiltered =
    query.trim().length > 0 || filter !== "all" || tagFilter !== null;

  function handleStart(id: string) {
    setPendingId(id);
    startTransition(async () => {
      await startSessionFromTemplateAction(id);
    });
  }

  function handleToggleFav(id: string) {
    setFavPendingId(id);
    startTransition(async () => {
      await toggleTemplateFavoriteAction(id);
      setFavPendingId(null);
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setConfirmBulkDeleteOpen(false);
    startBulkTransition(async () => {
      await bulkDeleteTemplatesAction(ids);
      exitSelectionMode();
    });
  }

  function handleClickTag(tag: string) {
    setTagFilter((prev) => (prev === tag ? null : tag));
  }

  function renderCard(t: EnrichedTemplate) {
    const style = CATEGORY_STYLE[t.category];
    const Picto = style.Picto;
    const isAI = t.source === "AI";
    const durationMin = formatDurationMin(t.estimatedDurationSecs);
    const isPending = pendingId === t.id;
    const isFavPending = favPendingId === t.id;
    const isSelected = selectedIds.has(t.id);

    const cardInner = (
      <>
        <span
          aria-hidden="true"
          className={`absolute left-0 top-0 bottom-0 w-1 ${style.band}`}
        />
        <div className="flex items-start gap-3 pl-4 pr-3 py-3">
          {selectionMode && (
            <div className="shrink-0 self-center">
              <span
                aria-hidden="true"
                className={`flex items-center justify-center w-5 h-5 rounded-md border-2 transition-colors ${
                  isSelected
                    ? "bg-accent border-accent text-accent-foreground"
                    : "bg-surface border-border"
                }`}
              >
                {isSelected && (
                  <svg
                    viewBox="0 0 16 16"
                    className="w-3.5 h-3.5"
                    aria-hidden="true"
                  >
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 8l3 3 7-7"
                    />
                  </svg>
                )}
              </span>
            </div>
          )}
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

            {(isAI || t.tags.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {isAI && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" aria-hidden="true" />
                    IA
                  </span>
                )}
                {t.tags.slice(0, 4).map((tag) => {
                  const active = tagFilter === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      disabled={selectionMode}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (selectionMode) return;
                        handleClickTag(tag);
                      }}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                        active
                          ? "bg-foreground text-background"
                          : "bg-surface-hover text-muted hover:bg-foreground/10 hover:text-foreground"
                      } ${selectionMode ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
                      aria-pressed={active}
                      aria-label={`Filtrer par tag ${tag}`}
                    >
                      {tag}
                    </button>
                  );
                })}
                {t.tags.length > 4 && (
                  <span className="text-[10px] text-subtle">
                    +{t.tags.length - 4}
                  </span>
                )}
              </div>
            )}

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

          {!selectionMode && (
            <div className="shrink-0 self-center flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleToggleFav(t.id);
                }}
                disabled={isFavPending}
                aria-label={
                  t.isFavorite
                    ? `Retirer ${t.name} des favoris`
                    : `Ajouter ${t.name} aux favoris`
                }
                aria-pressed={t.isFavorite}
                className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-60"
              >
                <Star
                  className={`w-4 h-4 ${
                    t.isFavorite
                      ? "fill-[var(--butter-ink)] text-[var(--butter-ink)]"
                      : ""
                  }`}
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleStart(t.id);
                }}
                disabled={isPending}
                aria-label={`Démarrer ${t.name}`}
                className="inline-flex items-center gap-1 rounded-lg bg-accent text-accent-foreground px-2.5 py-1.5 text-[11px] font-bold opacity-0 group-hover/card:opacity-100 focus:opacity-100 hover:bg-accent-hover transition-opacity cursor-pointer disabled:opacity-60"
              >
                <Play className="w-3 h-3" aria-hidden="true" />
                {isPending ? "…" : "Démarrer"}
              </button>
            </div>
          )}
        </div>
      </>
    );

    const commonClass =
      "group/card relative block overflow-hidden rounded-2xl bg-surface shadow-card hover:shadow-hero hover:-translate-y-0.5 transition-all";

    if (selectionMode) {
      return (
        <li key={t.id}>
          <button
            type="button"
            onClick={() => toggleSelect(t.id)}
            aria-pressed={isSelected}
            className={`${commonClass} w-full text-left ${
              isSelected ? "ring-2 ring-accent" : ""
            } cursor-pointer`}
          >
            {cardInner}
          </button>
        </li>
      );
    }

    return (
      <li key={t.id}>
        <Link href={`/templates/${t.id}`} className={commonClass}>
          {cardInner}
        </Link>
      </li>
    );
  }

  return (
    <div className="space-y-4">
      {/* Meta counter + selection toggle */}
      <div className="flex items-center justify-between gap-2">
        {selectionMode ? (
          <p className="text-xs font-semibold tabular-nums">
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
          </p>
        ) : (
          <p className="text-xs text-muted tabular-nums">
            {isFiltered ? `${shown} / ${total}` : `${total}`} modèle
            {total > 1 ? "s" : ""}
          </p>
        )}
        {total > 0 && (
          <div className="flex items-center gap-2">
            {selectionMode ? (
              <>
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="text-xs font-semibold text-muted hover:text-foreground cursor-pointer transition-colors"
                  >
                    Tout désélectionner
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmBulkDeleteOpen(true)}
                  disabled={selectedIds.size === 0 || bulkPending}
                  className="inline-flex items-center gap-1 rounded-lg bg-danger text-accent-foreground px-2.5 py-1.5 text-[11px] font-bold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3 h-3" aria-hidden="true" />
                  Supprimer ({selectedIds.size})
                </button>
                <button
                  type="button"
                  onClick={exitSelectionMode}
                  className="text-xs font-semibold text-muted hover:text-foreground cursor-pointer transition-colors"
                >
                  Annuler
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setSelectionMode(true)}
                className="text-xs font-semibold text-muted hover:text-foreground cursor-pointer transition-colors"
              >
                Sélectionner
              </button>
            )}
          </div>
        )}
      </div>

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

      {/* Active tag filter */}
      {tagFilter && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted">Filtre tag :</span>
          <button
            type="button"
            onClick={() => setTagFilter(null)}
            className="inline-flex items-center gap-1 rounded-full bg-foreground text-background px-2.5 py-1 text-[11px] font-semibold cursor-pointer hover:opacity-90 transition-opacity"
            aria-label={`Retirer le filtre tag ${tagFilter}`}
          >
            {tagFilter}
            <XIcon className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      )}

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
        <div className="space-y-5">
          {favorites.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-[11px] uppercase tracking-widest font-bold text-muted flex items-center gap-1.5">
                <Star
                  className="w-3.5 h-3.5 fill-[var(--butter-ink)] text-[var(--butter-ink)]"
                  aria-hidden="true"
                />
                Favoris · {favorites.length}
              </h2>
              <ul className="space-y-2.5">{favorites.map(renderCard)}</ul>
            </section>
          )}
          {nonFavorites.length > 0 && (
            <ul className="space-y-2.5">{nonFavorites.map(renderCard)}</ul>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmBulkDeleteOpen}
        title={`Supprimer ${selectedIds.size} modèle${selectedIds.size > 1 ? "s" : ""} ?`}
        message="Cette action est définitive. Les séances déjà lancées depuis ces modèles ne seront pas affectées."
        confirmLabel="Supprimer"
        destructive
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulkDeleteOpen(false)}
      />
    </div>
  );
}
