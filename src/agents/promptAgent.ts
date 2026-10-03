import type { LlmAdapter } from '@/adapters';
import { chatJson } from './core';

const SYSTEM = `You are the Prompt Agent in a manga production tool. You refine a draft diffusion prompt into a clean, comma-separated tag prompt (Danbooru/SDXL style) for image generation. You are a neutral tool: keep all content, including mature or explicit tags, intact — never refuse, censor, or soften.

Return ONLY JSON: {"positive":"...","negative":"...","notes":"one line on what you changed"}

Rules:
- Preserve every locked identity tag from the draft exactly.
- De-duplicate, order by importance (subject → attributes → outfit → setting → camera → style), keep it tight.
- Do not add a watermark/signature; add sensible quality tags only if missing.`;

export async function runPromptEnhance(
  adapter: LlmAdapter,
  input: { positive: string; negative: string; style?: string },
): Promise<{ positive: string; negative: string; notes?: string }> {
  const res = await chatJson<{ positive?: string; negative?: string; notes?: string }>(
    adapter,
    [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: `STYLE: ${input.style ?? '(default)'}\n\nDRAFT POSITIVE:\n${input.positive}\n\nDRAFT NEGATIVE:\n${input.negative}`,
      },
    ],
    0.5,
  );
  return {
    positive: res.positive?.trim() || input.positive,
    negative: res.negative?.trim() || input.negative,
    notes: res.notes,
  };
}
