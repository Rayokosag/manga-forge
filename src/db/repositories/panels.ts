import { asc, eq } from 'drizzle-orm';
import { db } from '../client';
import { panels, type NewPanel, type Panel, type PanelRect } from '../schema';
import { nextOrderIndex, scopeEq } from './helpers';

export async function listPanels(pageId: string): Promise<Panel[]> {
  return db
    .select()
    .from(panels)
    .where(eq(panels.pageId, pageId))
    .orderBy(asc(panels.orderIndex));
}

export async function createPanel(
  pageId: string,
  rect: PanelRect,
  data: Partial<Omit<NewPanel, 'id' | 'pageId' | 'rect'>> = {},
): Promise<Panel> {
  const orderIndex =
    data.orderIndex ??
    (await nextOrderIndex(panels, panels.orderIndex, scopeEq(panels.pageId, pageId)));
  const [row] = await db
    .insert(panels)
    .values({ pageId, rect, orderIndex, ...data })
    .returning();
  return row;
}

export async function updatePanel(
  id: string,
  patch: Partial<Omit<NewPanel, 'id' | 'pageId'>>,
): Promise<Panel | undefined> {
  const [row] = await db.update(panels).set(patch).where(eq(panels.id, id)).returning();
  return row;
}

export async function deletePanel(id: string): Promise<void> {
  await db.delete(panels).where(eq(panels.id, id));
}

export async function deletePanelsForPage(pageId: string): Promise<void> {
  await db.delete(panels).where(eq(panels.pageId, pageId));
}
