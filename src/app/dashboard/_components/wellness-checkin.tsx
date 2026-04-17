"use client";

import { useState, useTransition } from "react";
import { upsertWellnessLogAction } from "@/app/wellness/actions";
import { useToast } from "@/app/_components/toast";

type Props = {
  existingLog?: {
    mood: number;
    sleep: number;
    energy: number;
    stress: number;
    notes: string | null;
  } | null;
};

const MOOD_LABELS = ["", "Tr\u00e8s mal", "Mal", "Normal", "Bien", "Tr\u00e8s bien"];
const SLEEP_LABELS = ["", "Tr\u00e8s mal", "Mal", "Correct", "Bien", "Excellent"];
const ENERGY_LABELS = ["", "\u00c9puis\u00e9", "Fatigu\u00e9", "Normal", "\u00c9nergique", "Plein d'\u00e9nergie"];
const STRESS_LABELS = ["", "Tr\u00e8s stress\u00e9", "Stress\u00e9", "Normal", "D\u00e9tendu", "Tr\u00e8s d\u00e9tendu"];

// Emojis picked for monotonic progression (worst \u2192 best) and distinctness.
const MOOD_EMOJI = ["", "\ud83d\ude2b", "\ud83d\ude1f", "\ud83d\ude10", "\ud83d\ude0a", "\ud83d\ude04"];
const SLEEP_EMOJI = ["", "\ud83d\ude35", "\ud83d\ude2a", "\ud83d\ude34", "\ud83d\ude0c", "\u2728"];
const ENERGY_EMOJI = ["", "\ud83e\udd74", "\ud83d\ude2a", "\ud83d\ude10", "\u26a1", "\ud83d\udd25"];
const STRESS_EMOJI = ["", "\ud83d\ude30", "\ud83d\ude23", "\ud83d\ude10", "\ud83d\ude0c", "\ud83e\uddd8"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function RatingRow({
  label,
  emojis,
  labels,
  value,
  onChange,
}: {
  label: string;
  emojis: string[];
  labels: string[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs text-muted">{label}</span>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const isActive = n === value;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-label={`${label} : ${labels[n]}`}
              aria-pressed={isActive}
              className={`flex-1 rounded-lg py-1.5 px-1 flex flex-col items-center gap-0.5 cursor-pointer transition-all ${
                isActive
                  ? "bg-accent/15 border-2 border-accent scale-105"
                  : "bg-surface border border-border hover:border-accent/50"
              }`}
            >
              <span className="text-base leading-none">{emojis[n]}</span>
              <span
                className={`text-[9px] leading-tight text-center ${
                  isActive ? "text-accent font-semibold" : "text-subtle"
                }`}
              >
                {labels[n]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function WellnessCheckin({ existingLog }: Props) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [date, setDate] = useState<string>(todayIso());
  const [mood, setMood] = useState(existingLog?.mood ?? 3);
  const [sleep, setSleep] = useState(existingLog?.sleep ?? 3);
  const [energy, setEnergy] = useState(existingLog?.energy ?? 3);
  const [stress, setStress] = useState(existingLog?.stress ?? 3);
  const [notes, setNotes] = useState(existingLog?.notes ?? "");
  const [saved, setSaved] = useState(!!existingLog);

  const today = todayIso();
  const minDate = isoDaysAgo(30);
  const isBackfill = date !== today;

  function handleSave() {
    startTransition(async () => {
      try {
        await upsertWellnessLogAction({
          date,
          mood,
          sleep,
          energy,
          stress,
          notes: notes.trim() || null,
        });
        if (!isBackfill) {
          setSaved(true);
        }
        setExpanded(false);
        toast.show(
          isBackfill
            ? "Bien-être enregistré pour ce jour"
            : "Bien-être du jour enregistré",
          { kind: "success" },
        );
      } catch {
        toast.show("Impossible d'enregistrer le bien-être", { kind: "error" });
      }
    });
  }

  if (saved && !expanded) {
    const todayLabel = new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date());
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full rounded-xl border border-border bg-surface p-3.5 flex items-center justify-between hover:bg-surface-hover transition-colors cursor-pointer"
      >
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-xs text-muted">Bien-&ecirc;tre du jour</span>
          <span className="text-[10px] text-subtle">{todayLabel}</span>
        </div>
        <span className="text-sm">
          {MOOD_EMOJI[mood]} {SLEEP_EMOJI[sleep]} {ENERGY_EMOJI[energy]} {STRESS_EMOJI[stress]}
        </span>
      </button>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full rounded-xl border border-dashed border-border p-3.5 text-xs text-muted hover:text-foreground hover:border-accent transition-colors cursor-pointer text-center"
      >
        Comment te sens-tu aujourd&rsquo;hui ?
      </button>
    );
  }

  return (
    <div id="wellness" className="rounded-xl border border-border bg-surface p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
          Bien-&ecirc;tre
          {isBackfill && (
            <span className="ml-2 text-[10px] text-accent normal-case">Rattrapage</span>
          )}
        </h3>
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            setDate(today);
          }}
          className="text-xs text-subtle hover:text-foreground cursor-pointer transition-colors"
        >
          Fermer
        </button>
      </div>

      <RatingRow label="Humeur" emojis={MOOD_EMOJI} labels={MOOD_LABELS} value={mood} onChange={setMood} />
      <RatingRow label="Sommeil" emojis={SLEEP_EMOJI} labels={SLEEP_LABELS} value={sleep} onChange={setSleep} />
      <RatingRow label="&Eacute;nergie" emojis={ENERGY_EMOJI} labels={ENERGY_LABELS} value={energy} onChange={setEnergy} />
      <RatingRow label="Stress" emojis={STRESS_EMOJI} labels={STRESS_LABELS} value={stress} onChange={setStress} />

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Note du jour (optionnel) — ex: bas du dos tendu, présentation stressante demain, cycle J3…"
        rows={2}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors resize-none"
      />

      <label className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/60 px-3 py-2">
        <span className="text-xs text-muted">Date</span>
        <input
          type="date"
          value={date}
          min={minDate}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          className="bg-transparent text-sm outline-none tabular-nums"
        />
      </label>

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="w-full rounded-lg bg-accent text-white py-2.5 text-sm font-semibold hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50"
      >
        {isPending ? "Sauvegarde\u2026" : "Enregistrer"}
      </button>
    </div>
  );
}
