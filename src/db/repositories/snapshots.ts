import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../client';
import { snapshots, type NewSnapshot, type Snapshot } from '../schema';

const PROJECT_ENTITY = 'project';

export async function listProjectSnapshots(projectId: string): Promise<Snapshot[]> {
  return db
    .select()
    .from(snapshots)
    .where(and(eq(snapshots.projectId, projectId), eq(snapshots.entityType, PROJECT_ENTITY)))
    .orderBy(desc(snapshots.version));
}

export async function createProjectSnapshot(
  projectId: string,
  data: Record<string, unknown>,
  label?: string,
): Promise<Snapshot> {
  const [{ max } = { max: 0 }] = await db
    .select({ max: sql<number>`coalesce(max(${snapshots.version}), 0)` })
    .from(snapshots)
    .where(and(eq(snapshots.projectId, projectId), eq(snapshots.entityType, PROJECT_ENTITY)));

  const row: NewSnapshot = {
    projectId,
    entityType: PROJECT_ENTITY,
    entityId: projectId,
    label: label ?? `Snapshot ${(max ?? 0) + 1}`,
    version: (max ?? 0) + 1,
    data,
  };
  const [created] = await db.insert(snapshots).values(row).returning();
  return created;
}

export async function getSnapshot(id: string): Promise<Snapshot | undefined> {
  const rows = await db.select().from(snapshots).where(eq(snapshots.id, id)).limit(1);
  return rows[0];
}

export async function deleteSnapshot(id: string): Promise<void> {
  await db.delete(snapshots).where(eq(snapshots.id, id));
}
