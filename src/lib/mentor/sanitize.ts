/**
 * Scrub potentially-prompt-injecting content from free-text user fields
 * before sending them to the LLM. Users can type anything in free-text
 * fields; we don't want "Ignore previous instructions…" or similar to
 * leak into the system prompt.
 *
 * Extracted from mentor/advice.ts so both the one-off advice generator
 * and the shared context builder can share the scrubber without a
 * circular import.
 */
export function sanitiseForPrompt(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/ignore (previous|all|above)/gi, "[caviardé]")
    .replace(/system prompt|system:/gi, "[caviardé]")
    .slice(0, 300);
  return cleaned.trim() || null;
}
