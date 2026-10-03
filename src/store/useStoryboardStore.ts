import { create } from 'zustand';
import { toast } from '@/components/ui/sonner';
import {
  pagesRepo,
  panelsRepo,
  panelLayersRepo,
} from '@/db/repositories';
import type {
  Character,
  NewPage,
  NewPanel,
  NewPanelLayer,
  Page,
  Panel,
  PanelLayer,
  PanelRect,
  ParsedBeat,
} from '@/db/schema';
import { autoLayoutRects, buildLayout, type LayoutTemplate } from '@/features/storyboard/layouts';

type Selection = { kind: 'panel' | 'layer'; id: string } | null;

interface StoryboardState {
  chapterId: string | null;
  loading: boolean;

  pages: Page[];
  currentPageId: string | null;
  panels: Panel[];
  layers: PanelLayer[]; // flat, for the current page

  selection: Selection;

  loadForChapter: (chapterId: string | null) => Promise<void>;

  // pages
  selectPage: (id: string) => Promise<void>;
  createPage: (data?: Partial<NewPage>) => Promise<void>;
  updatePage: (id: string, patch: Partial<NewPage>) => Promise<void>;
  deletePage: (id: string) => Promise<void>;

  // panels
  createPanel: (rect?: PanelRect, data?: Partial<NewPanel>) => Promise<void>;
  updatePanel: (id: string, patch: Partial<NewPanel>) => Promise<void>;
  deletePanel: (id: string) => Promise<void>;
  applyLayout: (template: LayoutTemplate) => Promise<void>;
  createPageFromBeats: (
    chapterId: string,
    sceneId: string,
    beats: ParsedBeat[],
    characters: Character[],
  ) => Promise<void>;

  // layers
  createLayer: (
    panelId: string,
    data: Partial<Omit<NewPanelLayer, 'id' | 'panelId'>> & Pick<NewPanelLayer, 'type'>,
  ) => Promise<void>;
  updateLayer: (id: string, patch: Partial<NewPanelLayer>) => Promise<void>;
  deleteLayer: (id: string) => Promise<void>;
  changeLayerZ: (id: string, dir: -1 | 1) => Promise<void>;

  // selection
  select: (sel: Selection) => void;

  layersForPanel: (panelId: string) => PanelLayer[];
  currentPage: () => Page | undefined;
}

function fail(scope: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[storyboard] ${scope} failed:`, err);
  toast.error(`${scope} failed`, { description: message });
}

async function loadPageContents(pageId: string) {
  const panels = await panelsRepo.listPanels(pageId);
  const layerLists = await Promise.all(
    panels.map((p) => panelLayersRepo.listLayersByPanel(p.id)),
  );
  return { panels, layers: layerLists.flat() };
}

export const useStoryboardStore = create<StoryboardState>((set, get) => ({
  chapterId: null,
  loading: false,
  pages: [],
  currentPageId: null,
  panels: [],
  layers: [],
  selection: null,

  async loadForChapter(chapterId) {
    if (chapterId === get().chapterId) return;
    set({
      chapterId,
      pages: [],
      currentPageId: null,
      panels: [],
      layers: [],
      selection: null,
    });
    if (!chapterId) return;
    set({ loading: true });
    try {
      const pages = await pagesRepo.listPages(chapterId);
      set({ pages, loading: false });
      if (pages[0]) await get().selectPage(pages[0].id);
    } catch (err) {
      set({ loading: false });
      fail('Load storyboard', err);
    }
  },

  /* -------------------------------------------------------------------- pages */

  async selectPage(id) {
    set({ currentPageId: id, selection: null, panels: [], layers: [] });
    try {
      const { panels, layers } = await loadPageContents(id);
      set({ panels, layers });
    } catch (err) {
      fail('Load page', err);
    }
  },

  async createPage(data) {
    const chapterId = get().chapterId;
    if (!chapterId) return;
    try {
      const page = await pagesRepo.createPage(chapterId, data);
      set((s) => ({ pages: [...s.pages, page] }));
      await get().selectPage(page.id);
    } catch (err) {
      fail('Create page', err);
    }
  },

  async updatePage(id, patch) {
    set((s) => ({ pages: s.pages.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
    try {
      await pagesRepo.updatePage(id, patch);
    } catch (err) {
      fail('Save page', err);
    }
  },

  async deletePage(id) {
    try {
      await pagesRepo.deletePage(id);
      const pages = get().pages.filter((p) => p.id !== id);
      set({ pages });
      if (get().currentPageId === id) {
        if (pages[0]) await get().selectPage(pages[0].id);
        else set({ currentPageId: null, panels: [], layers: [], selection: null });
      }
      toast.success('Page deleted');
    } catch (err) {
      fail('Delete page', err);
    }
  },

  /* ------------------------------------------------------------------- panels */

  async createPanel(rect, data) {
    const page = get().currentPage();
    if (!page) return;
    const size = page.canvasSize;
    const fallback: PanelRect = {
      x: size.width * 0.2,
      y: size.height * 0.2,
      width: size.width * 0.5,
      height: size.height * 0.3,
    };
    try {
      const panel = await panelsRepo.createPanel(page.id, rect ?? fallback, data);
      set((s) => ({ panels: [...s.panels, panel], selection: { kind: 'panel', id: panel.id } }));
    } catch (err) {
      fail('Create panel', err);
    }
  },

  async updatePanel(id, patch) {
    set((s) => ({ panels: s.panels.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
    try {
      await panelsRepo.updatePanel(id, patch);
    } catch (err) {
      fail('Save panel', err);
    }
  },

  async deletePanel(id) {
    try {
      await panelsRepo.deletePanel(id);
      set((s) => ({
        panels: s.panels.filter((p) => p.id !== id),
        layers: s.layers.filter((l) => l.panelId !== id),
        selection: s.selection?.id === id ? null : s.selection,
      }));
    } catch (err) {
      fail('Delete panel', err);
    }
  },

  async applyLayout(template) {
    const page = get().currentPage();
    if (!page) return;
    const rects = buildLayout(template, page.canvasSize.width, page.canvasSize.height, page.gutter);
    try {
      await panelsRepo.deletePanelsForPage(page.id);
      const created: Panel[] = [];
      for (let i = 0; i < rects.length; i++) {
        created.push(await panelsRepo.createPanel(page.id, rects[i], { orderIndex: i + 1 }));
      }
      set({ panels: created, layers: [], selection: null });
      toast.success(`Applied “${template.name}” layout`);
    } catch (err) {
      fail('Apply layout', err);
    }
  },

  async createPageFromBeats(chapterId, sceneId, beats, characters) {
    try {
      if (get().chapterId !== chapterId) await get().loadForChapter(chapterId);
      const page = await pagesRepo.createPage(chapterId, { sceneId });
      const rects = autoLayoutRects(
        beats.length,
        page.canvasSize.width,
        page.canvasSize.height,
        page.gutter,
      );
      for (let i = 0; i < beats.length; i++) {
        const b = beats[i];
        const rect = rects[i] ?? rects[rects.length - 1];
        const panel = await panelsRepo.createPanel(page.id, rect, {
          orderIndex: i + 1,
          sceneId,
          cameraDirection: b.cameraHint ?? null,
          promptPositive: b.action ?? null,
        });
        if (b.characterRef) {
          const ref = b.characterRef.toLowerCase();
          const ch = characters.find(
            (c) =>
              ref.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(ref),
          );
          if (ch) {
            await panelLayersRepo.createLayer(panel.id, {
              type: 'character',
              characterId: ch.id,
              content: ch.name,
              zIndex: 0,
              konva: { x: rect.x + 24, y: rect.y + 24 },
            });
          }
        }
        if (b.dialogue) {
          await panelLayersRepo.createLayer(panel.id, {
            type: 'dialogue',
            content: b.dialogue,
            zIndex: 1,
            konva: { x: rect.x + 24, y: rect.y + rect.height - 90 },
          });
        }
      }
      set((s) => ({ pages: [...s.pages, page] }));
      await get().selectPage(page.id);
      toast.success(`Created a page with ${beats.length} panel${beats.length === 1 ? '' : 's'}`);
    } catch (err) {
      fail('Create page from beats', err);
    }
  },

  /* ------------------------------------------------------------------- layers */

  async createLayer(panelId, data) {
    try {
      const siblings = get().layers.filter((l) => l.panelId === panelId);
      const zIndex = data.zIndex ?? siblings.length;
      const layer = await panelLayersRepo.createLayer(panelId, { zIndex, ...data });
      set((s) => ({ layers: [...s.layers, layer], selection: { kind: 'layer', id: layer.id } }));
    } catch (err) {
      fail('Create layer', err);
    }
  },

  async updateLayer(id, patch) {
    set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
    try {
      await panelLayersRepo.updateLayer(id, patch);
    } catch (err) {
      fail('Save layer', err);
    }
  },

  async deleteLayer(id) {
    try {
      await panelLayersRepo.deleteLayer(id);
      set((s) => ({
        layers: s.layers.filter((l) => l.id !== id),
        selection: s.selection?.id === id ? null : s.selection,
      }));
    } catch (err) {
      fail('Delete layer', err);
    }
  },

  async changeLayerZ(id, dir) {
    const layer = get().layers.find((l) => l.id === id);
    if (!layer) return;
    await get().updateLayer(id, { zIndex: Math.max(0, layer.zIndex + dir) });
  },

  select(sel) {
    set({ selection: sel });
  },

  layersForPanel(panelId) {
    return get()
      .layers.filter((l) => l.panelId === panelId)
      .sort((a, b) => a.zIndex - b.zIndex);
  },

  currentPage() {
    return get().pages.find((p) => p.id === get().currentPageId);
  },
}));
