import { create } from 'zustand';
import { toast } from '@/components/ui/sonner';
import {
  charactersRepo,
  expressionsRepo,
  outfitsRepo,
  relationshipsRepo,
} from '@/db/repositories';
import type {
  Character,
  Expression,
  NewCharacter,
  NewExpression,
  NewOutfit,
  NewRelationship,
  Outfit,
  Relationship,
} from '@/db/schema';

interface CastState {
  projectId: string | null;
  loading: boolean;

  characters: Character[];
  relationships: Relationship[];

  // detail scope for the currently open character
  currentCharacterId: string | null;
  outfits: Outfit[];
  expressions: Expression[];

  // relationship graph
  selectedRelationshipId: string | null;

  load: (projectId: string | null) => Promise<void>;

  // characters
  selectCharacter: (id: string | null) => Promise<void>;
  createCharacter: (data?: Partial<NewCharacter>) => Promise<void>;
  updateCharacter: (id: string, patch: Partial<NewCharacter>) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  moveCharacter: (id: string, x: number, y: number) => void;

  // outfits
  createOutfit: (data?: Partial<NewOutfit>) => Promise<void>;
  updateOutfit: (id: string, patch: Partial<NewOutfit>) => Promise<void>;
  deleteOutfit: (id: string) => Promise<void>;

  // expressions
  createExpression: (data?: Partial<NewExpression>) => Promise<void>;
  updateExpression: (id: string, patch: Partial<NewExpression>) => Promise<void>;
  deleteExpression: (id: string) => Promise<void>;

  // relationships
  selectRelationship: (id: string | null) => void;
  createRelationship: (fromId: string, toId: string) => Promise<void>;
  updateRelationship: (id: string, patch: Partial<NewRelationship>) => Promise<void>;
  deleteRelationship: (id: string) => Promise<void>;

  characterName: (id: string) => string;
}

function fail(scope: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[cast] ${scope} failed:`, err);
  toast.error(`${scope} failed`, { description: message });
}

export const useCastStore = create<CastState>((set, get) => ({
  projectId: null,
  loading: false,
  characters: [],
  relationships: [],
  currentCharacterId: null,
  outfits: [],
  expressions: [],
  selectedRelationshipId: null,

  async load(projectId) {
    if (projectId === get().projectId) return;
    set({
      projectId,
      currentCharacterId: null,
      outfits: [],
      expressions: [],
      selectedRelationshipId: null,
      characters: [],
      relationships: [],
    });
    if (!projectId) return;
    set({ loading: true });
    try {
      const [characters, relationships] = await Promise.all([
        charactersRepo.listCharacters(projectId),
        relationshipsRepo.listRelationships(projectId),
      ]);
      set({ characters, relationships, loading: false });
    } catch (err) {
      set({ loading: false });
      fail('Load cast', err);
    }
  },

  /* --------------------------------------------------------------- characters */

  async selectCharacter(id) {
    set({ currentCharacterId: id, outfits: [], expressions: [] });
    if (!id) return;
    const projectId = get().projectId;
    try {
      const [outfits, expressions] = await Promise.all([
        outfitsRepo.listOutfits(id),
        projectId ? expressionsRepo.listExpressions(projectId, id) : Promise.resolve([]),
      ]);
      set({ outfits, expressions });
    } catch (err) {
      fail('Load character detail', err);
    }
  },

  async createCharacter(data) {
    const projectId = get().projectId;
    if (!projectId) return;
    try {
      const character = await charactersRepo.createCharacter(projectId, data);
      set((s) => ({
        characters: [...s.characters, character].sort((a, b) => a.name.localeCompare(b.name)),
      }));
      await get().selectCharacter(character.id);
    } catch (err) {
      fail('Create character', err);
    }
  },

  async updateCharacter(id, patch) {
    set((s) => ({
      characters: s.characters
        .map((c) => (c.id === id ? { ...c, ...patch } : c))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
    try {
      await charactersRepo.updateCharacter(id, patch);
    } catch (err) {
      fail('Save character', err);
    }
  },

  async deleteCharacter(id) {
    try {
      await charactersRepo.deleteCharacter(id);
      set((s) => ({
        characters: s.characters.filter((c) => c.id !== id),
        // relationships touching this character are gone via cascade
        relationships: s.relationships.filter(
          (r) => r.fromCharacterId !== id && r.toCharacterId !== id,
        ),
        currentCharacterId: s.currentCharacterId === id ? null : s.currentCharacterId,
      }));
      toast.success('Character deleted');
    } catch (err) {
      fail('Delete character', err);
    }
  },

  moveCharacter(id, x, y) {
    set((s) => ({
      characters: s.characters.map((c) => (c.id === id ? { ...c, graphX: x, graphY: y } : c)),
    }));
    // fire-and-forget persistence; drag is high-frequency
    void charactersRepo.setGraphPosition(id, x, y).catch((err) => fail('Move node', err));
  },

  /* ------------------------------------------------------------------ outfits */

  async createOutfit(data) {
    const characterId = get().currentCharacterId;
    if (!characterId) return;
    try {
      const outfit = await outfitsRepo.createOutfit(characterId, data);
      set((s) => ({ outfits: [...s.outfits, outfit] }));
    } catch (err) {
      fail('Create outfit', err);
    }
  },

  async updateOutfit(id, patch) {
    set((s) => ({ outfits: s.outfits.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
    try {
      await outfitsRepo.updateOutfit(id, patch);
    } catch (err) {
      fail('Save outfit', err);
    }
  },

  async deleteOutfit(id) {
    try {
      await outfitsRepo.deleteOutfit(id);
      set((s) => ({ outfits: s.outfits.filter((o) => o.id !== id) }));
    } catch (err) {
      fail('Delete outfit', err);
    }
  },

  /* -------------------------------------------------------------- expressions */

  async createExpression(data) {
    const projectId = get().projectId;
    const characterId = get().currentCharacterId;
    if (!projectId) return;
    try {
      const expression = await expressionsRepo.createExpression(projectId, {
        characterId,
        ...data,
      });
      set((s) => ({ expressions: [...s.expressions, expression] }));
    } catch (err) {
      fail('Create expression', err);
    }
  },

  async updateExpression(id, patch) {
    set((s) => ({
      expressions: s.expressions.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
    try {
      await expressionsRepo.updateExpression(id, patch);
    } catch (err) {
      fail('Save expression', err);
    }
  },

  async deleteExpression(id) {
    try {
      await expressionsRepo.deleteExpression(id);
      set((s) => ({ expressions: s.expressions.filter((e) => e.id !== id) }));
    } catch (err) {
      fail('Delete expression', err);
    }
  },

  /* ------------------------------------------------------------ relationships */

  selectRelationship(id) {
    set({ selectedRelationshipId: id });
  },

  async createRelationship(fromId, toId) {
    const projectId = get().projectId;
    if (!projectId || fromId === toId) return;
    const exists = get().relationships.some(
      (r) => r.fromCharacterId === fromId && r.toCharacterId === toId,
    );
    if (exists) {
      toast.info('That relationship already exists');
      return;
    }
    try {
      const rel = await relationshipsRepo.createRelationship(projectId, fromId, toId, {
        vectors: { trust: 0, affection: 0, conflict: 0, jealousy: 0, intimacy: 0, power: 0 },
      });
      set((s) => ({ relationships: [...s.relationships, rel], selectedRelationshipId: rel.id }));
    } catch (err) {
      fail('Create relationship', err);
    }
  },

  async updateRelationship(id, patch) {
    set((s) => ({
      relationships: s.relationships.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
    try {
      await relationshipsRepo.updateRelationship(id, patch);
    } catch (err) {
      fail('Save relationship', err);
    }
  },

  async deleteRelationship(id) {
    try {
      await relationshipsRepo.deleteRelationship(id);
      set((s) => ({
        relationships: s.relationships.filter((r) => r.id !== id),
        selectedRelationshipId: s.selectedRelationshipId === id ? null : s.selectedRelationshipId,
      }));
    } catch (err) {
      fail('Delete relationship', err);
    }
  },

  characterName(id) {
    return get().characters.find((c) => c.id === id)?.name ?? 'Unknown';
  },
}));
