import type { LlmAdapter, LlmMessage } from '@/adapters';

export interface ContinuityFlag {
  severity: 'info' | 'warning' | 'error';
  summary: string;
  detail?: string;
}

/**
 * Pull a JSON value out of a model response, tolerating ```json fences and
 * surrounding prose. Throws if nothing parseable is found.
 */
export function extractJson<T>(text: string): T {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.search(/[[{]/);
  if (start > 0) t = t.slice(start);
  const end = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (end >= 0) t = t.slice(0, end + 1);
  return JSON.parse(t) as T;
}

/** Ask the model for strict JSON and parse it. */
export async function chatJson<T>(
  adapter: LlmAdapter,
  messages: LlmMessage[],
  temperature = 0.4,
): Promise<T> {
  const raw = await adapter.chat(messages, { json: true, temperature });
  return extractJson<T>(raw);
}
