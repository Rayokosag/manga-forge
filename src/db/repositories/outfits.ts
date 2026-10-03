import { asc, eq } from 'drizzle-orm';
import { db } from '../client';
import { outfits, type NewOutfit, type Outfit } from '../schema';

export async function listOutfits(characterId: string): Promise<Outfit[]> {
  return db
    .select()
    .from(outfits)
    .where(eq(outfits.characterId, characterId))
    .orderBy(asc(outfits.name));
}

export async function createOutfit(
  characterId: string,
  data: Partial<Omit<NewOutfit, 'id' | 'characterId'>> = {},
): Promise<Outfit> {
  const [row] = await db
    .insert(outfits)
    .values({ characterId, name: data.name ?? 'New Outfit', ...data })
    .returning();
  return row;
}

export async function updateOutfit(
  id: string,
  patch: Partial<Omit<NewOutfit, 'id' | 'characterId'>>,
): Promise<Outfit | undefined> {
  const [row] = await db.update(outfits).set(patch).where(eq(outfits.id, id)).returning();
  return row;
}

export async function deleteOutfit(id: string): Promise<void> {
  await db.delete(outfits).where(eq(outfits.id, id));
}
