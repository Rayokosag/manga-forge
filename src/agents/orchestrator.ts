import { aiRepo } from '@/db/repositories';
import { AI_AGENT_ROLES } from '@/db/schema';

type AgentRole = (typeof AI_AGENT_ROLES)[number];

export { runStoryParse } from './storyAgent';
export { runContinuityCheck } from './continuityAgent';
export { runPromptEnhance } from './promptAgent';
export type { ContinuityFlag } from './core';

/**
 * Wrap an agent call with persistent logging to `agent_runs`: records queued →
 * running → done/error so background work is auditable and never silently lost.
 * The agent's own logic stays pure; this only handles bookkeeping.
 */
export async function withAgentRun<T>(
  meta: {
    projectId: string;
    role: AgentRole;
    targetType?: string;
    targetId?: string;
    input?: Record<string, unknown>;
  },
  exec: () => Promise<T>,
): Promise<T> {
  const run = await aiRepo.createAgentRun({
    projectId: meta.projectId,
    agentRole: meta.role,
    targetType: meta.targetType,
    targetId: meta.targetId,
    input: meta.input,
    status: 'running',
    startedAt: new Date(),
  });
  try {
    const result = await exec();
    await aiRepo.updateAgentRun(run.id, {
      status: 'done',
      output: result as Record<string, unknown>,
      finishedAt: new Date(),
    });
    return result;
  } catch (err) {
    await aiRepo.updateAgentRun(run.id, {
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
      finishedAt: new Date(),
    });
    throw err;
  }
}
