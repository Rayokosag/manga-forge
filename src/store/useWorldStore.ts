import { create } from 'zustand';
import { toast } from '@/components/ui/sonner';
import { timelineRepo, worldRepo } from '@/db/repositories';
import type {
  NewTimelineEvent,
  NewWorldEntity,
  TimelineEvent,
  WorldEntity,
} from '@/db/schema';

interface WorldState {
  projectId: string | null;
  loading: boolean;

  entities: WorldEntity[];
  events: TimelineEvent[];

  currentEntityId: string | null;
  currentEventId: string | null;

  load: (projectId: string | null) => Promise<void>;

  // world entities
  selectEntity: (id: string | null) => void;
  createEntity: (data?: Partial<NewWorldEntity>) => Promise<void>;
  updateEntity: (id: string, patch: Partial<NewWorldEntity>) => Promise<void>;
  deleteEntity: (id: string) => Promise<void>;

  // timeline
  selectEvent: (id: string | null) => void;
  createEvent: (data?: Partial<NewTimelineEvent>) => Promise<void>;
  updateEvent: (id: string, patch: Partial<NewTimelineEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  moveEvent: (id: string, dir: -1 | 1) => Promise<void>;

  entityName: (id: string) => string;
}

function fail(scope: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[world] ${scope} failed:`, err);
  toast.error(`${scope} failed`, { description: message });
}

export const useWorldStore = create<WorldState>((set, get) => ({
  projectId: null,
  loading: false,
  entities: [],
  events: [],
  currentEntityId: null,
  currentEventId: null,

  async load(projectId) {
    if (projectId === get().projectId) return;
    set({
      projectId,
      entities: [],
      events: [],
      currentEntityId: null,
      currentEventId: null,
    });
    if (!projectId) return;
    set({ loading: true });
    try {
      const [entities, events] = await Promise.all([
        worldRepo.listWorldEntities(projectId),
        timelineRepo.listTimelineEvents(projectId),
      ]);
      set({ entities, events, loading: false });
    } catch (err) {
      set({ loading: false });
      fail('Load world', err);
    }
  },

  /* ----------------------------------------------------------- world entities */

  selectEntity(id) {
    set({ currentEntityId: id });
  },

  async createEntity(data) {
    const projectId = get().projectId;
    if (!projectId) return;
    try {
      const entity = await worldRepo.createWorldEntity(projectId, data);
      set((s) => ({
        entities: [...s.entities, entity].sort((a, b) => a.name.localeCompare(b.name)),
        currentEntityId: entity.id,
      }));
    } catch (err) {
      fail('Create entity', err);
    }
  },

  async updateEntity(id, patch) {
    set((s) => ({
      entities: s.entities
        .map((e) => (e.id === id ? { ...e, ...patch } : e))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
    try {
      await worldRepo.updateWorldEntity(id, patch);
    } catch (err) {
      fail('Save entity', err);
    }
  },

  async deleteEntity(id) {
    const { entities } = get();
    const target = entities.find((e) => e.id === id);
    if (!target) return;
    // Reparent direct children to the deleted node's parent (no dangling refs).
    const children = entities.filter((e) => e.parentId === id);
    try {
      await Promise.all(children.map((c) => worldRepo.reparent(c.id, target.parentId ?? null)));
      await worldRepo.deleteWorldEntity(id);
      set((s) => ({
        entities: s.entities
          .filter((e) => e.id !== id)
          .map((e) => (e.parentId === id ? { ...e, parentId: target.parentId ?? null } : e)),
        currentEntityId: s.currentEntityId === id ? null : s.currentEntityId,
      }));
      toast.success('Entity deleted');
    } catch (err) {
      fail('Delete entity', err);
    }
  },

  /* ------------------------------------------------------------------ timeline */

  selectEvent(id) {
    set({ currentEventId: id });
  },

  async createEvent(data) {
    const projectId = get().projectId;
    if (!projectId) return;
    try {
      const event = await timelineRepo.createTimelineEvent(projectId, data);
      set((s) => ({ events: [...s.events, event], currentEventId: event.id }));
    } catch (err) {
      fail('Create event', err);
    }
  },

  async updateEvent(id, patch) {
    set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
    try {
      await timelineRepo.updateTimelineEvent(id, patch);
    } catch (err) {
      fail('Save event', err);
    }
  },

  async deleteEvent(id) {
    try {
      await timelineRepo.deleteTimelineEvent(id);
      set((s) => ({
        events: s.events.filter((e) => e.id !== id),
        currentEventId: s.currentEventId === id ? null : s.currentEventId,
      }));
      toast.success('Event deleted');
    } catch (err) {
      fail('Delete event', err);
    }
  },

  async moveEvent(id, dir) {
    const ordered = [...get().events].sort((a, b) => a.orderIndex - b.orderIndex);
    const i = ordered.findIndex((e) => e.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ordered.length) return;
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    const reindexed = ordered.map((e, idx) => ({ ...e, orderIndex: idx + 1 }));
    set({ events: reindexed });
    try {
      await timelineRepo.reorderTimelineEvents(reindexed.map((e) => e.id));
    } catch (err) {
      fail('Reorder events', err);
    }
  },

  entityName(id) {
    return get().entities.find((e) => e.id === id)?.name ?? 'Unknown';
  },
}));
