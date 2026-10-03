import { create } from 'zustand';
import { toast } from '@/components/ui/sonner';
import { snapshotsRepo } from '@/db/repositories';
import { saveBinaryFile, saveTextFile, pickTextFile } from '@/export/fileSave';
import type { ProjectBundle } from '@/export/projectBundle';
import type { Snapshot } from '@/db/schema';
import { useWorkspaceStore } from './useWorkspaceStore';

type Task = 'json' | 'zip' | 'pdf' | 'import' | 'snapshot' | 'restore' | null;

interface RenderedNamedPage {
  name: string;
  width: number;
  height: number;
  dataUrl: string;
}

interface ExportState {
  snapshots: Snapshot[];
  busy: Task;
  progress: string;

  load: (projectId: string | null) => Promise<void>;
  exportJson: () => Promise<void>;
  exportZip: () => Promise<void>;
  exportPdf: () => Promise<void>;
  importJson: () => Promise<void>;
  createSnapshot: (label?: string) => Promise<void>;
  restoreSnapshot: (id: string) => Promise<void>;
  deleteSnapshot: (id: string) => Promise<void>;
}

function fail(scope: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[export] ${scope} failed:`, err);
  toast.error(`${scope} failed`, { description: message });
}

function currentProjectId(): string | null {
  return useWorkspaceStore.getState().currentProjectId;
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
}

/** Sort pages chapter-order then page number and render each to PNG. */
async function renderBundlePages(
  bundle: ProjectBundle,
  onProgress: (s: string) => void,
): Promise<RenderedNamedPage[]> {
  const { renderPageToDataURL } = await import('@/export/renderPage');
  const chapterOrder = new Map(bundle.chapters.map((c) => [c.id, c.orderIndex]));
  const pages = [...bundle.pages].sort(
    (a, b) =>
      (chapterOrder.get(a.chapterId) ?? 0) - (chapterOrder.get(b.chapterId) ?? 0) ||
      a.pageNumber - b.pageNumber,
  );
  const charName = (id: string) => bundle.characters.find((c) => c.id === id)?.name ?? 'Unknown';

  const out: RenderedNamedPage[] = [];
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    onProgress(`Rendering page ${i + 1}/${pages.length}…`);
    const panels = bundle.panels.filter((p) => p.pageId === page.id);
    const panelIds = new Set(panels.map((p) => p.id));
    const layers = bundle.panelLayers.filter((l) => panelIds.has(l.panelId));
    const dataUrl = await renderPageToDataURL(page, panels, layers, charName);
    out.push({
      name: `page-${String(i + 1).padStart(3, '0')}.png`,
      width: page.canvasSize.width,
      height: page.canvasSize.height,
      dataUrl,
    });
  }
  return out;
}

export const useExportStore = create<ExportState>((set, get) => ({
  snapshots: [],
  busy: null,
  progress: '',

  async load(projectId) {
    if (!projectId) {
      set({ snapshots: [] });
      return;
    }
    try {
      set({ snapshots: await snapshotsRepo.listProjectSnapshots(projectId) });
    } catch (err) {
      fail('Load snapshots', err);
    }
  },

  async exportJson() {
    const pid = currentProjectId();
    if (!pid) return;
    set({ busy: 'json', progress: 'Collecting…' });
    try {
      const { collectBundle } = await import('@/export/projectBundle');
      const bundle = await collectBundle(pid);
      const path = await saveTextFile(`${slug(bundle.project.name)}.json`, JSON.stringify(bundle, null, 2), [
        { name: 'JSON', extensions: ['json'] },
      ]);
      if (path) toast.success('Exported project JSON');
    } catch (err) {
      fail('Export JSON', err);
    } finally {
      set({ busy: null, progress: '' });
    }
  },

  async exportZip() {
    const pid = currentProjectId();
    if (!pid) return;
    set({ busy: 'zip', progress: 'Collecting…' });
    try {
      const [{ collectBundle }, { buildZip }] = await Promise.all([
        import('@/export/projectBundle'),
        import('@/export/zip'),
      ]);
      const bundle = await collectBundle(pid);
      const pages = await renderBundlePages(bundle, (progress) => set({ progress }));
      set({ progress: 'Zipping…' });
      const bytes = await buildZip(
        JSON.stringify(bundle, null, 2),
        pages.map((p) => ({ name: p.name, dataUrl: p.dataUrl })),
      );
      const path = await saveBinaryFile(`${slug(bundle.project.name)}.zip`, bytes, [
        { name: 'ZIP archive', extensions: ['zip'] },
      ]);
      if (path) toast.success(`Exported ZIP (${pages.length} page${pages.length === 1 ? '' : 's'})`);
    } catch (err) {
      fail('Export ZIP', err);
    } finally {
      set({ busy: null, progress: '' });
    }
  },

  async exportPdf() {
    const pid = currentProjectId();
    if (!pid) return;
    set({ busy: 'pdf', progress: 'Collecting…' });
    try {
      const [{ collectBundle }, { buildPdf }] = await Promise.all([
        import('@/export/projectBundle'),
        import('@/export/pdf'),
      ]);
      const bundle = await collectBundle(pid);
      const pages = await renderBundlePages(bundle, (progress) => set({ progress }));
      if (pages.length === 0) {
        toast.info('No pages to export — add storyboard pages first.');
        return;
      }
      set({ progress: 'Building PDF…' });
      const bytes = new Uint8Array(buildPdf(pages));
      const path = await saveBinaryFile(`${slug(bundle.project.name)}.pdf`, bytes, [
        { name: 'PDF', extensions: ['pdf'] },
      ]);
      if (path) toast.success(`Exported PDF (${pages.length} page${pages.length === 1 ? '' : 's'})`);
    } catch (err) {
      fail('Export PDF', err);
    } finally {
      set({ busy: null, progress: '' });
    }
  },

  async importJson() {
    set({ busy: 'import', progress: 'Reading file…' });
    try {
      const text = await pickTextFile([{ name: 'Manga Forge JSON', extensions: ['json'] }]);
      if (!text) return;
      const bundle = JSON.parse(text) as ProjectBundle;
      if (!bundle?.project?.id) throw new Error('Not a valid Manga Forge export.');
      set({ progress: 'Importing…' });
      const { importBundle } = await import('@/export/projectBundle');
      const newId = await importBundle(bundle, `${bundle.project.name} (imported)`);
      await useWorkspaceStore.getState().refreshProjects(newId);
      await get().load(newId);
      toast.success('Project imported');
    } catch (err) {
      fail('Import JSON', err);
    } finally {
      set({ busy: null, progress: '' });
    }
  },

  async createSnapshot(label) {
    const pid = currentProjectId();
    if (!pid) return;
    set({ busy: 'snapshot', progress: 'Capturing…' });
    try {
      const { collectBundle } = await import('@/export/projectBundle');
      const bundle = await collectBundle(pid);
      const snap = await snapshotsRepo.createProjectSnapshot(
        pid,
        bundle as unknown as Record<string, unknown>,
        label,
      );
      set((s) => ({ snapshots: [snap, ...s.snapshots] }));
      toast.success('Snapshot saved');
    } catch (err) {
      fail('Create snapshot', err);
    } finally {
      set({ busy: null, progress: '' });
    }
  },

  async restoreSnapshot(id) {
    set({ busy: 'restore', progress: 'Restoring…' });
    try {
      const snap = await snapshotsRepo.getSnapshot(id);
      if (!snap) throw new Error('Snapshot not found');
      const bundle = snap.data as unknown as ProjectBundle;
      const { importBundle } = await import('@/export/projectBundle');
      const newId = await importBundle(bundle, `${bundle.project.name} (restored)`);
      await useWorkspaceStore.getState().refreshProjects(newId);
      await get().load(newId);
      toast.success('Restored snapshot as a new project');
    } catch (err) {
      fail('Restore snapshot', err);
    } finally {
      set({ busy: null, progress: '' });
    }
  },

  async deleteSnapshot(id) {
    try {
      await snapshotsRepo.deleteSnapshot(id);
      set((s) => ({ snapshots: s.snapshots.filter((x) => x.id !== id) }));
    } catch (err) {
      fail('Delete snapshot', err);
    }
  },
}));
