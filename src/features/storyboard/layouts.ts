import type { PanelRect } from '@/db/schema';

/** Geometry/style persisted per layer in `panelLayers.konva`. */
export interface LayerKonva {
  x: number;
  y: number;
  width?: number;
  fontSize?: number;
  rotation?: number;
  fill?: string;
  /** Speech-bubble tail tip, relative to the layer group origin. */
  tailX?: number;
  tailY?: number;
}

export interface LayoutTemplate {
  id: string;
  name: string;
  /** Column count per row, top → bottom. */
  rows: number[];
}

/** Split the page into tiers (rows), each divided into equal columns. */
export function tiersToRects(
  w: number,
  h: number,
  gutter: number,
  rows: number[],
): PanelRect[] {
  const g = gutter;
  const rowCount = rows.length;
  const cellH = (h - g * (rowCount + 1)) / rowCount;
  const out: PanelRect[] = [];
  rows.forEach((cols, r) => {
    const y = g + r * (cellH + g);
    const cellW = (w - g * (cols + 1)) / cols;
    for (let c = 0; c < cols; c++) {
      out.push({ x: g + c * (cellW + g), y, width: cellW, height: cellH });
    }
  });
  return out;
}

export const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  { id: 'splash', name: 'Splash (1)', rows: [1] },
  { id: 'rows2', name: '2 strips', rows: [1, 1] },
  { id: 'rows3', name: '3 strips', rows: [1, 1, 1] },
  { id: 'rows4', name: '4 strips', rows: [1, 1, 1, 1] },
  { id: 'grid2x2', name: 'Grid 2×2', rows: [2, 2] },
  { id: 'grid2x3', name: 'Grid 2×3', rows: [2, 2, 2] },
  { id: 'grid3x3', name: 'Grid 3×3', rows: [3, 3, 3] },
  { id: 'action', name: 'Action 1-2-1', rows: [1, 2, 1] },
  { id: 'reveal', name: 'Reveal 2-1-2', rows: [2, 1, 2] },
];

export function buildLayout(
  template: LayoutTemplate,
  w: number,
  h: number,
  gutter: number,
): PanelRect[] {
  return tiersToRects(w, h, gutter, template.rows);
}

/** Generate exactly `n` panel rects in a balanced grid (used for beat → page). */
export function autoLayoutRects(n: number, w: number, h: number, gutter: number): PanelRect[] {
  const count = Math.max(1, n);
  const cols = Math.ceil(Math.sqrt(count));
  const fullRows = Math.floor(count / cols);
  const remainder = count % cols;
  const rows: number[] = [];
  for (let i = 0; i < fullRows; i++) rows.push(cols);
  if (remainder) rows.push(remainder);
  return tiersToRects(w, h, gutter, rows).slice(0, count);
}
