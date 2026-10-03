import { asc, eq } from 'drizzle-orm';
import { db } from '../client';
import { worldEntities, type NewWorldEntity, type WorldEntity } from '../schema';

export async function listWorldEntities(projectId: string): Promise<WorldEntity[]> {
  return db
    .select()
    .from(worldEntities)
    .where(eq(worldEntities.projectId, projectId))
    .orderBy(asc(worldEntities.name));
}

export async function createWorldEntity(
  projectId: string,
  data: Partial<Omit<NewWorldEntity, 'id' | 'projectId'>> = {},
): Promise<WorldEntity> {
  const [row] = await db
    .insert(worldEntities)
    .values({
      projectId,
      name: data.name ?? 'New Entity',
      type: data.type ?? 'custom',
      ...data,
    })
    .returning();
  return row;
}

export async function updateWorldEntity(
  id: string,
  patch: Partial<Omit<NewWorldEntity, 'id' | 'projectId'>>,
): Promise<WorldEntity | undefined> {
  const [row] = await db
    .update(worldEntities)
    .set(patch)
    .where(eq(worldEntities.id, id))
    .returning();
  return row;
}

/** Reparent a node (e.g. when its parent is deleted). */
export async function reparent(id: string, parentId: string | null): Promise<void> {
  await db.update(worldEntities).set({ parentId }).where(eq(worldEntities.id, id));
}

export async function deleteWorldEntity(id: string): Promise<void> {
  // parentId is a soft self-reference (no FK), so callers reparent children first.
  await db.delete(worldEntities).where(eq(worldEntities.id, id));
}
