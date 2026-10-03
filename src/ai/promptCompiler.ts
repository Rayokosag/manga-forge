import type {
  Character,
  Expression,
  LoraTag,
  Outfit,
  Panel,
  Project,
  WorldEntity,
} from '@/db/schema';

export interface PromptSubject {
  character: Character;
  outfit?: Outfit | null;
  expression?: Expression | null;
}

export interface CompileInput {
  project: Project;
  panel?: Panel | null;
  location?: WorldEntity | null;
  subjects: PromptSubject[];
}

export interface CompiledPrompt {
  positive: string;
  negative: string;
  loras: LoraTag[];
  /** Structured provenance for the inspector + reproducibility. */
  payload: Record<string, unknown>;
}

function clean(parts: (string | null | undefined)[]): string {
  return parts
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .join(', ')
    .replace(/\s*,\s*,+/g, ', ')
    .replace(/^,\s*|,\s*$/g, '')
    .trim();
}

/** Locked traits are forced in verbatim; variable traits are omitted here. */
function lockedTraitFragments(c: Character): string[] {
  return (c.lockedTraits ?? []).map((t) => t.promptFragment?.trim() || `${t.value}`).filter(Boolean);
}

function subjectPositive(s: PromptSubject): string {
  const { character: c, outfit, expression } = s;
  return clean([
    c.basePrompt,
    ...lockedTraitFragments(c),
    outfit?.promptFragment?.positive || outfit?.description,
    expression?.promptFragment?.positive || (expression ? `${expression.name} expression` : ''),
  ]);
}

function subjectNegative(s: PromptSubject): string {
  return clean([
    s.character.negativePrompt,
    s.outfit?.promptFragment?.negative,
    s.expression?.promptFragment?.negative,
  ]);
}

function collectLoras(input: CompileInput): LoraTag[] {
  const seen = new Map<string, LoraTag>();
  const push = (loras?: LoraTag[] | null) => {
    for (const l of loras ?? []) if (l.name && !seen.has(l.name)) seen.set(l.name, l);
  };
  for (const s of input.subjects) {
    push(s.character.loraTags);
    push(s.outfit?.promptFragment?.loras);
    push(s.expression?.promptFragment?.loras);
  }
  return [...seen.values()];
}

/**
 * Compile Character Reference + Location Lore + Outfit + Camera + Expression +
 * Art Style into a structured prompt. Pure and deterministic — the Prompt
 * Inspector shows the result and lets the user edit before generation.
 */
export function compilePrompt(input: CompileInput): CompiledPrompt {
  const { project, panel, location, subjects } = input;

  const positive = clean([
    project.artStyle,
    ...subjects.map(subjectPositive),
    location?.promptFragment?.positive || location?.description || location?.name,
    panel?.cameraDirection,
    (project.genreTags ?? []).join(', '),
    panel?.promptPositive,
  ]);

  const negative = clean([
    project.defaultNegativePrompt,
    ...subjects.map(subjectNegative),
    location?.promptFragment?.negative,
    panel?.promptNegative,
  ]);

  return {
    positive,
    negative,
    loras: collectLoras(input),
    payload: {
      projectId: project.id,
      rating: project.contentRating,
      artStyle: project.artStyle,
      panelId: panel?.id,
      camera: panel?.cameraDirection,
      locationId: location?.id,
      subjects: subjects.map((s) => ({
        characterId: s.character.id,
        outfitId: s.outfit?.id ?? null,
        expressionId: s.expression?.id ?? null,
      })),
    },
  };
}
