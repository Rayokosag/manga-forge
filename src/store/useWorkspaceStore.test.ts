import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listSceneCharacters, setSceneCharacters } = vi.hoisted(() => ({
  listSceneCharacters: vi.fn(),
  setSceneCharacters: vi.fn(),
}));

vi.mock('@/components/ui/sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/db/repositories', () => ({
  projectsRepo: {},
  chaptersRepo: {},
  scenesRepo: {},
  sceneCharactersRepo: { listSceneCharacters, setSceneCharacters },
}));

import { useWorkspaceStore } from './useWorkspaceStore';

describe('useWorkspaceStore scene-character join', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.setState({ currentSceneId: null, sceneCharacters: [] });
  });

  it('loadSceneCharacters populates state for the current scene', async () => {
    const rows = [{ id: 'sc1', sceneId: 's1', characterId: 'c1' }];
    listSceneCharacters.mockResolvedValue(rows);
    useWorkspaceStore.getState().selectScene('s1');
    await useWorkspaceStore.getState().loadSceneCharacters('s1');
    expect(listSceneCharacters).toHaveBeenCalledWith('s1');
    expect(useWorkspaceStore.getState().sceneCharacters).toEqual(rows);
  });

  it('ignores a load whose scene is no longer current (race guard)', async () => {
    listSceneCharacters.mockResolvedValue([{ id: 'x', sceneId: 's1', characterId: 'c1' }]);
    useWorkspaceStore.getState().selectScene('s2'); // current scene is s2
    await useWorkspaceStore.getState().loadSceneCharacters('s1'); // stale load
    expect(useWorkspaceStore.getState().sceneCharacters).toEqual([]);
  });

  it('selectScene clears the previous scene join rows', () => {
    useWorkspaceStore.setState({
      sceneCharacters: [{ id: 'old', sceneId: 's0', characterId: 'c9' }] as never,
    });
    useWorkspaceStore.getState().selectScene('s1');
    expect(useWorkspaceStore.getState().sceneCharacters).toEqual([]);
    expect(useWorkspaceStore.getState().currentSceneId).toBe('s1');
  });

  it('setSceneCharacterIds reconciles via the repo and stores the result', async () => {
    const rows = [
      { id: 'a', sceneId: 's1', characterId: 'c1' },
      { id: 'b', sceneId: 's1', characterId: 'c2' },
    ];
    setSceneCharacters.mockResolvedValue(rows);
    useWorkspaceStore.getState().selectScene('s1');
    await useWorkspaceStore.getState().setSceneCharacterIds('s1', ['c1', 'c2']);
    expect(setSceneCharacters).toHaveBeenCalledWith('s1', ['c1', 'c2']);
    expect(useWorkspaceStore.getState().sceneCharacters).toEqual(rows);
  });
});
