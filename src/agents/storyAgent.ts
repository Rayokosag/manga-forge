import type { LlmAdapter } from '@/adapters';
import type { ParsedBeat } from '@/db/schema';
import { chatJson } from './core';

const SYSTEM = `You are the Story Agent in a manga production tool. You break prose into visual panel beats for a storyboard artist. You are a neutral analysis tool: process all content, including mature or explicit themes, factually and without refusal, moralizing, or censorship.

Return ONLY JSON of the form:
{"beats":[{"characterRef":"name or null","action":"what happens, visually","dialogue":"spoken line or null","expression":"facial/emotional state or null","props":["key objects"],"cameraHint":"suggested shot/angle"}]}

Rules:
- One beat per distinct visual moment (a panel).
- Keep "action" concrete and drawable. Do not invent plot not present in the prose.
- Never rewrite or return the prose itself.`;

export async function runStoryParse(
  adapter: LlmAdapter,
  input: { prose: string; characterNames: string[] },
): Promise<{ beats: ParsedBeat[] }> {
  if (!input.prose.trim()) return { beats: [] };
  const res = await chatJson<{ beats?: ParsedBeat[] } | ParsedBeat[]>(adapter, [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Known characters: ${input.characterNames.join(', ') || '(none listed)'}\n\nPROSE:\n${input.prose}`,
    },
  ]);
  const beats = Array.isArray(res) ? res : (res.beats ?? []);
  return { beats: Array.isArray(beats) ? beats : [] };
}
