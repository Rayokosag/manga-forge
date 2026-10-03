import { describe, expect, it } from 'vitest';
import {
  autoLayoutRects,
  buildLayout,
  LAYOUT_TEMPLATES,
  snapPanel,
  tiersToRects,
} from './layouts';
import type { PanelRect } from '@/db/schema';

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

describe('snapPanel', () => {
  const sib: PanelRect[] = [{ x: 100, y: 100, width: 200, height: 150 }];

  it('snaps to a sibling left edge when within threshold', () => {
    // dragging to x=104 (4px off the sibling left edge of 100) snaps to 100
    expect(snapPanel(104, 500, 80, 80, sib, G, W, H).x).toBe(100);
  });

  it('butts a panel against a sibling right edge across the gutter', () => {
    // sibling right = 300; with gutter 10 the snap target is 310
    expect(snapPanel(306, 500, 80, 80, sib, G, W, H).x).toBe(310);
  });

  it('falls back to the gutter grid when no sibling is near', () => {
    // 503 -> nearest multiple of 10 within threshold = 500
    expect(snapPanel(503, 503, 80, 80, [], G, W, H)).toEqual({ x: 500, y: 500 });
  });

  it('leaves positions untouched with no grid and no siblings', () => {
    expect(snapPanel(457, 333, 80, 80, [], 0, W, H)).toEqual({ x: 457, y: 333 });
  });

  it('clamps the panel inside the page bounds', () => {
    expect(snapPanel(-50, 99999, 80, 80, [], 0, W, H)).toEqual({ x: 0, y: H - 80 });
  });
});
