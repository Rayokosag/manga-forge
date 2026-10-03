import { describe, expect, it } from 'vitest';
import { compilePrompt } from './promptCompiler';
import type { Character, Expression, Outfit, Panel, Project, WorldEntity } from '@/db/schema';

const project = {
  id: 'p1',
  name: 'Test',
  contentRating: 'adult',
  genreTags: ['Dark Fantasy'],
  artStyle: 'heavy ink, seinen',
  defaultNegativePrompt: 'lowres, bad anatomy',
} as unknown as Project;

const character = {
  id: 'c1',
  name: 'Kaede',
  basePrompt: '1girl, silver hair',
  negativePrompt: 'blonde hair',
  lockedTraits: [{ key: 'eye_color', value: 'violet eyes', locked: true }],
  variableTraits: [],
  loraTags: [{ name: 'kaede_v2', weight: 0.8 }],
} as unknown as Character;

const outfit = {
  id: 'o1',
  characterId: 'c1',
  name: 'Battle',
  promptFragment: { positive: 'black armor', negative: 'casual clothes', loras: [{ name: 'armor', weight: 0.5 }] },
} as unknown as Outfit;

const expression = {
  id: 'e1',
  name: 'enraged',
  promptFragment: { positive: 'furious, gritted teeth' },
} as unknown as Expression;

const location = {
  id: 'w1',
  name: 'Chapel',
  promptFragment: { positive: 'ruined gothic chapel' },
} as unknown as WorldEntity;

const panel = {
  id: 'pan1',
  cameraDirection: 'low angle',
  promptPositive: 'dramatic lighting',
} as unknown as Panel;

describe('compilePrompt', () => {
  const result = compilePrompt({
    project,
    panel,
    location,
    subjects: [{ character, outfit, expression }],
  });

  it('bakes in the locked trait verbatim', () => {
    expect(result.positive).toContain('violet eyes');
  });

  it('merges art style, outfit, expression, location, and camera', () => {
    expect(result.positive).toContain('heavy ink');
    expect(result.positive).toContain('black armor');
    expect(result.positive).toContain('furious');
    expect(result.positive).toContain('ruined gothic chapel');
    expect(result.positive).toContain('low angle');
    expect(result.positive).toContain('dramatic lighting');
  });

  it('collects and de-dupes LoRAs from character and outfit', () => {
    expect(result.loras.map((l) => l.name).sort()).toEqual(['armor', 'kaede_v2']);
  });

  it('compiles negatives from project + character + outfit', () => {
    expect(result.negative).toContain('lowres');
    expect(result.negative).toContain('blonde hair');
    expect(result.negative).toContain('casual clothes');
  });

  it('records provenance in the payload', () => {
    expect(result.payload.panelId).toBe('pan1');
    expect(result.payload.rating).toBe('adult');
  });
});
