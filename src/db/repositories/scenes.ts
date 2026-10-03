import { asc, eq } from 'drizzle-orm';
import { db } from '../client';
import { scenes, type NewScene, type Scene } from '../schema';
import { nextOrderIndex, scopeEq } from './helpers';

export async function listScenes(chapterId: string): Promise<Scene[]> {
  return db
    .select()
    .from(scenes)
    .where(eq(scenes.chapterId, chapterId))
    .orderBy(asc(scenes.orderIndex));
}

export async function getScene(id: string): Promise<Scene | undefined> {
  const rows = await db.select().from(scenes).where(eq(scenes.id, id)).limit(1);
  return rows[0];
}

export async function createScene(
  chapterId: string,
  data: Partial<Omit<NewScene, 'id' | 'chapterId'>> = {},
): Promise<Scene> {
  const orderIndex = await nextOrderIndex(
    scenes,
    scenes.orderIndex,
    scopeEq(scenes.chapterId, chapterId),
  );
  const [row] = await db
    .insert(scenes)
    .values({
      chapterId,
      title: data.title ?? 'New Scene',
      orderIndex,
      ...data,
    })
    .returning();
  return row;
}

export async function updateScene(
  id: string,
  patch: Partial<Omit<NewScene, 'id' | 'chapterId'>>,
): Promise<Scene | undefined> {
  const [row] = await db.update(scenes).set(patch).where(eq(scenes.id, id)).returning();
  return row;
}

export async function deleteScene(id: string): Promise<void> {
  await db.delete(scenes).where(eq(scenes.id, id));
}

export async function reorderScenes(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, i) =>
      db.update(scenes).set({ orderIndex: i + 1 }).where(eq(scenes.id, id)),
    ),
  );
}
