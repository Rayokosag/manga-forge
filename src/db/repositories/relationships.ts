import { asc, eq } from 'drizzle-orm';
import { db } from '../client';
import {
  relationshipEvents,
  relationships,
  type NewRelationship,
  type NewRelationshipEvent,
  type Relationship,
  type RelationshipEvent,
} from '../schema';

export async function listRelationships(projectId: string): Promise<Relationship[]> {
  return db
    .select()
    .from(relationships)
    .where(eq(relationships.projectId, projectId))
    .orderBy(asc(relationships.createdAt));
}

export async function createRelationship(
  projectId: string,
  fromCharacterId: string,
  toCharacterId: string,
  data: Partial<Omit<NewRelationship, 'id' | 'projectId' | 'fromCharacterId' | 'toCharacterId'>> = {},
): Promise<Relationship> {
  const [row] = await db
    .insert(relationships)
    .values({ projectId, fromCharacterId, toCharacterId, ...data })
    .returning();
  return row;
}

export async function updateRelationship(
  id: string,
  patch: Partial<Omit<NewRelationship, 'id' | 'projectId'>>,
): Promise<Relationship | undefined> {
  const [row] = await db
    .update(relationships)
    .set(patch)
    .where(eq(relationships.id, id))
    .returning();
  return row;
}

export async function deleteRelationship(id: string): Promise<void> {
  await db.delete(relationships).where(eq(relationships.id, id));
}

/* ------------------------------- timeline events ------------------------------- */

export async function listRelationshipEvents(
  relationshipId: string,
): Promise<RelationshipEvent[]> {
  return db
    .select()
    .from(relationshipEvents)
    .where(eq(relationshipEvents.relationshipId, relationshipId))
    .orderBy(asc(relationshipEvents.orderIndex));
}

export async function createRelationshipEvent(
  relationshipId: string,
  data: Partial<Omit<NewRelationshipEvent, 'id' | 'relationshipId'>> = {},
): Promise<RelationshipEvent> {
  const [row] = await db
    .insert(relationshipEvents)
    .values({ relationshipId, ...data })
    .returning();
  return row;
}

export async function deleteRelationshipEvent(id: string): Promise<void> {
  await db.delete(relationshipEvents).where(eq(relationshipEvents.id, id));
}
