export type MentorAction =
  | { type: "advice"; message: string }
  | { type: "create_program"; program: ProgramProposal; message: string }
  | { type: "adjust_program"; changes: AdjustChange[]; explanation: string; message: string };

export type ProgramProposal = {
  name: string;
  weekCount: number;
  weeks: {
    days: {
      label: string;
      exercises: {
        name: string;
        type: string;
        sets: number;
        reps?: number;
        weight_kg?: number;
        duration_secs?: number;
      }[];
    }[];
  }[];
};

export type AdjustChange = {
  description: string;
  detail: string;
};

/**
 * Parse mentor response to extract structured actions from JSON blocks.
 */
export function parseMentorResponse(content: string): MentorAction {
  // Try to extract JSON block
  const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);

  if (!jsonMatch) {
    return { type: "advice", message: content };
  }

  try {
    const parsed = JSON.parse(jsonMatch[1].trim());

    // Remove JSON block from the message for display
    const cleanMessage = content.replace(/```json[\s\S]*?```/, "").trim();

    if (parsed.action === "create_program" && parsed.program) {
      return {
        type: "create_program",
        program: parsed.program as ProgramProposal,
        message: cleanMessage || "Voici le programme que je te propose :",
      };
    }

    if (parsed.action === "adjust_program" && parsed.changes) {
      return {
        type: "adjust_program",
        changes: parsed.changes as AdjustChange[],
        explanation: parsed.explanation ?? "",
        message: cleanMessage || parsed.explanation || "Voici les ajustements proposés :",
      };
    }

    return { type: "advice", message: content };
  } catch {
    return { type: "advice", message: content };
  }
}
