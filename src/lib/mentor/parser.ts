export type GeneratedExercise = {
  name: string;
  type: "STRENGTH" | "BODYWEIGHT" | "CARDIO" | "MOBILITY";
  sets: number;
  reps?: number;
  weight_kg?: number;
  duration_secs?: number;
  distance_km?: number;
};

export type GeneratedBlock = {
  name: string;
  exercises: GeneratedExercise[];
};

export type GeneratedSlot = {
  cycle: number;
  day: number;
  startTime: string | null;
  label: string | null;
  template: {
    name: string;
    blocks: GeneratedBlock[];
  };
};

export type GeneratedProgram = {
  name: string;
  cycleCount: number;
  cycleDays: number;
  slots: GeneratedSlot[];
};

/**
 * Parse AI response to extract a structured program JSON.
 * Returns null if parsing fails.
 */
export function parseGeneratedProgram(content: string): GeneratedProgram | null {
  // Try to extract JSON block
  const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();

  try {
    const parsed = JSON.parse(jsonStr);

    if (!parsed.name || !parsed.slots || !Array.isArray(parsed.slots)) {
      return null;
    }

    return {
      name: parsed.name,
      cycleCount: parsed.cycleCount ?? 1,
      cycleDays: parsed.cycleDays ?? 7,
      slots: parsed.slots.map((s: Record<string, unknown>) => ({
        cycle: s.cycle ?? 0,
        day: s.day ?? 0,
        startTime: s.startTime ?? null,
        label: s.label ?? null,
        template: s.template as GeneratedSlot["template"],
      })),
    };
  } catch {
    return null;
  }
}
