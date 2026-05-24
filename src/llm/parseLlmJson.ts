export function parseLlmJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const jsonText = fenced ? fenced[1] : trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new Error(`Failed to parse LLM JSON response: ${snippet(jsonText, 160)}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('LLM response must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}

function snippet(text: string, maxLength: number): string {
  return text.replace(/\r?\n/g, ' ').slice(0, maxLength);
}
