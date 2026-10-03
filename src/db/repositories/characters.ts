import { asc, eq } from 'drizzle-orm';
import { db } from '../client';
import { characters, type Character, type NewCharacter } from '../schema';

export async function listCharacters(projectId: string): Promise<Character[]> {
  return db
    .select()
    .from(characters)
    .where(eq(characters.projectId, projectId))
    .orderBy(asc(characters.name));
}

export async function getCharacter(id: string): Promise<Character | undefined> {
  const rows = await db.select().from(characters).where(eq(characters.id, id)).limit(1);
  return rows[0];
}

export async function createCharacter(
  projectId: string,
  data: Partial<Omit<NewCharacter, 'id' | 'projectId'>> = {},
): Promise<Character> {
  const [row] = await db
    .insert(characters)
    .values({ projectId, name: data.name ?? 'New Character', ...data })
    .returning();
  return row;
}

export async function updateCharacter(
  id: string,
  patch: Partial<Omit<NewCharacter, 'id' | 'projectId'>>,
): Promise<Character | undefined> {
  const [row] = await db
    .update(characters)
    .set(patch)
    .where(eq(characters.id, id))
    .returning();
  return row;
}

export async function deleteCharacter(id: string): Promise<void> {
  await db.delete(characters).where(eq(characters.id, id));
}

/** Lightweight position write used by the relationship graph on drag-end. */
export async function setGraphPosition(id: string, x: number, y: number): Promise<void> {
  await db.update(characters).set({ graphX: x, graphY: y }).where(eq(characters.id, id));
}
