"use client";

export type PlaybackOrder = "CYCLE" | "SAME" | "CUSTOM";

export type Preset = {
  id: "tabata" | "intervals" | "emom-style" | "custom";
  label: string;
  emoji: string;
  description: string;
  format: "TABATA" | "INTERVALS";
  workSecs: number;
  restSecs: number;
  roundCount: number;
  playbackOrder: PlaybackOrder;
};

export const PRESETS: Preset[] = [
  {
    id: "tabata",
    label: "Tabata classique",
    emoji: "🔥",
    description: "20 s effort / 10 s repos × 8 = 4 min",
    format: "TABATA",
    workSecs: 20,
    restSecs: 10,
    roundCount: 8,
    playbackOrder: "SAME",
  },
  {
    id: "intervals",
    label: "Intervalles 30/30",
    emoji: "⚡",
    description: "30 s effort / 30 s repos — 10 rounds",
    format: "INTERVALS",
    workSecs: 30,
    restSecs: 30,
    roundCount: 10,
    playbackOrder: "CYCLE",
  },
  {
    id: "emom-style",
    label: "HIIT 40/20",
    emoji: "💥",
    description: "40 s effort / 20 s repos — 8 rounds",
    format: "INTERVALS",
    workSecs: 40,
    restSecs: 20,
    roundCount: 8,
    playbackOrder: "CYCLE",
  },
  {
    id: "custom",
    label: "Personnalisé",
    emoji: "⚙️",
    description: "Configure tout à la main.",
    format: "INTERVALS",
    workSecs: 30,
    restSecs: 15,
    roundCount: 6,
    playbackOrder: "CYCLE",
  },
];

export function defaultNameForPreset(p: Preset): string {
  switch (p.id) {
    case "tabata":
      return "Tabata";
    case "intervals":
      return "Intervalles 30/30";
    case "emom-style":
      return "HIIT 40/20";
    case "custom":
      return "Bloc HIIT";
  }
}

export function PresetPicker({
  value,
  onChange,
}: {
  value: Preset;
  onChange: (next: Preset) => void;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
        Format
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((p) => {
          const active = value.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p)}
              className={`text-left rounded-xl border p-3 cursor-pointer transition-all ${
                active
                  ? "border-accent bg-accent/10 ring-2 ring-accent/30"
                  : "border-border bg-surface hover:border-accent/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{p.emoji}</span>
                <p className="text-sm font-semibold">{p.label}</p>
              </div>
              <p className="text-[11px] text-muted mt-1">{p.description}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
