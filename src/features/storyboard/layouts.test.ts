import { describe, expect, it } from 'vitest';
import { autoLayoutRects, buildLayout, LAYOUT_TEMPLATES, tiersToRects } from './layouts';

const W = 1000;
const H = 1400;
const G = 10;

function inBounds(r: { x: number; y: number; width: number; height: number }) {
  return (
    r.x >= G - 0.01 &&
    r.y >= G - 0.01 &&
    r.x + r.width <= W + 0.01 &&
    r.y + r.height <= H + 0.01 &&
    r.width > 0 &&
    r.height > 0
  );
}

describe('tiersToRects', () => {
  it('produces one rect per column across all rows', () => {
    expect(tiersToRects(W, H, G, [1]).length).toBe(1);
    expect(tiersToRects(W, H, G, [2, 2]).length).toBe(4);
    expect(tiersToRects(W, H, G, [1, 2, 1]).length).toBe(4);
  });

  it('keeps every rect inside the page with gutters', () => {
    for (const r of tiersToRects(W, H, G, [3, 3, 3])) expect(inBounds(r)).toBe(true);
  });
});

describe('buildLayout', () => {
  it('matches each template row count', () => {
    const grid = LAYOUT_TEMPLATES.find((t) => t.id === 'grid2x2')!;
    expect(buildLayout(grid, W, H, G).length).toBe(4);
  });
});

describe('autoLayoutRects', () => {
  it('returns exactly n rects for any beat count', () => {
    for (const n of [1, 2, 3, 4, 5, 7, 9]) {
      const rects = autoLayoutRects(n, W, H, G);
      expect(rects.length).toBe(n);
      for (const r of rects) expect(inBounds(r)).toBe(true);
    }
  });

  it('never returns zero rects', () => {
    expect(autoLayoutRects(0, W, H, G).length).toBe(1);
  });
});
