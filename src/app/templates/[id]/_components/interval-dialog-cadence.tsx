"use client";

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-muted">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!Number.isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
        }}
        inputMode="numeric"
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent transition-colors tabular-nums"
      />
    </label>
  );
}

export function CadenceFields({
  workSecs,
  restSecs,
  roundCount,
  onWorkChange,
  onRestChange,
  onRoundCountChange,
}: {
  workSecs: number;
  restSecs: number;
  roundCount: number;
  onWorkChange: (n: number) => void;
  onRestChange: (n: number) => void;
  onRoundCountChange: (n: number) => void;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
        Cadence
      </h3>
      <div className="grid grid-cols-3 gap-2">
        <NumberField label="Effort (s)" value={workSecs} onChange={onWorkChange} min={1} max={600} />
        <NumberField label="Repos (s)" value={restSecs} onChange={onRestChange} min={0} max={300} />
        <NumberField label="Rounds" value={roundCount} onChange={onRoundCountChange} min={1} max={50} />
      </div>
    </section>
  );
}
