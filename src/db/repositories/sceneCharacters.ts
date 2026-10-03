import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../client';
import { sceneCharacters, type NewSceneCharacter, type SceneCharacter } from '../schema';
import { reconcileIds } from './reconcile';

export async function listSceneCharacters(sceneId: string): Promise<SceneCharacter[]> {
  return db.select().from(sceneCharacters).where(eq(sceneCharacters.sceneId, sceneId));
}

export async function addSceneCharacter(
  sceneId: string,
  characterId: string,
  data: Partial<Omit<NewSceneCharacter, 'id' | 'sceneId' | 'characterId'>> = {},
): Promise<SceneCharacter> {
  const [row] = await db
    .insert(sceneCharacters)
    .values({ sceneId, characterId, ...data })
    .returning();
  return row;
}

export async function updateSceneCharacter(
  id: string,
  patch: Partial<Omit<NewSceneCharacter, 'id' | 'sceneId' | 'characterId'>>,
): Promise<SceneCharacter | undefined> {
  const [row] = await db
    .update(sceneCharacters)
    .set(patch)
    .where(eq(sceneCharacters.id, id))
    .returning();
  return row;
}

export async function removeSceneCharacter(sceneId: string, characterId: string): Promise<void> {
  await db
    .delete(sceneCharacters)
    .where(
      and(eq(sceneCharacters.sceneId, sceneId), eq(sceneCharacters.characterId, characterId)),
    );
}

/**
 * Reconcile the join rows for a scene to exactly `characterIds`: insert any
 * missing, delete any no-longer-present, leave existing rows (and their
 * per-scene outfit/expression/pose state) untouched. Returns the new set.
 */
export async function setSceneCharacters(
  sceneId: string,
  characterIds: string[],
): Promise<SceneCharacter[]> {
  const existing = await listSceneCharacters(sceneId);
  const { toAdd, toRemove } = reconcileIds(
    existing.map((r) => r.characterId),
    characterIds,
  );

  if (toAdd.length) {
    await db
      .insert(sceneCharacters)
      .values(toAdd.map((characterId) => ({ sceneId, characterId })));
  }
  if (toRemove.length) {
    await db
      .delete(sceneCharacters)
      .where(
        and(
          eq(sceneCharacters.sceneId, sceneId),
          inArray(sceneCharacters.characterId, toRemove),
        ),
      );
  }
  return listSceneCharacters(sceneId);
}
