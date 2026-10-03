/**
 * ============================================================================
 *  MANGA FORGE — Drizzle ORM / SQLite schema
 * ----------------------------------------------------------------------------
 *  Local-first, continuity-aware data model for the story → storyboard pipeline.
 *
 *  Design rules enforced here:
 *   - Text UUID primary keys (crypto.randomUUID) so snapshots / exports / merges
 *     never collide and rows are portable across machines.
 *   - Unix-epoch integer timestamps (unixepoch()) for cheap, timezone-free sort.
 *   - Rich fields stored as typed JSON (`text({ mode: 'json' }).$type<…>()`),
 *     keeping the relational spine thin while the creative payload stays flexible.
 *   - SQLite has no native enums; we use `text({ enum: [...] })` which gives us
 *     compile-time string-literal unions on the TS side.
 *   - ON DELETE CASCADE down every ownership edge so deleting a project/chapter
 *     cleanly removes its dependents.
 *   - The pipeline is content-agnostic: rating/genre/prompt fields carry data
 *     only. No filtering lives in the schema.
 * ============================================================================
 */

import { sql, relations } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

/* ───────────────────────── shared column helpers ───────────────────────── */

const uuid = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`);

const updatedAt = () =>
  integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date());

/* ───────────────────────── shared literal unions ───────────────────────── */

export const CONTENT_RATINGS = ['general', 'teen', 'mature', 'adult'] as const;
export const SCENE_MODES = ['simple', 'advanced'] as const;
export const CHAPTER_STATUS = ['draft', 'outline', 'in_progress', 'final'] as const;

export const OUTFIT_CATEGORIES = [
  'casual',
  'school',
  'work',
  'battle',
  'formal',
  'sleep',
  'intimate',
  'custom',
] as const;

export const WORLD_ENTITY_TYPES = [
  'country',
  'region',
  'city',
  'district',
  'building',
  'room',
  'faction',
  'organization',
  'magic_system',
  'tech_system',
  'culture',
  'religion',
  'species',
  'item',
  'event',
  'schedule',
  'custom',
] as const;

export const PANEL_LAYER_TYPES = [
  'background',
  'character',
  'foreground',
  'dialogue',
  'narration',
  'sfx',
  'overlay',
] as const;

export const AI_PROVIDERS = ['ollama', 'comfyui', 'openai', 'anthropic', 'custom'] as const;
export const AI_AGENT_ROLES = [
  'story',        // prose parsing / pacing
  'prompt',       // compiles ComfyUI prompt payloads
  'continuity',   // flags timeline / physical contradictions
  'director',     // camera / layout suggestions
  'general',
] as const;

/* ───────────────────────── typed JSON payload shapes ───────────────────────── */

export interface Anatomy {
  heightCm?: number;
  build?: string;              // e.g. "slim", "athletic", "curvy"
  faceShape?: string;
  eyeShape?: string;
  eyeColor?: string;
  skinTone?: string;
  hairStyle?: string;
  hairColor?: string;
  bodyProportions?: string;    // free-form or structured notes
  bust?: string;
  features?: string[];         // horns, tail, cybernetics, etc.
  scars?: string[];
  [key: string]: unknown;      // extensible without a migration
}

/** A single locked (🔒 immutable) or variable visual trait. */
export interface TraitRule {
  key: string;                 // "hair_color", "eye_color", "body_shape"
  value: string;               // canonical value injected into prompts
  locked: boolean;             // true => never varies between panels
  promptFragment?: string;     // override text sent to the image model
}

export interface PromptFragment {
  positive?: string;
  negative?: string;
  loras?: LoraTag[];
}

export interface LoraTag {
  name: string;
  weight: number;              // e.g. 0.8
}

export interface SceneStructured {
  locationName?: string;
  timeOfDay?: string;
  weather?: string;
  lighting?: string;
  /** Character names present in the scene, chosen from the project cast in the Advanced editor. */
  presentCharacters?: string[];
  emotionalStates?: string[];
  cameraAngles?: string[];
  audioSfx?: string[];
  moodKeywords?: string[];
  beats?: Array<{ order: number; description: string }>;
  [key: string]: unknown;
}

/** Output of the scene-parsing pipeline (never overwrites raw prose). */
export interface ParsedBeat {
  characterRef?: string;       // character id or name token
  action?: string;
  dialogue?: string;
  expression?: string;
  props?: string[];
  cameraHint?: string;
}

/** Directed relationship vector set, each roughly -100..100 / 0..100. */
export interface RelationshipVectors {
  trust?: number;
  affection?: number;
  conflict?: number;
  jealousy?: number;
  intimacy?: number;
  power?: number;              // power dynamic skew toward the "from" character
}

/** The fixed set of relationship vector keys (a string union, no index sig). */
export type RelationshipVectorKey = keyof RelationshipVectors;

export interface CanvasSize {
  width: number;
  height: number;
  dpi?: number;
}

export interface PanelRect {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

/** Arbitrary Konva node tree persisted per layer. */
export type KonvaNode = Record<string, unknown>;

export interface AiParams {
  temperature?: number;
  topP?: number;
  numCtx?: number;
  steps?: number;
  cfgScale?: number;
  sampler?: string;
  seed?: number;
  [key: string]: unknown;
}

/* ============================================================================
 *  STORY SPINE
 * ========================================================================== */

export const projects = sqliteTable(
  'projects',
  {
    id: uuid(),
    name: text('name').notNull(),
    description: text('description'),
    contentRating: text('content_rating', { enum: CONTENT_RATINGS })
      .notNull()
      .default('general'),
    genreTags: text('genre_tags', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    artStyle: text('art_style'),               // global default style descriptor
    defaultNegativePrompt: text('default_negative_prompt'),
    settings: text('settings', { mode: 'json' }).$type<Record<string, unknown>>(),
    coverImagePath: text('cover_image_path'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('idx_projects_name').on(t.name)],
);

export const chapters = sqliteTable(
  'chapters',
  {
    id: uuid(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    synopsis: text('synopsis'),
    status: text('status', { enum: CHAPTER_STATUS }).notNull().default('draft'),
    orderIndex: real('order_index').notNull().default(0), // real => cheap reorder
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('idx_chapters_project').on(t.projectId, t.orderIndex)],
);

export const scenes = sqliteTable(
  'scenes',
  {
    id: uuid(),
    chapterId: text('chapter_id')
      .notNull()
      .references(() => chapters.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default('Untitled Scene'),
    orderIndex: real('order_index').notNull().default(0),
    mode: text('mode', { enum: SCENE_MODES }).notNull().default('simple'),

    /** Raw markdown prose — the source of truth. Never auto-mutated by agents. */
    proseContent: text('prose_content').notNull().default(''),

    /** Advanced-mode structured breakdown. */
    structured: text('structured', { mode: 'json' }).$type<SceneStructured>(),

    /** Cached output of the scene-parsing pipeline (regenerable, non-destructive). */
    parsedBeats: text('parsed_beats', { mode: 'json' }).$type<ParsedBeat[]>(),

    /** Primary location, points into world_entities (room/building/city/…). */
    locationId: text('location_id').references(() => worldEntities.id, {
      onDelete: 'set null',
    }),
    timeOfDay: text('time_of_day'),
    weather: text('weather'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('idx_scenes_chapter').on(t.chapterId, t.orderIndex),
    index('idx_scenes_location').on(t.locationId),
  ],
);

/* ============================================================================
 *  CHARACTERS · WARDROBE · EXPRESSIONS · TRAIT LOCKING
 * ========================================================================== */

export const characters = sqliteTable(
  'characters',
  {
    id: uuid(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    aliases: text('aliases', { mode: 'json' }).$type<string[]>().default(sql`'[]'`),
    role: text('role'),                        // protagonist, antagonist, side…
    bio: text('bio'),
    age: text('age'),                          // free-form ("17", "appears 20")
    gender: text('gender'),
    species: text('species'),

    anatomy: text('anatomy', { mode: 'json' }).$type<Anatomy>(),

    /** Visual trait locking: 🔒 locked traits are forced into every prompt. */
    lockedTraits: text('locked_traits', { mode: 'json' })
      .$type<TraitRule[]>()
      .default(sql`'[]'`),
    /** Variable traits that are allowed to change per panel/scene. */
    variableTraits: text('variable_traits', { mode: 'json' })
      .$type<TraitRule[]>()
      .default(sql`'[]'`),

    /** Base identity prompt fragments merged into every generation. */
    basePrompt: text('base_prompt'),
    negativePrompt: text('negative_prompt'),
    loraTags: text('lora_tags', { mode: 'json' }).$type<LoraTag[]>().default(sql`'[]'`),

    /** Reference image paths used for consistency (IP-Adapter / reference). */
    referenceImages: text('reference_images', { mode: 'json' })
      .$type<string[]>()
      .default(sql`'[]'`),

    colorHex: text('color_hex'),               // UI accent / graph node color
    /** Persisted position on the relationship graph canvas (null => auto-layout). */
    graphX: real('graph_x'),
    graphY: real('graph_y'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('idx_characters_project').on(t.projectId),
    uniqueIndex('uq_character_project_name').on(t.projectId, t.name),
  ],
);

export const outfits = sqliteTable(
  'outfits',
  {
    id: uuid(),
    characterId: text('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    category: text('category', { enum: OUTFIT_CATEGORIES }).notNull().default('casual'),
    description: text('description'),
    /** Layered pieces (top/bottom/accessories) for granular prompt assembly. */
    layers: text('layers', { mode: 'json' }).$type<
      Array<{ slot: string; item: string; promptFragment?: string }>
    >(),
    promptFragment: text('prompt_fragment', { mode: 'json' }).$type<PromptFragment>(),
    thumbnailPath: text('thumbnail_path'),
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('idx_outfits_character').on(t.characterId)],
);

/**
 * Expression & Reaction Matrix — a reusable library of emotional states.
 * Rows may be project-global (characterId NULL) or character-specific.
 */
export const expressions = sqliteTable(
  'expressions',
  {
    id: uuid(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    characterId: text('character_id').references(() => characters.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),             // happy, smug, terrified, crying, custom…
    category: text('category'),               // positive / negative / neutral / nsfw…
    intensity: integer('intensity').notNull().default(50), // 0..100
    promptFragment: text('prompt_fragment', { mode: 'json' }).$type<PromptFragment>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('idx_expressions_scope').on(t.projectId, t.characterId)],
);

/**
 * Per-scene character presence & variable state (outfit/expression/pose).
 * This is where "locked traits stay, variable traits flex" is realized.
 */
export const sceneCharacters = sqliteTable(
  'scene_characters',
  {
    id: uuid(),
    sceneId: text('scene_id')
      .notNull()
      .references(() => scenes.id, { onDelete: 'cascade' }),
    characterId: text('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    outfitId: text('outfit_id').references(() => outfits.id, { onDelete: 'set null' }),
    expressionId: text('expression_id').references(() => expressions.id, {
      onDelete: 'set null',
    }),
    emotionalState: text('emotional_state'),  // free-form override
    pose: text('pose'),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('uq_scene_character').on(t.sceneId, t.characterId),
    index('idx_scene_characters_char').on(t.characterId),
  ],
);

/* ============================================================================
 *  RELATIONSHIPS · TIMELINE PROGRESSION
 * ========================================================================== */

export const relationships = sqliteTable(
  'relationships',
  {
    id: uuid(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    fromCharacterId: text('from_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    toCharacterId: text('to_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    /** false => symmetric edge; true => directed (A→B may differ from B→A). */
    directed: integer('directed', { mode: 'boolean' }).notNull().default(true),
    label: text('label'),                     // "rivals", "siblings", "lovers"…
    /** Current vector snapshot (latest after applying timeline events). */
    vectors: text('vectors', { mode: 'json' }).$type<RelationshipVectors>(),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('idx_relationships_project').on(t.projectId),
    uniqueIndex('uq_relationship_pair').on(t.fromCharacterId, t.toCharacterId),
  ],
);

/** Dynamic progression: vector deltas applied at a point on the timeline. */
export const relationshipEvents = sqliteTable(
  'relationship_events',
  {
    id: uuid(),
    relationshipId: text('relationship_id')
      .notNull()
      .references(() => relationships.id, { onDelete: 'cascade' }),
    chapterId: text('chapter_id').references(() => chapters.id, { onDelete: 'set null' }),
    sceneId: text('scene_id').references(() => scenes.id, { onDelete: 'set null' }),
    orderIndex: real('order_index').notNull().default(0),
    deltas: text('deltas', { mode: 'json' }).$type<RelationshipVectors>(),
    description: text('description'),
    createdAt: createdAt(),
  },
  (t) => [index('idx_relationship_events_rel').on(t.relationshipId, t.orderIndex)],
);

/* ============================================================================
 *  WORLD DATABASE · CHRONOLOGICAL TIMELINE
 * ========================================================================== */

export const worldEntities = sqliteTable(
  'world_entities',
  {
    id: uuid(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    /** Self-referential hierarchy: room → building → city → region → country. */
    parentId: text('parent_id'),
    type: text('type', { enum: WORLD_ENTITY_TYPES }).notNull().default('custom'),
    name: text('name').notNull(),
    description: text('description'),
    loreText: text('lore_text'),
    /** Flexible attribute bag (population, laws, schedules, magic rules…). */
    attributes: text('attributes', { mode: 'json' }).$type<Record<string, unknown>>(),
    /** Prompt fragment used when this location/entity appears in a panel. */
    promptFragment: text('prompt_fragment', { mode: 'json' }).$type<PromptFragment>(),
    continuityNotes: text('continuity_notes'),
    referenceImages: text('reference_images', { mode: 'json' })
      .$type<string[]>()
      .default(sql`'[]'`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('idx_world_entities_project').on(t.projectId, t.type),
    index('idx_world_entities_parent').on(t.parentId),
  ],
);

export const timelineEvents = sqliteTable(
  'timeline_events',
  {
    id: uuid(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    /** In-world time label ("Year 1023, Spring") kept separate from sort order. */
    inWorldTime: text('in_world_time'),
    orderIndex: real('order_index').notNull().default(0),
    chapterId: text('chapter_id').references(() => chapters.id, { onDelete: 'set null' }),
    sceneId: text('scene_id').references(() => scenes.id, { onDelete: 'set null' }),
    /** Characters / entities whose state this event touches. */
    affectedCharacterIds: text('affected_character_ids', { mode: 'json' })
      .$type<string[]>()
      .default(sql`'[]'`),
    affectedEntityIds: text('affected_entity_ids', { mode: 'json' })
      .$type<string[]>()
      .default(sql`'[]'`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('idx_timeline_project').on(t.projectId, t.orderIndex)],
);

/* ============================================================================
 *  STORYBOARD · PAGES · PANELS · LAYERS (React-Konva backing store)
 * ========================================================================== */

export const pages = sqliteTable(
  'pages',
  {
    id: uuid(),
    chapterId: text('chapter_id')
      .notNull()
      .references(() => chapters.id, { onDelete: 'cascade' }),
    sceneId: text('scene_id').references(() => scenes.id, { onDelete: 'set null' }),
    pageNumber: real('page_number').notNull().default(0),
    canvasSize: text('canvas_size', { mode: 'json' })
      .$type<CanvasSize>()
      .notNull()
      .default(sql`'{"width":1240,"height":1754,"dpi":150}'`), // ~A4 @150dpi
    gutter: integer('gutter').notNull().default(16),
    readingDirection: text('reading_direction', { enum: ['rtl', 'ltr'] })
      .notNull()
      .default('rtl'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('idx_pages_chapter').on(t.chapterId, t.pageNumber)],
);

export const panels = sqliteTable(
  'panels',
  {
    id: uuid(),
    pageId: text('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    sceneId: text('scene_id').references(() => scenes.id, { onDelete: 'set null' }),
    orderIndex: real('order_index').notNull().default(0),
    /** Geometry on the page canvas (supports grids, splashes, spreads, cuts). */
    rect: text('rect', { mode: 'json' }).$type<PanelRect>().notNull(),
    shape: text('shape', {
      enum: ['rect', 'splash', 'spread', 'polygon', 'circle', 'custom'],
    })
      .notNull()
      .default('rect'),
    /** Polygon/custom cut points for non-rectangular panels. */
    clipPoints: text('clip_points', { mode: 'json' }).$type<number[]>(),
    cameraDirection: text('camera_direction'), // "low angle, wide shot"…

    /** Compiled prompt payload (inspectable/editable before sending to ComfyUI). */
    promptPositive: text('prompt_positive'),
    promptNegative: text('prompt_negative'),
    promptLoras: text('prompt_loras', { mode: 'json' }).$type<LoraTag[]>(),
    /** Snapshot of the full compiled request for reproducibility. */
    promptPayload: text('prompt_payload', { mode: 'json' }).$type<Record<string, unknown>>(),

    generatedImagePath: text('generated_image_path'),
    seed: integer('seed'),
    status: text('status', {
      enum: ['empty', 'drafted', 'queued', 'generating', 'rendered', 'approved'],
    })
      .notNull()
      .default('empty'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('idx_panels_page').on(t.pageId, t.orderIndex),
    index('idx_panels_scene').on(t.sceneId),
  ],
);

export const panelLayers = sqliteTable(
  'panel_layers',
  {
    id: uuid(),
    panelId: text('panel_id')
      .notNull()
      .references(() => panels.id, { onDelete: 'cascade' }),
    type: text('type', { enum: PANEL_LAYER_TYPES }).notNull(),
    zIndex: integer('z_index').notNull().default(0),
    visible: integer('visible', { mode: 'boolean' }).notNull().default(true),
    locked: integer('locked', { mode: 'boolean' }).notNull().default(false),
    /** Text content for dialogue / narration / sfx layers. */
    content: text('content'),
    /** Which character a dialogue bubble belongs to (tail target / styling). */
    characterId: text('character_id').references(() => characters.id, {
      onDelete: 'set null',
    }),
    /** Serialized Konva node tree for this layer. */
    konva: text('konva', { mode: 'json' }).$type<KonvaNode>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('idx_panel_layers_panel').on(t.panelId, t.zIndex)],
);

/* ============================================================================
 *  AI CONFIG · PROMPT TEMPLATES · AGENT RUN LOG
 * ========================================================================== */

export const aiSettings = sqliteTable(
  'ai_settings',
  {
    id: uuid(),
    /** NULL projectId => global/default profile. */
    projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),            // "Local Llama 3", "ComfyUI SDXL"…
    provider: text('provider', { enum: AI_PROVIDERS }).notNull(),
    agentRole: text('agent_role', { enum: AI_AGENT_ROLES }).notNull().default('general'),
    endpoint: text('endpoint').notNull(),      // http://127.0.0.1:11434 / :8188
    model: text('model'),                      // model / workflow identifier
    params: text('params', { mode: 'json' }).$type<AiParams>(),
    /** Name of an OS-keychain / env secret, never the raw key. */
    apiKeyRef: text('api_key_ref'),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('idx_ai_settings_scope').on(t.projectId, t.agentRole)],
);

/** Reusable prompt-builder templates (Modular Prompt Builder). */
export const promptTemplates = sqliteTable(
  'prompt_templates',
  {
    id: uuid(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** Handlebars-style template combining character/location/outfit/camera/style. */
    template: text('template').notNull(),
    negativeTemplate: text('negative_template'),
    defaultLoras: text('default_loras', { mode: 'json' }).$type<LoraTag[]>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('idx_prompt_templates_project').on(t.projectId)],
);

/** Background multi-agent run log (continuity flags, parses, compiles). */
export const agentRuns = sqliteTable(
  'agent_runs',
  {
    id: uuid(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    agentRole: text('agent_role', { enum: AI_AGENT_ROLES }).notNull(),
    targetType: text('target_type'),          // "scene", "panel", "project"…
    targetId: text('target_id'),
    status: text('status', {
      enum: ['queued', 'running', 'done', 'error', 'cancelled'],
    })
      .notNull()
      .default('queued'),
    input: text('input', { mode: 'json' }).$type<Record<string, unknown>>(),
    output: text('output', { mode: 'json' }).$type<Record<string, unknown>>(),
    error: text('error'),
    startedAt: integer('started_at', { mode: 'timestamp' }),
    finishedAt: integer('finished_at', { mode: 'timestamp' }),
    createdAt: createdAt(),
  },
  (t) => [index('idx_agent_runs_project').on(t.projectId, t.status)],
);

/* ============================================================================
 *  REVISION CONTROL — snapshots / undo history
 * ========================================================================== */

export const snapshots = sqliteTable(
  'snapshots',
  {
    id: uuid(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    /** Entity this snapshot captures ("scene", "character", "project"…). */
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    label: text('label'),
    /** Full JSON snapshot of the entity at capture time. */
    data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
    /** Monotonic per-entity version for ordered undo/redo. */
    version: integer('version').notNull().default(1),
    createdAt: createdAt(),
  },
  (t) => [
    index('idx_snapshots_entity').on(t.entityType, t.entityId, t.version),
    index('idx_snapshots_project').on(t.projectId),
  ],
);

/* ============================================================================
 *  RELATIONS (drizzle query helpers)
 * ========================================================================== */

export const projectsRelations = relations(projects, ({ many }) => ({
  chapters: many(chapters),
  characters: many(characters),
  relationships: many(relationships),
  worldEntities: many(worldEntities),
  timelineEvents: many(timelineEvents),
  expressions: many(expressions),
  aiSettings: many(aiSettings),
  promptTemplates: many(promptTemplates),
  snapshots: many(snapshots),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  project: one(projects, { fields: [chapters.projectId], references: [projects.id] }),
  scenes: many(scenes),
  pages: many(pages),
}));

export const scenesRelations = relations(scenes, ({ one, many }) => ({
  chapter: one(chapters, { fields: [scenes.chapterId], references: [chapters.id] }),
  location: one(worldEntities, {
    fields: [scenes.locationId],
    references: [worldEntities.id],
  }),
  sceneCharacters: many(sceneCharacters),
  panels: many(panels),
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
  project: one(projects, { fields: [characters.projectId], references: [projects.id] }),
  outfits: many(outfits),
  expressions: many(expressions),
  sceneCharacters: many(sceneCharacters),
}));

export const outfitsRelations = relations(outfits, ({ one }) => ({
  character: one(characters, {
    fields: [outfits.characterId],
    references: [characters.id],
  }),
}));

export const expressionsRelations = relations(expressions, ({ one }) => ({
  project: one(projects, { fields: [expressions.projectId], references: [projects.id] }),
  character: one(characters, {
    fields: [expressions.characterId],
    references: [characters.id],
  }),
}));

export const sceneCharactersRelations = relations(sceneCharacters, ({ one }) => ({
  scene: one(scenes, { fields: [sceneCharacters.sceneId], references: [scenes.id] }),
  character: one(characters, {
    fields: [sceneCharacters.characterId],
    references: [characters.id],
  }),
  outfit: one(outfits, { fields: [sceneCharacters.outfitId], references: [outfits.id] }),
  expression: one(expressions, {
    fields: [sceneCharacters.expressionId],
    references: [expressions.id],
  }),
}));

export const relationshipsRelations = relations(relationships, ({ one, many }) => ({
  project: one(projects, {
    fields: [relationships.projectId],
    references: [projects.id],
  }),
  fromCharacter: one(characters, {
    fields: [relationships.fromCharacterId],
    references: [characters.id],
    relationName: 'from_character',
  }),
  toCharacter: one(characters, {
    fields: [relationships.toCharacterId],
    references: [characters.id],
    relationName: 'to_character',
  }),
  events: many(relationshipEvents),
}));

export const relationshipEventsRelations = relations(relationshipEvents, ({ one }) => ({
  relationship: one(relationships, {
    fields: [relationshipEvents.relationshipId],
    references: [relationships.id],
  }),
}));

export const worldEntitiesRelations = relations(worldEntities, ({ one, many }) => ({
  project: one(projects, {
    fields: [worldEntities.projectId],
    references: [projects.id],
  }),
  parent: one(worldEntities, {
    fields: [worldEntities.parentId],
    references: [worldEntities.id],
    relationName: 'entity_hierarchy',
  }),
  children: many(worldEntities, { relationName: 'entity_hierarchy' }),
}));

export const timelineEventsRelations = relations(timelineEvents, ({ one }) => ({
  project: one(projects, {
    fields: [timelineEvents.projectId],
    references: [projects.id],
  }),
  chapter: one(chapters, {
    fields: [timelineEvents.chapterId],
    references: [chapters.id],
  }),
  scene: one(scenes, { fields: [timelineEvents.sceneId], references: [scenes.id] }),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  chapter: one(chapters, { fields: [pages.chapterId], references: [chapters.id] }),
  scene: one(scenes, { fields: [pages.sceneId], references: [scenes.id] }),
  panels: many(panels),
}));

export const panelsRelations = relations(panels, ({ one, many }) => ({
  page: one(pages, { fields: [panels.pageId], references: [pages.id] }),
  scene: one(scenes, { fields: [panels.sceneId], references: [scenes.id] }),
  layers: many(panelLayers),
}));

export const panelLayersRelations = relations(panelLayers, ({ one }) => ({
  panel: one(panels, { fields: [panelLayers.panelId], references: [panels.id] }),
  character: one(characters, {
    fields: [panelLayers.characterId],
    references: [characters.id],
  }),
}));

export const aiSettingsRelations = relations(aiSettings, ({ one }) => ({
  project: one(projects, { fields: [aiSettings.projectId], references: [projects.id] }),
}));

export const promptTemplatesRelations = relations(promptTemplates, ({ one }) => ({
  project: one(projects, {
    fields: [promptTemplates.projectId],
    references: [projects.id],
  }),
}));

export const agentRunsRelations = relations(agentRuns, ({ one }) => ({
  project: one(projects, { fields: [agentRuns.projectId], references: [projects.id] }),
}));

export const snapshotsRelations = relations(snapshots, ({ one }) => ({
  project: one(projects, { fields: [snapshots.projectId], references: [projects.id] }),
}));

/* ============================================================================
 *  INFERRED TYPES (import these across the app instead of redefining shapes)
 * ========================================================================== */

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Chapter = typeof chapters.$inferSelect;
export type NewChapter = typeof chapters.$inferInsert;
export type Scene = typeof scenes.$inferSelect;
export type NewScene = typeof scenes.$inferInsert;
export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
export type Outfit = typeof outfits.$inferSelect;
export type NewOutfit = typeof outfits.$inferInsert;
export type Expression = typeof expressions.$inferSelect;
export type NewExpression = typeof expressions.$inferInsert;
export type SceneCharacter = typeof sceneCharacters.$inferSelect;
export type NewSceneCharacter = typeof sceneCharacters.$inferInsert;
export type Relationship = typeof relationships.$inferSelect;
export type NewRelationship = typeof relationships.$inferInsert;
export type RelationshipEvent = typeof relationshipEvents.$inferSelect;
export type NewRelationshipEvent = typeof relationshipEvents.$inferInsert;
export type WorldEntity = typeof worldEntities.$inferSelect;
export type NewWorldEntity = typeof worldEntities.$inferInsert;
export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type NewTimelineEvent = typeof timelineEvents.$inferInsert;
export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;
export type Panel = typeof panels.$inferSelect;
export type NewPanel = typeof panels.$inferInsert;
export type PanelLayer = typeof panelLayers.$inferSelect;
export type NewPanelLayer = typeof panelLayers.$inferInsert;
export type AiSetting = typeof aiSettings.$inferSelect;
export type NewAiSetting = typeof aiSettings.$inferInsert;
export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type NewPromptTemplate = typeof promptTemplates.$inferInsert;
export type AgentRun = typeof agentRuns.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;
export type Snapshot = typeof snapshots.$inferSelect;
export type NewSnapshot = typeof snapshots.$inferInsert;
