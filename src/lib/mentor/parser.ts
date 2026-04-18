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
 * Single-template generation (no cycles/slots — just a session template).
 */
export type GeneratedTemplate = {
  name: string;
  blocks: GeneratedBlock[];
};

/**
 * Fill-program response: list of slots to populate with newly-generated templates.
 */
export type GeneratedFill = {
  cycle: number;
  day: number;
  label: string | null;
  template: GeneratedTemplate;
};

export function parseGeneratedFills(content: string): GeneratedFill[] | null {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed.fills || !Array.isArray(parsed.fills)) return null;
    const rawFills = parsed.fills as unknown[];
    const mapped: GeneratedFill[] = rawFills
      .filter(
        (f): f is Record<string, unknown> =>
          typeof f === "object" && f !== null,
      )
      .map((f) => ({
        cycle: typeof f.cycle === "number" ? f.cycle : 0,
        day: typeof f.day === "number" ? f.day : 0,
        label:
          typeof f.label === "string" && f.label.trim() ? f.label.trim() : null,
        template: f.template as GeneratedTemplate,
      }))
      .filter(
        (f) =>
          f.template &&
          typeof f.template.name === "string" &&
          Array.isArray(f.template.blocks),
      );
    return mapped;
  } catch {
    return null;
  }
}

export function parseGeneratedTemplate(content: string): GeneratedTemplate | null {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();

  try {
    const parsed = JSON.parse(jsonStr);
    if (
      !parsed.name ||
      typeof parsed.name !== "string" ||
      !parsed.blocks ||
      !Array.isArray(parsed.blocks)
    ) {
      return null;
    }
    return {
      name: parsed.name,
      blocks: parsed.blocks as GeneratedBlock[],
    };
  } catch {
    return null;
  }
}

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
