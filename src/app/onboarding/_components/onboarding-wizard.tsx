"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PrimarySport, SportLevel } from "@/generated/prisma/client";
import { completeOnboardingAction } from "../actions";
import { SPORTS, LEVELS, EQUIPMENT_OPTIONS } from "@/app/_components/sport-options";

type StepId = "sport" | "level" | "objective" | "availability" | "confirm";
const STEPS: StepId[] = ["sport", "level", "objective", "availability", "confirm"];

// Suggested objectives by sport — pre-filled chips the user can click.
const OBJECTIVES_BY_SPORT: Record<PrimarySport, string[]> = {
  STRENGTH_TRAINING: ["Prise de masse", "Esthétique / recomposition", "Santé et forme générale", "Gagner en force"],
  POWERLIFTING: ["Progresser en total S+B+D", "Préparer une compétition", "Améliorer un lift spécifique", "Sortir d'un plateau"],
  ENDURANCE: ["Préparer un 10 km", "Préparer un semi / marathon", "Premier triathlon", "Améliorer mes allures"],
  CROSSFIT_HIIT: ["Améliorer ma condition physique", "Progresser sur les benchmarks", "Perdre du gras", "Prendre du muscle fonctionnel"],
  MULTI_SPORT: ["Équilibre muscu / cardio", "Rester en forme", "Gérer le stress", "Varier les plaisirs"],
};

export function OnboardingWizard() {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<StepId>("sport");
  const [sport, setSport] = useState<PrimarySport | null>(null);
  const [level, setLevel] = useState<SportLevel | null>(null);
  const [objective, setObjective] = useState<string>("");
  const [weeklyTarget, setWeeklyTarget] = useState<number>(3);
  const [sessionDuration, setSessionDuration] = useState<number>(60);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [medicalNotes, setMedicalNotes] = useState<string>("");
  const [mentorEnabled, setMentorEnabled] = useState<boolean>(true);

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const canContinue = useMemo(() => {
    switch (step) {
      case "sport":
        return sport !== null;
      case "level":
        return level !== null;
      case "objective":
        return objective.trim().length > 0;
      case "availability":
        return weeklyTarget > 0 && sessionDuration > 0 && equipment.length > 0;
      case "confirm":
        return true;
    }
  }, [step, sport, level, objective, weeklyTarget, sessionDuration, equipment]);

  const suggestions = sport ? OBJECTIVES_BY_SPORT[sport] : [];

  function next() {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]);
  }
  function back() {
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]);
  }

  function toggleEquipment(value: string) {
    setEquipment((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  function submit() {
    if (!sport || !level) return;
    startTransition(async () => {
      await completeOnboardingAction({
        primarySport: sport,
        sportLevel: level,
        sportObjective: objective.trim() || null,
        weeklySessionTarget: weeklyTarget || null,
        sessionDurationMins: sessionDuration || null,
        equipmentAccess: equipment,
        medicalNotes: medicalNotes.trim() || null,
        mentorEnabled,
      });
    });
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="max-w-xl w-full space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Étape {stepIndex + 1} / {STEPS.length}</span>
            <button
              type="button"
              onClick={back}
              disabled={stepIndex === 0}
              className="text-accent disabled:opacity-30 disabled:cursor-not-allowed hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              <ChevronLeft className="h-3 w-3" aria-hidden="true" />
              Retour
            </button>
          </div>
          <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        {step === "sport" && (
          <section className="space-y-4">
            <header>
              <h1 className="text-2xl font-display font-bold">Bienvenue sur Hexis !</h1>
              <p className="text-sm text-muted mt-1">
                Quelle est ta discipline principale ? On adaptera l&rsquo;app à ton profil.
              </p>
            </header>
            <div className="grid gap-2">
              {SPORTS.map((s) => {
                const active = sport === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSport(s.value)}
                    className={`text-left rounded-2xl border p-4 transition-all cursor-pointer flex items-center gap-4 ${
                      active
                        ? "border-accent bg-accent/10 ring-2 ring-accent/30"
                        : "border-border bg-surface hover:border-accent/40"
                    }`}
                  >
                    <span className="text-3xl shrink-0">{s.icon}</span>
                    <div className="min-w-0">
                      <p className="font-semibold">{s.label}</p>
                      <p className="text-xs text-muted">{s.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === "level" && (
          <section className="space-y-4">
            <header>
              <h1 className="text-2xl font-display font-bold">Ton niveau ?</h1>
              <p className="text-sm text-muted mt-1">
                On adapte les recommandations et les charges par défaut.
              </p>
            </header>
            <div className="grid gap-2">
              {LEVELS.map((l) => {
                const active = level === l.value;
                return (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setLevel(l.value)}
                    className={`text-left rounded-2xl border p-4 transition-all cursor-pointer ${
                      active
                        ? "border-accent bg-accent/10 ring-2 ring-accent/30"
                        : "border-border bg-surface hover:border-accent/40"
                    }`}
                  >
                    <p className="font-semibold">{l.label}</p>
                    <p className="text-xs text-muted mt-0.5">{l.description}</p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === "objective" && (
          <section className="space-y-4">
            <header>
              <h1 className="text-2xl font-display font-bold">Ton objectif principal ?</h1>
              <p className="text-sm text-muted mt-1">
                Écris le tien, ou clique sur une suggestion.
              </p>
            </header>
            <input
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Ex: préparer mon premier triathlon en septembre"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors"
            />
            <div className="flex flex-wrap gap-2">
              {suggestions.map((sugg) => (
                <button
                  key={sugg}
                  type="button"
                  onClick={() => setObjective(sugg)}
                  className="text-xs rounded-full border border-border px-3 py-1.5 hover:border-accent hover:text-accent transition-colors cursor-pointer"
                >
                  {sugg}
                </button>
              ))}
            </div>
          </section>
        )}

        {step === "availability" && (
          <section className="space-y-5">
            <header>
              <h1 className="text-2xl font-display font-bold">Ton rythme ?</h1>
              <p className="text-sm text-muted mt-1">
                Combien de séances par semaine, pendant combien de temps, avec quoi ?
              </p>
            </header>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Séances / semaine</span>
                <span className="text-accent font-bold text-lg tabular-nums">{weeklyTarget}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={weeklyTarget}
                onChange={(e) => setWeeklyTarget(parseInt(e.target.value, 10))}
                className="w-full accent-accent"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Durée d&rsquo;une séance (min)</span>
                <span className="text-accent font-bold text-lg tabular-nums">{sessionDuration}</span>
              </div>
              <input
                type="range"
                min={15}
                max={180}
                step={5}
                value={sessionDuration}
                onChange={(e) => setSessionDuration(parseInt(e.target.value, 10))}
                className="w-full accent-accent"
              />
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Équipement disponible</span>
              <p className="text-xs text-muted">Choisis-en au moins un (plusieurs possibles).</p>
              <div className="grid grid-cols-2 gap-2">
                {EQUIPMENT_OPTIONS.map((e) => {
                  const active = equipment.includes(e.value);
                  return (
                    <button
                      key={e.value}
                      type="button"
                      onClick={() => toggleEquipment(e.value)}
                      className={`text-left rounded-xl border px-3 py-2.5 transition-all cursor-pointer flex items-center gap-2 text-sm ${
                        active
                          ? "border-accent bg-accent/10"
                          : "border-border bg-surface hover:border-accent/40"
                      }`}
                    >
                      <span className="text-lg">{e.emoji}</span>
                      <span>{e.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Contraintes médicales (optionnel)</span>
              <textarea
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                placeholder="Ex : épaule droite sensible, tendinite Achille récurrente, reprise après blessure…"
                rows={2}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors resize-none"
              />
            </div>
          </section>
        )}

        {step === "confirm" && (
          <section className="space-y-5">
            <header>
              <h1 className="text-2xl font-display font-bold">Prêt·e à commencer ?</h1>
              <p className="text-sm text-muted mt-1">Un dernier coup d&rsquo;œil à ton profil.</p>
            </header>

            <div className="rounded-2xl border border-border bg-surface divide-y divide-border">
              <SummaryRow label="Sport" value={SPORTS.find((s) => s.value === sport)?.label ?? "—"} />
              <SummaryRow label="Niveau" value={LEVELS.find((l) => l.value === level)?.label ?? "—"} />
              <SummaryRow label="Objectif" value={objective || "—"} />
              <SummaryRow label="Rythme" value={`${weeklyTarget} × ${sessionDuration} min / semaine`} />
              <SummaryRow label="Équipement" value={equipment.length ? equipment.map((v) => EQUIPMENT_OPTIONS.find((e) => e.value === v)?.label).filter(Boolean).join(" · ") : "—"} />
              {medicalNotes && <SummaryRow label="Santé" value={medicalNotes} />}
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={mentorEnabled}
                onChange={(e) => setMentorEnabled(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded accent-accent cursor-pointer"
              />
              <div>
                <p className="font-semibold text-sm">Activer le Mentor IA</p>
                <p className="text-xs text-muted mt-0.5">
                  Coach virtuel qui analyse tes séances et ton bien-être pour te conseiller avant chaque entraînement.
                  Tu peux l&rsquo;activer/désactiver à tout moment depuis ton profil.
                </p>
              </div>
            </label>
          </section>
        )}

        {/* Footer */}
        <div className="pt-2">
          {step === "confirm" ? (
            <button
              type="button"
              onClick={submit}
              disabled={isPending}
              className="w-full rounded-2xl bg-accent text-white py-4 font-bold text-sm uppercase tracking-wide hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50"
            >
              {isPending ? "Finalisation…" : "Commencer !"}
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              disabled={!canContinue}
              className="w-full rounded-2xl bg-accent text-white py-4 font-semibold hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              Continuer
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-xs uppercase tracking-wider text-muted shrink-0 w-24">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}
