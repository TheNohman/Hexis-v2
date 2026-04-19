"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  X as XIcon,
  Sparkles,
  Calendar,
  Star,
  Trash2,
} from "lucide-react";
import { EmptyState } from "@/app/_components/empty-state";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import {
  bulkDeleteProgramsAction,
  toggleProgramFavoriteAction,
} from "@/app/programs/actions";
import type { ProgramListItem } from "@/lib/programs/types";

type ActiveFilter = "all" | "active" | "inactive";

const ACTIVE_CHIPS: { value: ActiveFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "active", label: "Actifs" },
  { value: "inactive", label: "Inactifs" },
];

type SortKey = "recent" | "name" | "active" | "sessions";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Récent" },
  { value: "name", label: "Nom A-Z" },
  { value: "active", label: "Actif en premier" },
  { value: "sessions", label: "Plus de séances" },
];

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

type EnrichedProgram = ProgramListItem & {
  normName: string;
  normTags: string[];
};

export function ProgramsList({ programs }: { programs: ProgramListItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ActiveFilter>("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("recent");
  const [favPendingId, setFavPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [bulkPending, startBulkTransition] = useTransition();

  const enriched = useMemo<EnrichedProgram[]>(() => {
    return programs.map((p) => ({
      ...p,
      normName: normalize(p.name),
      normTags: p.tags.map((tag) => normalize(tag)),
    }));
  }, [programs]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    let list = enriched;
    if (q) {
      list = list.filter(
        (p) =>
          p.normName.includes(q) || p.normTags.some((tag) => tag.includes(q)),
      );
    }
    if (filter === "active") list = list.filter((p) => p.isActive);
    if (filter === "inactive") list = list.filter((p) => !p.isActive);
    if (tagFilter) {
      const nt = normalize(tagFilter);
      list = list.filter((p) => p.normTags.some((tag) => tag === nt));
    }
    const sorted = [...list];
    switch (sort) {
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name, "fr"));
        break;
      case "active":
        sorted.sort((a, b) => {
          if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        });
        break;
      case "sessions":
        sorted.sort((a, b) => b.populatedSlotCount - a.populatedSlotCount);
        break;
      case "recent":
      default:
        sorted.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
    return sorted;
  }, [enriched, query, filter, tagFilter, sort]);

  const favorites = useMemo(
    () => filtered.filter((p) => p.isFavorite),
    [filtered],
  );
  const nonFavorites = useMemo(
    () => filtered.filter((p) => !p.isFavorite),
    [filtered],
  );

  const total = programs.length;
  const shown = filtered.length;
  const isFiltered =
    query.trim().length > 0 || filter !== "all" || tagFilter !== null;

  function handleToggleFav(id: string) {
    setFavPendingId(id);
    startTransition(async () => {
      await toggleProgramFavoriteAction(id);
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
      await bulkDeleteProgramsAction(ids);
      exitSelectionMode();
    });
  }

  function handleClickTag(tag: string) {
    setTagFilter((prev) => (prev === tag ? null : tag));
  }

  function renderCard(p: EnrichedProgram) {
    const isAI = p.source === "AI";
    const isFavPending = favPendingId === p.id;
    const isSelected = selectedIds.has(p.id);

    const cardInner = (
      <>
        <div className="flex items-start gap-3 p-4">
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

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-display font-bold text-[15px] truncate">
                {p.name}
              </p>
              {p.isActive && (
                <span className="shrink-0 inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent-foreground">
                  Actif
                </span>
              )}
            </div>

            {(isAI || p.tags.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {isAI && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" aria-hidden="true" />
                    IA
                  </span>
                )}
                {p.tags.slice(0, 4).map((tag) => {
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
                {p.tags.length > 4 && (
                  <span className="text-[10px] text-subtle">
                    +{p.tags.length - 4}
                  </span>
                )}
              </div>
            )}

            <p className="text-[11px] text-muted mt-2 tabular-nums">
              {p.cycleCount} cycle{p.cycleCount > 1 ? "s" : ""} de {p.cycleDays}
              j
              {" · "}
              {p.slotCount} créneau{p.slotCount > 1 ? "x" : ""}
              {p.populatedSlotCount > 0 && p.populatedSlotCount !== p.slotCount && (
                <>
                  {" · "}
                  {p.populatedSlotCount} assigné
                  {p.populatedSlotCount > 1 ? "s" : ""}
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
                  handleToggleFav(p.id);
                }}
                disabled={isFavPending}
                aria-label={
                  p.isFavorite
                    ? `Retirer ${p.name} des favoris`
                    : `Ajouter ${p.name} aux favoris`
                }
                aria-pressed={p.isFavorite}
                className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-60"
              >
                <Star
                  className={`w-4 h-4 ${
                    p.isFavorite
                      ? "fill-[var(--butter-ink)] text-[var(--butter-ink)]"
                      : ""
                  }`}
                  aria-hidden="true"
                />
              </button>
              <span
                aria-hidden="true"
                className="text-subtle pl-1"
              >
                →
              </span>
            </div>
          )}
        </div>
      </>
    );

    const commonClass =
      "group/card relative block overflow-hidden rounded-2xl bg-surface shadow-card hover:shadow-hero hover:-translate-y-0.5 transition-all";

    if (selectionMode) {
      return (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => toggleSelect(p.id)}
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
      <li key={p.id}>
        <Link href={`/programs/${p.id}`} className={commonClass}>
          {cardInner}
        </Link>
      </li>
    );
  }

  if (total === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Aucun programme"
        description="Crée un programme pour planifier tes semaines d&rsquo;entraînement."
      />
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
            {isFiltered ? `${shown} / ${total}` : `${total}`} programme
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
          placeholder="Rechercher un programme, un tag…"
          aria-label="Rechercher un programme"
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

      {/* Active-state chips */}
      <div className="flex flex-wrap gap-1.5">
        {ACTIVE_CHIPS.map((chip) => {
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
      {shown === 0 ? (
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
        title={`Supprimer ${selectedIds.size} programme${selectedIds.size > 1 ? "s" : ""} ?`}
        message="Cette action est définitive. Les séances déjà enregistrées restent dans ton historique."
        confirmLabel="Supprimer"
        destructive
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulkDeleteOpen(false)}
      />
    </div>
  );
}
