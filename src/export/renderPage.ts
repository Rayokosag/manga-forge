import Konva from 'konva';
import { convertFileSrc } from '@tauri-apps/api/core';
import { fetchDataUrl } from '@/adapters/http';
import type { Page, Panel, PanelLayer } from '@/db/schema';
import type { LayerKonva } from '@/features/storyboard/layouts';

async function loadImage(path: string): Promise<HTMLImageElement | null> {
  try {
    const src = /^(https?|data|blob):/.test(path) ? await fetchDataUrl(path) : convertFileSrc(path);
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  } catch {
    return null;
  }
}

function geom(layer: PanelLayer): LayerKonva {
  return { x: 20, y: 20, ...(layer.konva as LayerKonva | null) };
}

function drawLayer(layer: Konva.Layer, l: PanelLayer, charName: (id: string) => string) {
  const g = geom(l);
  const group = new Konva.Group({ x: g.x, y: g.y, rotation: g.rotation ?? 0 });
  const width = g.width ?? 180;
  const fontSize = g.fontSize ?? (l.type === 'sfx' ? 48 : 16);
  const text = l.content || l.type;

  if (l.type === 'dialogue' || l.type === 'narration') {
    const padding = 12;
    const lines = Math.max(1, Math.ceil(text.length / Math.max(8, width / (fontSize * 0.55))));
    const boxH = lines * fontSize * 1.3 + padding * 2;
    const bubble = l.type === 'dialogue';
    group.add(
      new Konva.Rect({
        width,
        height: boxH,
        fill: bubble ? '#ffffff' : '#0a0a0a',
        opacity: bubble ? 1 : 0.88,
        stroke: bubble ? '#0a0a0a' : undefined,
        strokeWidth: bubble ? 2 : 0,
        cornerRadius: bubble ? Math.min(boxH, width) / 2 : 0,
      }),
    );
    group.add(
      new Konva.Text({
        text,
        width,
        padding,
        fontSize,
        align: 'center',
        fontStyle: bubble ? 'normal' : 'italic',
        fill: bubble ? (g.fill ?? '#0a0a0a') : '#fafafa',
      }),
    );
  } else if (l.type === 'sfx') {
    group.add(
      new Konva.Text({
        text,
        fontSize,
        fontStyle: 'bold',
        fill: g.fill ?? '#e11d48',
        stroke: '#000000',
        strokeWidth: 1,
      }),
    );
  } else {
    const label =
      l.type === 'character' && l.characterId ? `◉ ${charName(l.characterId)}` : `◼ ${text}`;
    group.add(new Konva.Text({ text: label, width, padding: 10, fontSize: 13, fill: g.fill ?? '#94a3b8' }));
  }
  layer.add(group);
}

/** Render one manga page to a PNG data URL using an offscreen Konva stage. */
export async function renderPageToDataURL(
  page: Page,
  panels: Panel[],
  layers: PanelLayer[],
  charName: (id: string) => string,
): Promise<string> {
  const { width, height } = page.canvasSize;
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-100000px;top:0;';
  document.body.appendChild(container);
  const stage = new Konva.Stage({ container, width, height });
  const layer = new Konva.Layer();
  stage.add(layer);

  layer.add(new Konva.Rect({ width, height, fill: '#ffffff' }));

  const sortedPanels = [...panels].sort((a, b) => a.orderIndex - b.orderIndex);
  const order = new Map(sortedPanels.map((p, i) => [p.id, i]));

  for (const p of sortedPanels) {
    const group = new Konva.Group({ x: p.rect.x, y: p.rect.y });
    group.add(new Konva.Rect({ width: p.rect.width, height: p.rect.height, fill: '#1c1c1f' }));
    const img = p.generatedImagePath ? await loadImage(p.generatedImagePath) : null;
    if (img) {
      group.add(new Konva.Image({ image: img, width: p.rect.width, height: p.rect.height }));
    } else {
      group.add(
        new Konva.Text({
          text: p.cameraDirection || '',
          width: p.rect.width,
          height: p.rect.height,
          align: 'center',
          verticalAlign: 'middle',
          fontSize: 16,
          fill: '#71717a',
          padding: 8,
        }),
      );
    }
    group.add(
      new Konva.Rect({
        width: p.rect.width,
        height: p.rect.height,
        stroke: '#09090b',
        strokeWidth: 3,
      }),
    );
    layer.add(group);
  }

  const sortedLayers = [...layers]
    .filter((l) => l.visible)
    .sort((a, b) => (order.get(a.panelId) ?? 0) - (order.get(b.panelId) ?? 0) || a.zIndex - b.zIndex);
  for (const l of sortedLayers) drawLayer(layer, l, charName);

  layer.draw();
  try {
    return stage.toDataURL({ pixelRatio: 1, mimeType: 'image/png' });
  } finally {
    stage.destroy();
    container.remove();
  }
}
