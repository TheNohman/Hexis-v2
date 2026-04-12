"use client";

import { useState, useTransition } from "react";
import { upsertWellnessLogAction } from "@/app/wellness/actions";

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

const MOOD_EMOJI = ["", "\ud83d\ude2b", "\ud83d\ude1f", "\ud83d\ude10", "\ud83d\ude0a", "\ud83d\ude04"];
const SLEEP_EMOJI = ["", "\ud83d\ude34", "\ud83d\ude25", "\ud83d\ude0c", "\ud83d\ude34", "\u2b50"];
const ENERGY_EMOJI = ["", "\ud83e\udead", "\ud83e\udd71", "\ud83d\ude10", "\u26a1", "\ud83d\udd25"];
const STRESS_EMOJI = ["", "\ud83d\ude30", "\ud83d\ude1f", "\ud83d\ude10", "\ud83d\ude0c", "\ud83e\uddd8"];

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
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{label}</span>
        <span className="text-xs text-subtle">{labels[value]}</span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 rounded-lg py-2 text-center text-base cursor-pointer transition-all ${
              n === value
                ? "bg-accent/15 border-2 border-accent scale-105"
                : "bg-surface border border-border hover:border-accent/50"
            }`}
          >
            {emojis[n]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function WellnessCheckin({ existingLog }: Props) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [mood, setMood] = useState(existingLog?.mood ?? 3);
  const [sleep, setSleep] = useState(existingLog?.sleep ?? 3);
  const [energy, setEnergy] = useState(existingLog?.energy ?? 3);
  const [stress, setStress] = useState(existingLog?.stress ?? 3);
  const [notes, setNotes] = useState(existingLog?.notes ?? "");
  const [saved, setSaved] = useState(!!existingLog);

  function handleSave() {
    const today = new Date().toISOString().slice(0, 10);
    startTransition(async () => {
      await upsertWellnessLogAction({
        date: today,
        mood,
        sleep,
        energy,
        stress,
        notes: notes.trim() || null,
      });
      setSaved(true);
      setExpanded(false);
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
    <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
          Bien-&ecirc;tre du jour
        </h3>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs text-subtle hover:text-foreground cursor-pointer transition-colors"
        >
          Fermer
        </button>
      </div>

      <RatingRow label="Humeur" emojis={MOOD_EMOJI} labels={MOOD_LABELS} value={mood} onChange={setMood} />
      <RatingRow label="Sommeil" emojis={SLEEP_EMOJI} labels={SLEEP_LABELS} value={sleep} onChange={setSleep} />
      <RatingRow label="&Eacute;nergie" emojis={ENERGY_EMOJI} labels={ENERGY_LABELS} value={energy} onChange={setEnergy} />
      <RatingRow label="Stress" emojis={STRESS_EMOJI} labels={STRESS_LABELS} value={stress} onChange={setStress} />

      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optionnel)"
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
      />

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
