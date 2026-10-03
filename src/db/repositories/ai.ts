import { and, desc, eq, isNull, or } from 'drizzle-orm';
import { db } from '../client';
import {
  agentRuns,
  aiSettings,
  type AgentRun,
  type AiSetting,
  type NewAgentRun,
  type NewAiSetting,
} from '../schema';

/* ------------------------------------------------------------- ai settings */

/** Global connections (projectId NULL) plus the project's own, if given. */
export async function listAiSettings(projectId?: string | null): Promise<AiSetting[]> {
  const scope = projectId
    ? or(isNull(aiSettings.projectId), eq(aiSettings.projectId, projectId))
    : undefined;
  const q = db.select().from(aiSettings);
  return (scope ? await q.where(scope) : await q).sort((a, b) => a.label.localeCompare(b.label));
}

export async function createAiSetting(
  data: Pick<NewAiSetting, 'label' | 'provider' | 'endpoint'> & Partial<NewAiSetting>,
): Promise<AiSetting> {
  const [row] = await db.insert(aiSettings).values(data).returning();
  return row;
}

export async function updateAiSetting(
  id: string,
  patch: Partial<Omit<NewAiSetting, 'id'>>,
): Promise<AiSetting | undefined> {
  const [row] = await db.update(aiSettings).set(patch).where(eq(aiSettings.id, id)).returning();
  return row;
}

export async function deleteAiSetting(id: string): Promise<void> {
  await db.delete(aiSettings).where(eq(aiSettings.id, id));
}

/* -------------------------------------------------------------- agent runs */

export async function createAgentRun(
  data: Pick<NewAgentRun, 'projectId' | 'agentRole'> & Partial<NewAgentRun>,
): Promise<AgentRun> {
  const [row] = await db.insert(agentRuns).values(data).returning();
  return row;
}

export async function updateAgentRun(
  id: string,
  patch: Partial<Omit<NewAgentRun, 'id' | 'projectId'>>,
): Promise<AgentRun | undefined> {
  const [row] = await db.update(agentRuns).set(patch).where(eq(agentRuns.id, id)).returning();
  return row;
}

export async function listAgentRuns(projectId: string, limit = 25): Promise<AgentRun[]> {
  return db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.projectId, projectId))
    .orderBy(desc(agentRuns.createdAt))
    .limit(limit);
}

export { and };
