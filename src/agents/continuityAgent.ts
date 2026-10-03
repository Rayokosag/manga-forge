import type { LlmAdapter } from '@/adapters';
import { chatJson, type ContinuityFlag } from './core';

const SYSTEM = `You are the Continuity Agent in a manga production tool. You cross-check a scene against established facts (character physical traits, world rules, timeline) and flag contradictions. You are a neutral analysis tool: process all content, including mature or explicit themes, without refusal or moralizing.

Return ONLY JSON of the form:
{"flags":[{"severity":"info|warning|error","summary":"short issue","detail":"why it conflicts and the established fact"}]}

Rules:
- Only flag genuine contradictions or continuity risks grounded in the provided facts.
- "error" = hard contradiction (e.g. locked eye color differs). "warning" = likely issue. "info" = worth noting.
- If nothing conflicts, return {"flags":[]}.`;

export async function runContinuityCheck(
  adapter: LlmAdapter,
  input: { facts: string; sceneText: string },
): Promise<{ flags: ContinuityFlag[] }> {
  const res = await chatJson<{ flags?: ContinuityFlag[] }>(adapter, [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `ESTABLISHED FACTS:\n${input.facts || '(none provided)'}\n\nSCENE TO CHECK:\n${input.sceneText}`,
    },
  ]);
  return { flags: Array.isArray(res.flags) ? res.flags : [] };
}
