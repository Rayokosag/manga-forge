import { asc, eq } from 'drizzle-orm';
import { db } from '../client';
import { chapters, type Chapter, type NewChapter } from '../schema';
import { nextOrderIndex, scopeEq } from './helpers';

export async function listChapters(projectId: string): Promise<Chapter[]> {
  return db
    .select()
    .from(chapters)
    .where(eq(chapters.projectId, projectId))
    .orderBy(asc(chapters.orderIndex));
}

export async function createChapter(
  projectId: string,
  data: Partial<Omit<NewChapter, 'id' | 'projectId'>> = {},
): Promise<Chapter> {
  const orderIndex = await nextOrderIndex(
    chapters,
    chapters.orderIndex,
    scopeEq(chapters.projectId, projectId),
  );
  const [row] = await db
    .insert(chapters)
    .values({
      projectId,
      title: data.title ?? 'New Chapter',
      orderIndex,
      ...data,
    })
    .returning();
  return row;
}

export async function updateChapter(
  id: string,
  patch: Partial<Omit<NewChapter, 'id' | 'projectId'>>,
): Promise<Chapter | undefined> {
  const [row] = await db.update(chapters).set(patch).where(eq(chapters.id, id)).returning();
  return row;
}

export async function deleteChapter(id: string): Promise<void> {
  await db.delete(chapters).where(eq(chapters.id, id));
}

/** Persist a reordered list by writing each row's new index. */
export async function reorderChapters(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, i) =>
      db.update(chapters).set({ orderIndex: i + 1 }).where(eq(chapters.id, id)),
    ),
  );
}
