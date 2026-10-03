import { getJson, postJson } from './http';
import type { AiParams } from '@/db/schema';
import type { LlmAdapter, LlmMessage, LlmOptions } from './types';

interface OllamaTagsResponse {
  models: { name: string }[];
}
interface OllamaChatResponse {
  message?: { role: string; content: string };
}

/** Local Ollama text-generation adapter (default http://127.0.0.1:11434). */
export class OllamaAdapter implements LlmAdapter {
  readonly label: string;

  constructor(
    private endpoint: string,
    private model: string,
    private params?: AiParams | null,
  ) {
    this.endpoint = endpoint.replace(/\/$/, '');
    this.label = `Ollama · ${model}`;
  }

  async health(): Promise<boolean> {
    try {
      await getJson(`${this.endpoint}/api/tags`, { timeoutMs: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    const data = await getJson<OllamaTagsResponse>(`${this.endpoint}/api/tags`, {
      timeoutMs: 5000,
    });
    return data.models?.map((m) => m.name) ?? [];
  }

  async chat(messages: LlmMessage[], opts?: LlmOptions): Promise<string> {
    const data = await postJson<OllamaChatResponse>(`${this.endpoint}/api/chat`, {
      model: this.model,
      messages,
      stream: false,
      format: opts?.json ? 'json' : undefined,
      options: {
        temperature: opts?.temperature ?? this.params?.temperature,
        num_ctx: opts?.numCtx ?? this.params?.numCtx,
      },
    });
    return data.message?.content ?? '';
  }
}
