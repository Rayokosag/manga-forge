/**
 * Pure view-transform math for the infinite storyboard canvas.
 *
 * A {@link CanvasView} is the Stage transform: a world→screen mapping where a
 * world point `w` lands on screen at `w * scale + offset`. Panning changes the
 * offset; zooming changes `scale` while keeping a chosen screen point anchored
 * to the same world point. All functions are side-effect free so they can be
 * unit-tested without Konva.
 */

export interface CanvasView {
  /** Stage x offset in screen px. */
  x: number;
  /** Stage y offset in screen px. */
  y: number;
  /** Uniform zoom factor (1 = 100%). */
  scale: number;
}

export interface Point {
  x: number;
  y: number;
}

export const MIN_SCALE = 0.05;
export const MAX_SCALE = 4;

/** Clamp a zoom factor into the supported range. */
export const clampScale = (s: number): number =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

/** Screen point → world point under the current view. */
export const toWorld = (view: CanvasView, p: Point): Point => ({
  x: (p.x - view.x) / view.scale,
  y: (p.y - view.y) / view.scale,
});

/**
 * Multiply the zoom by `factor` while keeping the world point currently under
 * `point` (a screen-space position, e.g. the cursor) pinned in place.
 */
export function zoomAtPoint(view: CanvasView, point: Point, factor: number): CanvasView {
  const scale = clampScale(view.scale * factor);
  const world = toWorld(view, point);
  return {
    scale,
    x: point.x - world.x * scale,
    y: point.y - world.y * scale,
  };
}

/** Zoom about the centre of a `boxW × boxH` viewport. */
export function zoomAtCenter(
  view: CanvasView,
  boxW: number,
  boxH: number,
  factor: number,
): CanvasView {
  return zoomAtPoint(view, { x: boxW / 2, y: boxH / 2 }, factor);
}

/** Zoom step applied per wheel notch. */
export const WHEEL_ZOOM_STEP = 1.1;

/** Wheel deltaY → multiplicative zoom factor (scroll up = zoom in). */
export const wheelFactor = (deltaY: number): number =>
  deltaY > 0 ? 1 / WHEEL_ZOOM_STEP : WHEEL_ZOOM_STEP;

/**
 * Centre a `pageW × pageH` page inside a `boxW × boxH` viewport with `padding`
 * screen px of breathing room on each side, scaled to fit the tighter axis.
 */
export function fitView(
  pageW: number,
  pageH: number,
  boxW: number,
  boxH: number,
  padding = 48,
): CanvasView {
  if (pageW <= 0 || pageH <= 0 || boxW <= 0 || boxH <= 0) {
    return { x: 0, y: 0, scale: 1 };
  }
  const scale = clampScale(
    Math.min((boxW - padding * 2) / pageW, (boxH - padding * 2) / pageH),
  );
  return {
    scale,
    x: (boxW - pageW * scale) / 2,
    y: (boxH - pageH * scale) / 2,
  };
}
