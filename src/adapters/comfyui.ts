import { getJson, postJson } from './http';
import type { AiParams } from '@/db/schema';
import type { ImageAdapter, ImageGenRequest, ImageGenResult } from './types';

/**
 * Default SDXL/SD txt2img graph in ComfyUI **API format**. Tokens (as string
 * placeholders) are substituted before submission. Swap `%checkpoint%` for your
 * model, or paste your own graph into the connection's `workflow` param.
 */
export const DEFAULT_COMFY_WORKFLOW: Record<string, unknown> = {
  '3': {
    class_type: 'KSampler',
    inputs: {
      seed: '%seed%',
      steps: '%steps%',
      cfg: '%cfg%',
      sampler_name: 'euler',
      scheduler: 'normal',
      denoise: 1,
      model: ['4', 0],
      positive: ['6', 0],
      negative: ['7', 0],
      latent_image: ['5', 0],
    },
  },
  '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: '%checkpoint%' } },
  '5': {
    class_type: 'EmptyLatentImage',
    inputs: { width: '%width%', height: '%height%', batch_size: 1 },
  },
  '6': { class_type: 'CLIPTextEncode', inputs: { text: '%positive%', clip: ['4', 1] } },
  '7': { class_type: 'CLIPTextEncode', inputs: { text: '%negative%', clip: ['4', 1] } },
  '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
  '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'mangaforge', images: ['8', 0] } },
};

type TokenMap = Record<string, string | number>;

/** Recursively replace %tokens% in a parsed workflow (numbers stay numbers). */
function substitute(node: unknown, map: TokenMap): unknown {
  if (typeof node === 'string') {
    if (node in map) return map[node]; // exact token → typed value (keeps numbers)
    return node.replace(/%(\w+)%/g, (m, k) => {
      const key = `%${k}%`;
      return key in map ? String(map[key]) : m;
    });
  }
  if (Array.isArray(node)) return node.map((n) => substitute(n, map));
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) out[k] = substitute(v, map);
    return out;
  }
  return node;
}

interface QueueResponse {
  prompt_id: string;
}
interface HistoryImage {
  filename: string;
  subfolder: string;
  type: string;
}
interface HistoryEntry {
  outputs?: Record<string, { images?: HistoryImage[] }>;
}

export class ComfyUIAdapter implements ImageAdapter {
  readonly label = 'ComfyUI';
  private endpoint: string;
  private workflow: Record<string, unknown>;
  private checkpoint: string;
  private params?: AiParams | null;

  constructor(endpoint: string, model?: string | null, params?: AiParams | null) {
    this.endpoint = endpoint.replace(/\/$/, '');
    this.checkpoint = model || 'sd_xl_base_1.0.safetensors';
    this.params = params;
    const raw = params?.workflow;
    this.workflow =
      typeof raw === 'string'
        ? (JSON.parse(raw) as Record<string, unknown>)
        : ((raw as Record<string, unknown>) ?? DEFAULT_COMFY_WORKFLOW);
  }

  async health(): Promise<boolean> {
    try {
      await getJson(`${this.endpoint}/system_stats`, { timeoutMs: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async generate(
    req: ImageGenRequest,
    onStatus?: (s: string) => void,
  ): Promise<ImageGenResult> {
    const seed = req.seed ?? Math.floor(Math.random() * 2_147_483_647);
    // ComfyUI has no native A1111 lora syntax node here, so append as a hint.
    const loraText = (req.loras ?? [])
      .filter((l) => l.name)
      .map((l) => `<lora:${l.name}:${l.weight}>`)
      .join(' ');
    const map: TokenMap = {
      '%positive%': [req.positive, loraText].filter(Boolean).join(', '),
      '%negative%': req.negative,
      '%seed%': seed,
      '%steps%': req.steps ?? this.params?.steps ?? 28,
      '%cfg%': req.cfg ?? this.params?.cfgScale ?? 7,
      '%width%': req.width ?? 832,
      '%height%': req.height ?? 1216,
      '%checkpoint%': this.checkpoint,
    };
    const prompt = substitute(this.workflow, map);

    onStatus?.('Queuing…');
    const { prompt_id } = await postJson<QueueResponse>(`${this.endpoint}/prompt`, {
      prompt,
      client_id: crypto.randomUUID(),
    });

    // Poll history until the render completes.
    const maxTries = 240; // ~4 min at 1s
    for (let i = 0; i < maxTries; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const history = await getJson<Record<string, HistoryEntry>>(
        `${this.endpoint}/history/${prompt_id}`,
        { timeoutMs: 8000 },
      ).catch(() => ({}) as Record<string, HistoryEntry>);
      const entry = history[prompt_id];
      if (entry?.outputs) {
        for (const out of Object.values(entry.outputs)) {
          const img = out.images?.[0];
          if (img) {
            const url = `${this.endpoint}/view?filename=${encodeURIComponent(
              img.filename,
            )}&subfolder=${encodeURIComponent(img.subfolder)}&type=${img.type}`;
            onStatus?.('Done');
            return { imageUrl: url, seed, raw: entry };
          }
        }
      }
      onStatus?.(`Rendering… (${i + 1}s)`);
    }
    throw new Error('ComfyUI render timed out');
  }
}
