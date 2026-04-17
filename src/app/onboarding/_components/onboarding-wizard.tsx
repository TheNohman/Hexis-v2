"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PrimarySport, SportLevel } from "@/generated/prisma/client";
import { completeOnboardingAction } from "../actions";
import { StepSport } from "./steps/step-sport";
import { StepLevel } from "./steps/step-level";
import { StepObjective } from "./steps/step-objective";
import { StepAvailability } from "./steps/step-availability";
import { StepConfirm } from "./steps/step-confirm";

type StepId = "sport" | "level" | "objective" | "availability" | "confirm";
const STEPS: StepId[] = ["sport", "level", "objective", "availability", "confirm"];

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

        {step === "sport" && <StepSport value={sport} onChange={setSport} />}
        {step === "level" && <StepLevel value={level} onChange={setLevel} />}
        {step === "objective" && (
          <StepObjective sport={sport} value={objective} onChange={setObjective} />
        )}
        {step === "availability" && (
          <StepAvailability
            weeklyTarget={weeklyTarget}
            sessionDuration={sessionDuration}
            equipment={equipment}
            medicalNotes={medicalNotes}
            onWeeklyTargetChange={setWeeklyTarget}
            onSessionDurationChange={setSessionDuration}
            onToggleEquipment={toggleEquipment}
            onMedicalNotesChange={setMedicalNotes}
          />
        )}
        {step === "confirm" && (
          <StepConfirm
            sport={sport}
            level={level}
            objective={objective}
            weeklyTarget={weeklyTarget}
            sessionDuration={sessionDuration}
            equipment={equipment}
            medicalNotes={medicalNotes}
            mentorEnabled={mentorEnabled}
            onMentorToggle={setMentorEnabled}
          />
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
