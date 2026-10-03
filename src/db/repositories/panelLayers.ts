import { asc, eq } from 'drizzle-orm';
import { db } from '../client';
import { panelLayers, type NewPanelLayer, type PanelLayer } from '../schema';

export async function listLayersByPanel(panelId: string): Promise<PanelLayer[]> {
  return db
    .select()
    .from(panelLayers)
    .where(eq(panelLayers.panelId, panelId))
    .orderBy(asc(panelLayers.zIndex));
}

export async function createLayer(
  panelId: string,
  data: Partial<Omit<NewPanelLayer, 'id' | 'panelId'>> & Pick<NewPanelLayer, 'type'>,
): Promise<PanelLayer> {
  const [row] = await db.insert(panelLayers).values({ panelId, ...data }).returning();
  return row;
}

export async function updateLayer(
  id: string,
  patch: Partial<Omit<NewPanelLayer, 'id' | 'panelId'>>,
): Promise<PanelLayer | undefined> {
  const [row] = await db.update(panelLayers).set(patch).where(eq(panelLayers.id, id)).returning();
  return row;
}

export async function deleteLayer(id: string): Promise<void> {
  await db.delete(panelLayers).where(eq(panelLayers.id, id));
}
