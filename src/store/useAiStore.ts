import { create } from 'zustand';
import { toast } from '@/components/ui/sonner';
import { aiRepo } from '@/db/repositories';
import {
  resolveImageAdapter,
  resolveLlmAdapter,
  type ImageAdapter,
  type LlmAdapter,
} from '@/adapters';
import {
  runContinuityCheck,
  runStoryParse,
  withAgentRun,
  type ContinuityFlag,
} from '@/agents/orchestrator';
import type { AiSetting, NewAiSetting, ParsedBeat, Scene } from '@/db/schema';
import { useWorkspaceStore } from './useWorkspaceStore';
import { useCastStore } from './useCastStore';
import { useWorldStore } from './useWorldStore';

const TEXT_PROVIDERS = ['ollama', 'openai', 'anthropic', 'custom'];

interface StoryResult {
  sceneId: string;
  beats: ParsedBeat[];
}
interface ContinuityResult {
  sceneId: string;
  flags: ContinuityFlag[];
}

interface AiState {
  projectId: string | null;
  settings: AiSetting[];
  testing: Record<string, boolean>;
  busy: { story: boolean; continuity: boolean };
  storyResult: StoryResult | null;
  continuityResult: ContinuityResult | null;

  load: (projectId: string | null) => Promise<void>;

  createSetting: (data: Partial<NewAiSetting>) => Promise<void>;
  updateSetting: (id: string, patch: Partial<NewAiSetting>) => Promise<void>;
  deleteSetting: (id: string) => Promise<void>;
  testConnection: (id: string) => Promise<void>;

  resolveLlm: (role?: AiSetting['agentRole']) => LlmAdapter;
  resolveImage: () => ImageAdapter;

  runStory: (scene: Scene) => Promise<void>;
  runContinuity: (scene: Scene) => Promise<void>;
  applyStoryBeats: (sceneId: string, beats: ParsedBeat[]) => Promise<void>;
}

function fail(scope: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[ai] ${scope} failed:`, err);
  toast.error(`${scope} failed`, { description: message });
}

/** Default global connections so the app is usable the moment servers are up. */
async function seedDefaults() {
  const env = import.meta.env;
  await aiRepo.createAiSetting({
    label: 'Local Ollama',
    provider: 'ollama',
    agentRole: 'general',
    endpoint: (env.VITE_OLLAMA_URL as string) || 'http://127.0.0.1:11434',
    model: 'llama3',
    enabled: true,
    isDefault: true,
  });
  await aiRepo.createAiSetting({
    label: 'Local ComfyUI',
    provider: 'comfyui',
    agentRole: 'general',
    endpoint: (env.VITE_COMFYUI_URL as string) || 'http://127.0.0.1:8188',
    model: 'sd_xl_base_1.0.safetensors',
    enabled: true,
    isDefault: true,
  });
}

export const useAiStore = create<AiState>((set, get) => ({
  projectId: null,
  settings: [],
  testing: {},
  busy: { story: false, continuity: false },
  storyResult: null,
  continuityResult: null,

  async load(projectId) {
    set({ projectId });
    try {
      let settings = await aiRepo.listAiSettings(projectId);
      if (settings.length === 0 && (await aiRepo.listAiSettings()).length === 0) {
        await seedDefaults();
        settings = await aiRepo.listAiSettings(projectId);
      }
      set({ settings });
    } catch (err) {
      fail('Load AI settings', err);
    }
  },

  async createSetting(data) {
    try {
      const row = await aiRepo.createAiSetting({
        label: data.label ?? 'New connection',
        provider: data.provider ?? 'ollama',
        endpoint: data.endpoint ?? 'http://127.0.0.1:11434',
        projectId: data.projectId ?? get().projectId,
        ...data,
      });
      set((s) => ({ settings: [...s.settings, row].sort((a, b) => a.label.localeCompare(b.label)) }));
    } catch (err) {
      fail('Create connection', err);
    }
  },

  async updateSetting(id, patch) {
    set((s) => ({ settings: s.settings.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    try {
      await aiRepo.updateAiSetting(id, patch);
    } catch (err) {
      fail('Save connection', err);
    }
  },

  async deleteSetting(id) {
    try {
      await aiRepo.deleteAiSetting(id);
      set((s) => ({ settings: s.settings.filter((x) => x.id !== id) }));
    } catch (err) {
      fail('Delete connection', err);
    }
  },

  async testConnection(id) {
    const setting = get().settings.find((s) => s.id === id);
    if (!setting) return;
    set((s) => ({ testing: { ...s.testing, [id]: true } }));
    try {
      const adapter =
        setting.provider === 'comfyui' ? resolveImageAdapter(setting) : resolveLlmAdapter(setting);
      const ok = await adapter.health();
      if (ok) toast.success(`${setting.label} is reachable`);
      else toast.error(`${setting.label} did not respond`);
    } catch (err) {
      fail('Test connection', err);
    } finally {
      set((s) => ({ testing: { ...s.testing, [id]: false } }));
    }
  },

  resolveLlm(role) {
    const text = get().settings.filter(
      (s) => s.enabled && TEXT_PROVIDERS.includes(s.provider),
    );
    if (text.length === 0) throw new Error('No text model connection is configured or enabled.');
    const byRole = role ? text.filter((s) => s.agentRole === role) : [];
    const pick =
      byRole.find((s) => s.isDefault) ??
      byRole[0] ??
      text.find((s) => s.isDefault) ??
      text[0];
    return resolveLlmAdapter(pick);
  },

  resolveImage() {
    const image = get().settings.filter((s) => s.enabled && s.provider === 'comfyui');
    if (image.length === 0) throw new Error('No ComfyUI connection is configured or enabled.');
    return resolveImageAdapter(image.find((s) => s.isDefault) ?? image[0]);
  },

  async runStory(scene) {
    const projectId = get().projectId;
    if (!projectId) return;
    set((s) => ({ busy: { ...s.busy, story: true } }));
    try {
      const adapter = get().resolveLlm('story');
      const names = useCastStore.getState().characters.map((c) => c.name);
      const res = await withAgentRun(
        { projectId, role: 'story', targetType: 'scene', targetId: scene.id },
        () => runStoryParse(adapter, { prose: scene.proseContent, characterNames: names }),
      );
      set({ storyResult: { sceneId: scene.id, beats: res.beats } });
      toast.success(`Parsed ${res.beats.length} beat${res.beats.length === 1 ? '' : 's'}`);
    } catch (err) {
      fail('Story parse', err);
    } finally {
      set((s) => ({ busy: { ...s.busy, story: false } }));
    }
  },

  async runContinuity(scene) {
    const projectId = get().projectId;
    if (!projectId) return;
    set((s) => ({ busy: { ...s.busy, continuity: true } }));
    try {
      const adapter = get().resolveLlm('continuity');
      const facts = buildFacts();
      const sceneText = [scene.proseContent, JSON.stringify(scene.structured ?? {})]
        .filter(Boolean)
        .join('\n');
      const res = await withAgentRun(
        { projectId, role: 'continuity', targetType: 'scene', targetId: scene.id },
        () => runContinuityCheck(adapter, { facts, sceneText }),
      );
      set({ continuityResult: { sceneId: scene.id, flags: res.flags } });
      toast.success(
        res.flags.length ? `${res.flags.length} continuity note(s)` : 'No continuity issues found',
      );
    } catch (err) {
      fail('Continuity check', err);
    } finally {
      set((s) => ({ busy: { ...s.busy, continuity: false } }));
    }
  },

  async applyStoryBeats(sceneId, beats) {
    // Non-destructive: writes to scenes.parsedBeats, never the prose.
    await useWorkspaceStore.getState().updateScene(sceneId, { parsedBeats: beats });
    toast.success('Saved beats to scene');
  },
}));

/** Assemble established facts for the Continuity Agent from the live stores. */
function buildFacts(): string {
  const characters = useCastStore.getState().characters;
  const entities = useWorldStore.getState().entities;
  const events = useWorldStore.getState().events;

  const charLines = characters.map((c) => {
    const locked = (c.lockedTraits ?? []).map((t) => `${t.key}=${t.value}`).join(', ');
    const a = c.anatomy ?? {};
    const anat = [a.hairColor && `hair ${a.hairColor}`, a.eyeColor && `eyes ${a.eyeColor}`, a.build]
      .filter(Boolean)
      .join(', ');
    return `- ${c.name} [locked: ${locked || 'none'}] ${anat}`.trim();
  });

  const entityLines = entities
    .filter((e) => e.continuityNotes)
    .map((e) => `- ${e.name} (${e.type}): ${e.continuityNotes}`);

  const timelineLines = events
    .slice()
    .sort((x, y) => x.orderIndex - y.orderIndex)
    .map((e) => `- ${e.inWorldTime ? `${e.inWorldTime}: ` : ''}${e.title}`);

  return [
    characters.length ? `CHARACTERS:\n${charLines.join('\n')}` : '',
    entityLines.length ? `WORLD CONTINUITY:\n${entityLines.join('\n')}` : '',
    timelineLines.length ? `TIMELINE:\n${timelineLines.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}
