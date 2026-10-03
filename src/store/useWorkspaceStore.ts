import { create } from 'zustand';
import { toast } from '@/components/ui/sonner';
import { chaptersRepo, projectsRepo, scenesRepo } from '@/db/repositories';
import type {
  Chapter,
  NewChapter,
  NewProject,
  NewScene,
  Project,
  Scene,
} from '@/db/schema';

interface WorkspaceState {
  ready: boolean;
  dbError: string | null;

  projects: Project[];
  chapters: Chapter[];
  scenes: Scene[];

  currentProjectId: string | null;
  currentChapterId: string | null;
  currentSceneId: string | null;

  focusMode: boolean;

  // lifecycle
  init: () => Promise<void>;
  refreshProjects: (selectId?: string) => Promise<void>;

  // projects
  selectProject: (id: string) => Promise<void>;
  createProject: (data: Pick<NewProject, 'name'> & Partial<NewProject>) => Promise<void>;
  updateProject: (id: string, patch: Partial<NewProject>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // chapters
  selectChapter: (id: string) => Promise<void>;
  createChapter: (data?: Partial<NewChapter>) => Promise<void>;
  updateChapter: (id: string, patch: Partial<NewChapter>) => Promise<void>;
  deleteChapter: (id: string) => Promise<void>;

  // scenes
  selectScene: (id: string | null) => void;
  createScene: (data?: Partial<NewScene>) => Promise<void>;
  updateScene: (id: string, patch: Partial<NewScene>) => Promise<void>;
  deleteScene: (id: string) => Promise<void>;

  // ui
  toggleFocusMode: () => void;

  // selectors
  currentScene: () => Scene | undefined;
}

function fail(scope: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[workspace] ${scope} failed:`, err);
  toast.error(`${scope} failed`, { description: message });
  return message;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ready: false,
  dbError: null,
  projects: [],
  chapters: [],
  scenes: [],
  currentProjectId: null,
  currentChapterId: null,
  currentSceneId: null,
  focusMode: false,

  async init() {
    try {
      const projects = await projectsRepo.listProjects();
      set({ projects, ready: true, dbError: null });
      if (projects[0]) await get().selectProject(projects[0].id);
    } catch (err) {
      set({ ready: true, dbError: fail('Database init', err) });
    }
  },

  async refreshProjects(selectId) {
    try {
      const projects = await projectsRepo.listProjects();
      set({ projects });
      const keep = get().currentProjectId;
      const target =
        (selectId && projects.some((p) => p.id === selectId) && selectId) ||
        (keep && projects.some((p) => p.id === keep) && keep) ||
        projects[0]?.id;
      if (target) await get().selectProject(target);
      else
        set({
          currentProjectId: null,
          currentChapterId: null,
          currentSceneId: null,
          chapters: [],
          scenes: [],
        });
    } catch (err) {
      fail('Refresh projects', err);
    }
  },

  /* ---------------------------------------------------------------- projects */

  async selectProject(id) {
    set({ currentProjectId: id, currentChapterId: null, currentSceneId: null, scenes: [] });
    try {
      const chapters = await chaptersRepo.listChapters(id);
      set({ chapters });
      if (chapters[0]) await get().selectChapter(chapters[0].id);
      else set({ chapters: [] });
    } catch (err) {
      fail('Load chapters', err);
    }
  },

  async createProject(data) {
    try {
      const project = await projectsRepo.createProject(data);
      set((s) => ({ projects: [...s.projects, project].sort((a, b) => a.name.localeCompare(b.name)) }));
      await get().selectProject(project.id);
      toast.success(`Created project “${project.name}”`);
    } catch (err) {
      fail('Create project', err);
    }
  },

  async updateProject(id, patch) {
    try {
      const updated = await projectsRepo.updateProject(id, patch);
      if (!updated) return;
      set((s) => ({
        projects: s.projects
          .map((p) => (p.id === id ? updated : p))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }));
    } catch (err) {
      fail('Update project', err);
    }
  },

  async deleteProject(id) {
    try {
      await projectsRepo.deleteProject(id);
      const projects = get().projects.filter((p) => p.id !== id);
      set({ projects });
      if (get().currentProjectId === id) {
        if (projects[0]) await get().selectProject(projects[0].id);
        else
          set({
            currentProjectId: null,
            currentChapterId: null,
            currentSceneId: null,
            chapters: [],
            scenes: [],
          });
      }
      toast.success('Project deleted');
    } catch (err) {
      fail('Delete project', err);
    }
  },

  /* ---------------------------------------------------------------- chapters */

  async selectChapter(id) {
    set({ currentChapterId: id, currentSceneId: null });
    try {
      const scenes = await scenesRepo.listScenes(id);
      set({ scenes, currentSceneId: scenes[0]?.id ?? null });
    } catch (err) {
      fail('Load scenes', err);
    }
  },

  async createChapter(data) {
    const projectId = get().currentProjectId;
    if (!projectId) return;
    try {
      const chapter = await chaptersRepo.createChapter(projectId, data);
      set((s) => ({ chapters: [...s.chapters, chapter] }));
      await get().selectChapter(chapter.id);
    } catch (err) {
      fail('Create chapter', err);
    }
  },

  async updateChapter(id, patch) {
    try {
      const updated = await chaptersRepo.updateChapter(id, patch);
      if (!updated) return;
      set((s) => ({ chapters: s.chapters.map((c) => (c.id === id ? updated : c)) }));
    } catch (err) {
      fail('Update chapter', err);
    }
  },

  async deleteChapter(id) {
    try {
      await chaptersRepo.deleteChapter(id);
      const chapters = get().chapters.filter((c) => c.id !== id);
      set({ chapters });
      if (get().currentChapterId === id) {
        if (chapters[0]) await get().selectChapter(chapters[0].id);
        else set({ currentChapterId: null, currentSceneId: null, scenes: [] });
      }
      toast.success('Chapter deleted');
    } catch (err) {
      fail('Delete chapter', err);
    }
  },

  /* ------------------------------------------------------------------ scenes */

  selectScene(id) {
    set({ currentSceneId: id });
  },

  async createScene(data) {
    const chapterId = get().currentChapterId;
    if (!chapterId) return;
    try {
      const scene = await scenesRepo.createScene(chapterId, data);
      set((s) => ({ scenes: [...s.scenes, scene], currentSceneId: scene.id }));
    } catch (err) {
      fail('Create scene', err);
    }
  },

  async updateScene(id, patch) {
    // Optimistic local merge keeps the editor + sidebar instant.
    set((s) => ({
      scenes: s.scenes.map((sc) => (sc.id === id ? { ...sc, ...patch } : sc)),
    }));
    try {
      const updated = await scenesRepo.updateScene(id, patch);
      if (updated) {
        set((s) => ({ scenes: s.scenes.map((sc) => (sc.id === id ? updated : sc)) }));
      }
    } catch (err) {
      fail('Save scene', err);
    }
  },

  async deleteScene(id) {
    try {
      await scenesRepo.deleteScene(id);
      const scenes = get().scenes.filter((sc) => sc.id !== id);
      set({ scenes });
      if (get().currentSceneId === id) set({ currentSceneId: scenes[0]?.id ?? null });
      toast.success('Scene deleted');
    } catch (err) {
      fail('Delete scene', err);
    }
  },

  /* ---------------------------------------------------------------------- ui */

  toggleFocusMode() {
    set((s) => ({ focusMode: !s.focusMode }));
  },

  currentScene() {
    const { scenes, currentSceneId } = get();
    return scenes.find((s) => s.id === currentSceneId);
  },
}));
