import { asc, eq } from 'drizzle-orm';
import { db } from '../client';
import { projects, type NewProject, type Project } from '../schema';

export async function listProjects(): Promise<Project[]> {
  return db.select().from(projects).orderBy(asc(projects.name));
}

export async function getProject(id: string): Promise<Project | undefined> {
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0];
}

export async function createProject(
  data: Pick<NewProject, 'name'> & Partial<NewProject>,
): Promise<Project> {
  const [row] = await db.insert(projects).values(data).returning();
  return row;
}

export async function updateProject(
  id: string,
  patch: Partial<Omit<NewProject, 'id'>>,
): Promise<Project | undefined> {
  const [row] = await db
    .update(projects)
    .set(patch)
    .where(eq(projects.id, id))
    .returning();
  return row;
}

export async function deleteProject(id: string): Promise<void> {
  // Cascades to chapters → scenes, characters, world, etc. via FK ON DELETE.
  await db.delete(projects).where(eq(projects.id, id));
}
