import type { SubagentJsonPayload } from "./types.js";

export function extractJsonPayload(
  text: string
): SubagentJsonPayload | null {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(candidate.slice(start, end + 1)) as SubagentJsonPayload;
  } catch {
    return null;
  }
}
