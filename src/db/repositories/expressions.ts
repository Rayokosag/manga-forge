import { and, asc, eq, isNull, or } from 'drizzle-orm';
import { db } from '../client';
import { expressions, type Expression, type NewExpression } from '../schema';

/**
 * Expressions for a character = the character's own rows PLUS project-global
 * rows (characterId IS NULL). With no characterId, returns every project row.
 */
export async function listExpressions(
  projectId: string,
  characterId?: string | null,
): Promise<Expression[]> {
  const scope = characterId
    ? and(
        eq(expressions.projectId, projectId),
        or(eq(expressions.characterId, characterId), isNull(expressions.characterId)),
      )
    : eq(expressions.projectId, projectId);
  return db.select().from(expressions).where(scope).orderBy(asc(expressions.name));
}

export async function createExpression(
  projectId: string,
  data: Partial<Omit<NewExpression, 'id' | 'projectId'>> = {},
): Promise<Expression> {
  const [row] = await db
    .insert(expressions)
    .values({ projectId, name: data.name ?? 'New Expression', ...data })
    .returning();
  return row;
}

export async function updateExpression(
  id: string,
  patch: Partial<Omit<NewExpression, 'id' | 'projectId'>>,
): Promise<Expression | undefined> {
  const [row] = await db
    .update(expressions)
    .set(patch)
    .where(eq(expressions.id, id))
    .returning();
  return row;
}

export async function deleteExpression(id: string): Promise<void> {
  await db.delete(expressions).where(eq(expressions.id, id));
}
