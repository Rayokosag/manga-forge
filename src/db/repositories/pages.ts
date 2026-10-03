import { asc, eq } from 'drizzle-orm';
import { db } from '../client';
import { pages, type NewPage, type Page } from '../schema';
import { nextOrderIndex, scopeEq } from './helpers';

export async function listPages(chapterId: string): Promise<Page[]> {
  return db
    .select()
    .from(pages)
    .where(eq(pages.chapterId, chapterId))
    .orderBy(asc(pages.pageNumber));
}

export async function createPage(
  chapterId: string,
  data: Partial<Omit<NewPage, 'id' | 'chapterId'>> = {},
): Promise<Page> {
  const pageNumber =
    data.pageNumber ??
    (await nextOrderIndex(pages, pages.pageNumber, scopeEq(pages.chapterId, chapterId)));
  const [row] = await db.insert(pages).values({ chapterId, pageNumber, ...data }).returning();
  return row;
}

export async function updatePage(
  id: string,
  patch: Partial<Omit<NewPage, 'id' | 'chapterId'>>,
): Promise<Page | undefined> {
  const [row] = await db.update(pages).set(patch).where(eq(pages.id, id)).returning();
  return row;
}

export async function deletePage(id: string): Promise<void> {
  await db.delete(pages).where(eq(pages.id, id));
}
