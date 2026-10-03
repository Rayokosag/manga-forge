import { eq, inArray } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { db } from '@/db/client';
import * as s from '@/db/schema';

export const BUNDLE_VERSION = 1;

export interface ProjectBundle {
  bundleVersion: number;
  exportedAt: string;
  project: s.Project;
  chapters: s.Chapter[];
  scenes: s.Scene[];
  sceneCharacters: s.SceneCharacter[];
  characters: s.Character[];
  outfits: s.Outfit[];
  expressions: s.Expression[];
  relationships: s.Relationship[];
  relationshipEvents: s.RelationshipEvent[];
  worldEntities: s.WorldEntity[];
  timelineEvents: s.TimelineEvent[];
  pages: s.Page[];
  panels: s.Panel[];
  panelLayers: s.PanelLayer[];
  promptTemplates: s.PromptTemplate[];
  aiSettings: s.AiSetting[];
}

/** Collect every row belonging to a project into one portable bundle. */
export async function collectBundle(projectId: string): Promise<ProjectBundle> {
  const [project] = await db.select().from(s.projects).where(eq(s.projects.id, projectId));
  if (!project) throw new Error('Project not found');

  const chapters = await db.select().from(s.chapters).where(eq(s.chapters.projectId, projectId));
  const chapterIds = chapters.map((c) => c.id);
  const scenes = chapterIds.length
    ? await db.select().from(s.scenes).where(inArray(s.scenes.chapterId, chapterIds))
    : [];
  const sceneIds = scenes.map((x) => x.id);

  const characters = await db
    .select()
    .from(s.characters)
    .where(eq(s.characters.projectId, projectId));
  const charIds = characters.map((c) => c.id);
  const outfits = charIds.length
    ? await db.select().from(s.outfits).where(inArray(s.outfits.characterId, charIds))
    : [];
  const expressions = await db
    .select()
    .from(s.expressions)
    .where(eq(s.expressions.projectId, projectId));
  const sceneCharacters = sceneIds.length
    ? await db.select().from(s.sceneCharacters).where(inArray(s.sceneCharacters.sceneId, sceneIds))
    : [];

  const relationships = await db
    .select()
    .from(s.relationships)
    .where(eq(s.relationships.projectId, projectId));
  const relIds = relationships.map((r) => r.id);
  const relationshipEvents = relIds.length
    ? await db
        .select()
        .from(s.relationshipEvents)
        .where(inArray(s.relationshipEvents.relationshipId, relIds))
    : [];

  const worldEntities = await db
    .select()
    .from(s.worldEntities)
    .where(eq(s.worldEntities.projectId, projectId));
  const timelineEvents = await db
    .select()
    .from(s.timelineEvents)
    .where(eq(s.timelineEvents.projectId, projectId));

  const pages = chapterIds.length
    ? await db.select().from(s.pages).where(inArray(s.pages.chapterId, chapterIds))
    : [];
  const pageIds = pages.map((p) => p.id);
  const panels = pageIds.length
    ? await db.select().from(s.panels).where(inArray(s.panels.pageId, pageIds))
    : [];
  const panelIds = panels.map((p) => p.id);
  const panelLayers = panelIds.length
    ? await db.select().from(s.panelLayers).where(inArray(s.panelLayers.panelId, panelIds))
    : [];

  const promptTemplates = await db
    .select()
    .from(s.promptTemplates)
    .where(eq(s.promptTemplates.projectId, projectId));
  const aiSettings = await db
    .select()
    .from(s.aiSettings)
    .where(eq(s.aiSettings.projectId, projectId));

  return {
    bundleVersion: BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    project,
    chapters,
    scenes,
    sceneCharacters,
    characters,
    outfits,
    expressions,
    relationships,
    relationshipEvents,
    worldEntities,
    timelineEvents,
    pages,
    panels,
    panelLayers,
    promptTemplates,
    aiSettings,
  };
}

/* -------------------------------------------------------------- import ----- */

type Row = Record<string, unknown>;
const uuid = () => crypto.randomUUID();
/** Build old-id → new-id map and strip volatile columns. */
const idMap = (rows: { id: string }[]) => new Map(rows.map((r) => [r.id, uuid()]));
const strip = (row: Row): Row => {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = row;
  void _id;
  void _c;
  void _u;
  return rest;
};
const req = (m: Map<string, string>, id: string) => m.get(id) ?? id;
const opt = (m: Map<string, string>, id: string | null | undefined) =>
  id ? (m.get(id) ?? null) : null;
const mapIds = (m: Map<string, string>, ids?: string[] | null) =>
  (ids ?? []).map((x) => m.get(x) ?? x);

async function insertAll(table: SQLiteTable, rows: Row[]): Promise<void> {
  if (rows.length) await db.insert(table).values(rows as never);
}

/**
 * Insert a bundle as a brand-new project, remapping every id and foreign key so
 * nothing collides with existing data. Returns the new project id.
 * Volatile timestamps are dropped so the DB re-stamps them.
 */
export async function importBundle(
  bundle: ProjectBundle,
  rename?: string,
): Promise<string> {
  const pid = uuid();
  const chapters = idMap(bundle.chapters);
  const scenesM = idMap(bundle.scenes);
  const charsM = idMap(bundle.characters);
  const outfitsM = idMap(bundle.outfits);
  const exprM = idMap(bundle.expressions);
  const relM = idMap(bundle.relationships);
  const worldM = idMap(bundle.worldEntities);
  const pagesM = idMap(bundle.pages);
  const panelsM = idMap(bundle.panels);

  await db.insert(s.projects).values({
    ...strip(bundle.project),
    id: pid,
    name: rename ?? bundle.project.name,
  } as never);

  await insertAll(
    s.worldEntities,
    bundle.worldEntities.map((e) => ({
      ...strip(e),
      id: worldM.get(e.id),
      projectId: pid,
      parentId: opt(worldM, e.parentId),
    })),
  );

  await insertAll(
    s.characters,
    bundle.characters.map((c) => ({ ...strip(c), id: charsM.get(c.id), projectId: pid })),
  );

  await insertAll(
    s.chapters,
    bundle.chapters.map((c) => ({ ...strip(c), id: chapters.get(c.id), projectId: pid })),
  );

  await insertAll(
    s.scenes,
    bundle.scenes.map((sc) => ({
      ...strip(sc),
      id: scenesM.get(sc.id),
      chapterId: req(chapters, sc.chapterId),
      locationId: opt(worldM, sc.locationId),
    })),
  );

  await insertAll(
    s.outfits,
    bundle.outfits.map((o) => ({
      ...strip(o),
      id: outfitsM.get(o.id),
      characterId: req(charsM, o.characterId),
    })),
  );

  await insertAll(
    s.expressions,
    bundle.expressions.map((e) => ({
      ...strip(e),
      id: exprM.get(e.id),
      projectId: pid,
      characterId: opt(charsM, e.characterId),
    })),
  );

  await insertAll(
    s.sceneCharacters,
    bundle.sceneCharacters.map((sc) => ({
      ...strip(sc),
      id: uuid(),
      sceneId: req(scenesM, sc.sceneId),
      characterId: req(charsM, sc.characterId),
      outfitId: opt(outfitsM, sc.outfitId),
      expressionId: opt(exprM, sc.expressionId),
    })),
  );

  await insertAll(
    s.relationships,
    bundle.relationships.map((r) => ({
      ...strip(r),
      id: relM.get(r.id),
      projectId: pid,
      fromCharacterId: req(charsM, r.fromCharacterId),
      toCharacterId: req(charsM, r.toCharacterId),
    })),
  );

  await insertAll(
    s.relationshipEvents,
    bundle.relationshipEvents.map((e) => ({
      ...strip(e),
      id: uuid(),
      relationshipId: req(relM, e.relationshipId),
      chapterId: opt(chapters, e.chapterId),
      sceneId: opt(scenesM, e.sceneId),
    })),
  );

  await insertAll(
    s.timelineEvents,
    bundle.timelineEvents.map((e) => ({
      ...strip(e),
      id: uuid(),
      projectId: pid,
      chapterId: opt(chapters, e.chapterId),
      sceneId: opt(scenesM, e.sceneId),
      affectedCharacterIds: mapIds(charsM, e.affectedCharacterIds),
      affectedEntityIds: mapIds(worldM, e.affectedEntityIds),
    })),
  );

  await insertAll(
    s.pages,
    bundle.pages.map((p) => ({
      ...strip(p),
      id: pagesM.get(p.id),
      chapterId: req(chapters, p.chapterId),
      sceneId: opt(scenesM, p.sceneId),
    })),
  );

  await insertAll(
    s.panels,
    bundle.panels.map((p) => ({
      ...strip(p),
      id: panelsM.get(p.id),
      pageId: req(pagesM, p.pageId),
      sceneId: opt(scenesM, p.sceneId),
    })),
  );

  await insertAll(
    s.panelLayers,
    bundle.panelLayers.map((l) => ({
      ...strip(l),
      id: uuid(),
      panelId: req(panelsM, l.panelId),
      characterId: opt(charsM, l.characterId),
    })),
  );

  await insertAll(
    s.promptTemplates,
    bundle.promptTemplates.map((p) => ({ ...strip(p), id: uuid(), projectId: pid })),
  );

  await insertAll(
    s.aiSettings,
    bundle.aiSettings.map((a) => ({ ...strip(a), id: uuid(), projectId: pid })),
  );

  return pid;
}
