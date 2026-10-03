import { postJson } from './http';
import type { AiParams } from '@/db/schema';
import type { LlmAdapter, LlmMessage, LlmOptions } from './types';

interface ChatCompletion {
  choices: { message: { content: string } }[];
}

/**
 * OpenAI-compatible chat adapter — cloud fallback. Works with api.openai.com,
 * Anthropic's compat endpoint, or any local server that speaks the same API.
 */
export class OpenAiCompatAdapter implements LlmAdapter {
  readonly label: string;
  private endpoint: string;

  constructor(
    endpoint: string,
    private model: string,
    private apiKey?: string | null,
    private params?: AiParams | null,
  ) {
    // Allow either a base URL or a full chat-completions URL.
    const base = endpoint.replace(/\/$/, '');
    this.endpoint = base.endsWith('/chat/completions')
      ? base
      : `${base}/v1/chat/completions`.replace('/v1/v1/', '/v1/');
    this.label = `Cloud · ${model}`;
  }

  async health(): Promise<boolean> {
    return !!this.apiKey;
  }

  async chat(messages: LlmMessage[], opts?: LlmOptions): Promise<string> {
    const data = await postJson<ChatCompletion>(
      this.endpoint,
      {
        model: this.model,
        messages,
        temperature: opts?.temperature ?? this.params?.temperature ?? 0.7,
        response_format: opts?.json ? { type: 'json_object' } : undefined,
      },
      { headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {} },
    );
    return data.choices?.[0]?.message?.content ?? '';
  }
}
