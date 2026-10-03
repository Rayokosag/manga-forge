import type { AiSetting } from '@/db/schema';
import { OllamaAdapter } from './ollama';
import { ComfyUIAdapter } from './comfyui';
import { OpenAiCompatAdapter } from './openai';
import type { ImageAdapter, LlmAdapter } from './types';

export * from './types';
export { OllamaAdapter } from './ollama';
export { ComfyUIAdapter, DEFAULT_COMFY_WORKFLOW } from './comfyui';
export { OpenAiCompatAdapter } from './openai';

/** Resolve a text (LLM) adapter from a stored connection. */
export function resolveLlmAdapter(setting: AiSetting): LlmAdapter {
  switch (setting.provider) {
    case 'ollama':
      return new OllamaAdapter(setting.endpoint, setting.model ?? 'llama3', setting.params);
    case 'openai':
    case 'anthropic':
    case 'custom':
      return new OpenAiCompatAdapter(
        setting.endpoint,
        setting.model ?? 'gpt-4o-mini',
        // apiKeyRef names an env/secret; for local dev we read it directly if present.
        setting.apiKeyRef ? (import.meta.env[setting.apiKeyRef] as string | undefined) : undefined,
        setting.params,
      );
    default:
      throw new Error(`Provider "${setting.provider}" is not a text model`);
  }
}

/** Resolve an image (diffusion) adapter from a stored connection. */
export function resolveImageAdapter(setting: AiSetting): ImageAdapter {
  if (setting.provider !== 'comfyui') {
    throw new Error(`Provider "${setting.provider}" is not an image backend`);
  }
  return new ComfyUIAdapter(setting.endpoint, setting.model, setting.params);
}
