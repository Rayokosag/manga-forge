import { describe, expect, it } from 'vitest';
import {
  clampScale,
  fitView,
  MAX_SCALE,
  MIN_SCALE,
  toWorld,
  wheelFactor,
  WHEEL_ZOOM_STEP,
  zoomAtCenter,
  zoomAtPoint,
  type CanvasView,
} from './canvasView';

describe('clampScale', () => {
  it('clamps to the supported range', () => {
    expect(clampScale(0)).toBe(MIN_SCALE);
    expect(clampScale(999)).toBe(MAX_SCALE);
    expect(clampScale(1.5)).toBe(1.5);
  });
});

describe('zoomAtPoint', () => {
  const view: CanvasView = { x: 120, y: -40, scale: 1.25 };

  it('keeps the world point under the cursor fixed', () => {
    const cursor = { x: 300, y: 220 };
    const before = toWorld(view, cursor);
    const after = zoomAtPoint(view, cursor, 1.1);
    const world = toWorld(after, cursor);
    expect(world.x).toBeCloseTo(before.x, 6);
    expect(world.y).toBeCloseTo(before.y, 6);
  });

  it('respects the scale clamp without losing the anchor', () => {
    const cursor = { x: 50, y: 80 };
    const before = toWorld(view, cursor);
    const after = zoomAtPoint(view, cursor, 1000); // would exceed MAX_SCALE
    expect(after.scale).toBe(MAX_SCALE);
    const world = toWorld(after, cursor);
    expect(world.x).toBeCloseTo(before.x, 6);
    expect(world.y).toBeCloseTo(before.y, 6);
  });
});

describe('zoomAtCenter', () => {
  it('anchors on the viewport centre', () => {
    const view: CanvasView = { x: 0, y: 0, scale: 1 };
    const centre = { x: 400, y: 300 };
    const before = toWorld(view, centre);
    const after = zoomAtCenter(view, 800, 600, 1.2);
    const world = toWorld(after, centre);
    expect(world.x).toBeCloseTo(before.x, 6);
    expect(world.y).toBeCloseTo(before.y, 6);
  });
});

describe('wheelFactor', () => {
  it('zooms in on scroll up and out on scroll down', () => {
    expect(wheelFactor(-100)).toBe(WHEEL_ZOOM_STEP);
    expect(wheelFactor(100)).toBeCloseTo(1 / WHEEL_ZOOM_STEP, 6);
  });
});

describe('fitView', () => {
  it('centres the page inside the viewport', () => {
    const v = fitView(1000, 1400, 900, 700, 48);
    // scaled page is centred: equal margins on the limiting axis
    const scaledH = 1400 * v.scale;
    expect(v.y).toBeCloseTo((700 - scaledH) / 2, 6);
    const scaledW = 1000 * v.scale;
    expect(v.x).toBeCloseTo((900 - scaledW) / 2, 6);
  });

  it('fits within the padded viewport on the tighter axis', () => {
    const v = fitView(1000, 1400, 900, 700, 48);
    expect(1000 * v.scale).toBeLessThanOrEqual(900 - 96 + 0.01);
    expect(1400 * v.scale).toBeLessThanOrEqual(700 - 96 + 0.01);
  });

  it('is resilient to a zero-sized viewport', () => {
    expect(fitView(1000, 1400, 0, 0)).toEqual({ x: 0, y: 0, scale: 1 });
  });
});
