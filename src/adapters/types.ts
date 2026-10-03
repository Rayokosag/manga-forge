import type { LoraTag } from '@/db/schema';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmOptions {
  temperature?: number;
  numCtx?: number;
  /** Ask the model to return strict JSON where supported. */
  json?: boolean;
}

/** Text model adapter (Ollama, or an OpenAI-compatible endpoint). */
export interface LlmAdapter {
  readonly label: string;
  health(): Promise<boolean>;
  listModels?(): Promise<string[]>;
  chat(messages: LlmMessage[], opts?: LlmOptions): Promise<string>;
}

export interface ImageGenRequest {
  positive: string;
  negative: string;
  loras?: LoraTag[];
  seed?: number;
  steps?: number;
  cfg?: number;
  width?: number;
  height?: number;
}

export interface ImageGenResult {
  imageUrl: string;
  seed: number;
  raw?: unknown;
}

/** Diffusion backend adapter (ComfyUI). */
export interface ImageAdapter {
  readonly label: string;
  health(): Promise<boolean>;
  generate(req: ImageGenRequest, onStatus?: (status: string) => void): Promise<ImageGenResult>;
}
