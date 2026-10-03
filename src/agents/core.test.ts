import { describe, expect, it } from 'vitest';
import { extractJson } from './core';

describe('extractJson', () => {
  it('parses plain JSON objects', () => {
    expect(extractJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it('strips ```json fences', () => {
    const out = extractJson<{ beats: number[] }>('```json\n{"beats":[1,2]}\n```');
    expect(out.beats).toEqual([1, 2]);
  });

  it('ignores prose around the JSON', () => {
    expect(extractJson<{ ok: boolean }>('Sure! {"ok":true} hope that helps')).toEqual({
      ok: true,
    });
  });

  it('parses top-level arrays', () => {
    expect(extractJson<number[]>('[1,2,3]')).toEqual([1, 2, 3]);
  });
});
