import { asc, eq } from 'drizzle-orm';
import { db } from '../client';
import { timelineEvents, type NewTimelineEvent, type TimelineEvent } from '../schema';
import { nextOrderIndex, scopeEq } from './helpers';

export async function listTimelineEvents(projectId: string): Promise<TimelineEvent[]> {
  return db
    .select()
    .from(timelineEvents)
    .where(eq(timelineEvents.projectId, projectId))
    .orderBy(asc(timelineEvents.orderIndex));
}

export async function createTimelineEvent(
  projectId: string,
  data: Partial<Omit<NewTimelineEvent, 'id' | 'projectId'>> = {},
): Promise<TimelineEvent> {
  const orderIndex = await nextOrderIndex(
    timelineEvents,
    timelineEvents.orderIndex,
    scopeEq(timelineEvents.projectId, projectId),
  );
  const [row] = await db
    .insert(timelineEvents)
    .values({ projectId, title: data.title ?? 'New Event', orderIndex, ...data })
    .returning();
  return row;
}

export async function updateTimelineEvent(
  id: string,
  patch: Partial<Omit<NewTimelineEvent, 'id' | 'projectId'>>,
): Promise<TimelineEvent | undefined> {
  const [row] = await db
    .update(timelineEvents)
    .set(patch)
    .where(eq(timelineEvents.id, id))
    .returning();
  return row;
}

export async function deleteTimelineEvent(id: string): Promise<void> {
  await db.delete(timelineEvents).where(eq(timelineEvents.id, id));
}

export async function reorderTimelineEvents(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, i) =>
      db.update(timelineEvents).set({ orderIndex: i + 1 }).where(eq(timelineEvents.id, id)),
    ),
  );
}
