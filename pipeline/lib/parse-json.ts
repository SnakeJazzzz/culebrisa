/**
 * Safely parse JSON from Claude responses.
 * Claude sometimes wraps JSON in markdown code fences.
 */
export function parseClaudeJSON<T>(text: string): T {
  // Strip markdown code fences if present
  let cleaned = text.trim();

  // Remove ```json ... ``` or ``` ... ```
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  return JSON.parse(cleaned) as T;
}
