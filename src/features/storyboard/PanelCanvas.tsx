import * as React from 'react';
import {
  Stage,
  Layer,
  Group,
  Rect,
  Text,
  Line,
  Image as KonvaImage,
  Transformer,
} from 'react-konva';
import type Konva from 'konva';
import { Maximize, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHtmlImage } from '@/hooks/useHtmlImage';
import { useStoryboardStore } from '@/store/useStoryboardStore';
import { useCastStore } from '@/store/useCastStore';
import type { Page, Panel, PanelLayer } from '@/db/schema';
import type { LayerKonva } from './layouts';

const LAYER_DEFAULTS: Record<string, Partial<LayerKonva> & { text: string }> = {
  dialogue: { text: 'Dialogue…', fontSize: 18, width: 180, fill: '#0a0a0a' },
  narration: { text: 'Narration…', fontSize: 16, width: 220, fill: '#0a0a0a' },
  sfx: { text: 'DOOM', fontSize: 48, width: 240, fill: '#e11d48', rotation: -8 },
  background: { text: 'Background', fontSize: 14, width: 160, fill: '#38bdf8' },
  character: { text: 'Character', fontSize: 14, width: 160, fill: '#a78bfa' },
  foreground: { text: 'Foreground', fontSize: 14, width: 160, fill: '#f59e0b' },
  overlay: { text: 'Overlay', fontSize: 14, width: 160, fill: '#94a3b8' },
};

function layerGeom(layer: PanelLayer): LayerKonva {
  return { x: 20, y: 20, ...(layer.konva as LayerKonva | null) };
}

export function PanelCanvas({ page }: { page: Page }) {
  const panels = useStoryboardStore((s) => s.panels);
  const layers = useStoryboardStore((s) => s.layers);
  const selection = useStoryboardStore((s) => s.selection);
  const select = useStoryboardStore((s) => s.select);
  const updatePanel = useStoryboardStore((s) => s.updatePanel);
  const updateLayer = useStoryboardStore((s) => s.updateLayer);
  const characterName = useCastStore((s) => s.characterName);

  const { width: pageW, height: pageH } = page.canvasSize;

  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [box, setBox] = React.useState({ w: 900, h: 700 });
  const [zoom, setZoom] = React.useState(1);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width && height) setBox({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const baseScale = Math.min((box.w - 48) / pageW, (box.h - 48) / pageH);
  const scale = Math.max(0.05, baseScale * zoom);

  // Transformer wiring (panels only).
  const trRef = React.useRef<Konva.Transformer>(null);
  const nodeRefs = React.useRef(new Map<string, Konva.Node>());
  const registerRef = React.useCallback((id: string, node: Konva.Node | null) => {
    if (node) nodeRefs.current.set(id, node);
    else nodeRefs.current.delete(id);
  }, []);

  React.useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node =
      selection?.kind === 'panel' ? nodeRefs.current.get(selection.id) : undefined;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selection, panels]);

  const sortedPanels = [...panels].sort((a, b) => a.orderIndex - b.orderIndex);
  const sortedLayers = [...layers].sort((a, b) => {
    const pa = sortedPanels.findIndex((p) => p.id === a.panelId);
    const pb = sortedPanels.findIndex((p) => p.id === b.panelId);
    return pa - pb || a.zIndex - b.zIndex;
  });

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-auto bg-muted/30 p-6">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-md border border-border bg-background/90 p-1 shadow-sm">
        <Button variant="ghost" size="icon-sm" onClick={() => setZoom((z) => Math.max(0.25, z - 0.15))}>
          <Minus />
        </Button>
        <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(scale * 100)}%
        </span>
        <Button variant="ghost" size="icon-sm" onClick={() => setZoom((z) => Math.min(3, z + 0.15))}>
          <Plus />
        </Button>
        <Button variant="ghost" size="icon-sm" title="Fit" onClick={() => setZoom(1)}>
          <Maximize />
        </Button>
      </div>

      <div className="flex min-h-full items-start justify-center">
        <Stage
          width={pageW * scale}
          height={pageH * scale}
          scaleX={scale}
          scaleY={scale}
          onMouseDown={(e) => {
            if (e.target === e.target.getStage() || e.target.name() === 'page-bg') select(null);
          }}
        >
          <Layer>
            {/* page */}
            <Rect
              name="page-bg"
              width={pageW}
              height={pageH}
              fill="#ffffff"
              shadowColor="#000"
              shadowBlur={16}
              shadowOpacity={0.25}
            />

            {/* panels */}
            {sortedPanels.map((panel, i) => (
              <PanelNode
                key={panel.id}
                panel={panel}
                index={i + 1}
                selected={selection?.kind === 'panel' && selection.id === panel.id}
                onSelect={() => select({ kind: 'panel', id: panel.id })}
                onChange={(patch) => void updatePanel(panel.id, patch)}
                registerRef={registerRef}
              />
            ))}

            {/* layer overlays (bubbles, narration, sfx, markers) on top */}
            {sortedLayers
              .filter((l) => l.visible)
              .map((layer) => (
                <LayerNode
                  key={layer.id}
                  layer={layer}
                  selected={selection?.kind === 'layer' && selection.id === layer.id}
                  onSelect={() => select({ kind: 'layer', id: layer.id })}
                  onChange={(geom) =>
                    void updateLayer(layer.id, { konva: { ...layerGeom(layer), ...geom } })
                  }
                  characterName={characterName}
                />
              ))}

            <Transformer
              ref={trRef}
              rotateEnabled={false}
              keepRatio={false}
              boundBoxFunc={(oldBox, newBox) =>
                newBox.width < 20 || newBox.height < 20 ? oldBox : newBox
              }
            />
          </Layer>
        </Stage>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ panel node */

function PanelNode({
  panel,
  index,
  selected,
  onSelect,
  onChange,
  registerRef,
}: {
  panel: Panel;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<Panel>) => void;
  registerRef: (id: string, node: Konva.Node | null) => void;
}) {
  const image = useHtmlImage(panel.generatedImagePath);
  const { x, y, width, height } = panel.rect;

  return (
    <Group
      x={x}
      y={y}
      draggable
      ref={(node) => registerRef(panel.id, node)}
      onMouseDown={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onChange({ rect: { ...panel.rect, x: e.target.x(), y: e.target.y() } })}
      onTransformEnd={(e) => {
        const node = e.target;
        const sx = node.scaleX();
        const sy = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          rect: {
            x: node.x(),
            y: node.y(),
            width: Math.max(20, width * sx),
            height: Math.max(20, height * sy),
          },
        });
      }}
    >
      <Rect width={width} height={height} fill="#1c1c1f" cornerRadius={2} />
      {image && <KonvaImage image={image} width={width} height={height} />}
      {!image && (
        <Text
          text={`Panel ${index}${panel.cameraDirection ? `\n${panel.cameraDirection}` : ''}\n[${panel.status}]`}
          width={width}
          height={height}
          align="center"
          verticalAlign="middle"
          fontSize={16}
          fill="#71717a"
          padding={8}
        />
      )}
      <Rect
        width={width}
        height={height}
        stroke={selected ? '#e11d48' : '#09090b'}
        strokeWidth={selected ? 4 : 3}
        cornerRadius={2}
      />
    </Group>
  );
}

/* ------------------------------------------------------------------ layer node */

function LayerNode({
  layer,
  selected,
  onSelect,
  onChange,
  characterName,
}: {
  layer: PanelLayer;
  selected: boolean;
  onSelect: () => void;
  onChange: (geom: Partial<LayerKonva>) => void;
  characterName: (id: string) => string;
}) {
  const def = LAYER_DEFAULTS[layer.type] ?? LAYER_DEFAULTS.overlay;
  const g = layerGeom(layer);
  const width = g.width ?? def.width ?? 180;
  const fontSize = g.fontSize ?? def.fontSize ?? 16;
  const fill = g.fill ?? def.fill ?? '#0a0a0a';
  const text = layer.content || def.text;

  const common = {
    x: g.x,
    y: g.y,
    rotation: g.rotation ?? 0,
    draggable: !layer.locked,
    onMouseDown: onSelect,
    onTap: onSelect,
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) =>
      onChange({ x: e.target.x(), y: e.target.y() }),
  };
  const outline = selected ? '#e11d48' : undefined;

  if (layer.type === 'dialogue' || layer.type === 'narration') {
    const padding = 12;
    const isBubble = layer.type === 'dialogue';
    // rough height from text length / width
    const lines = Math.max(1, Math.ceil(text.length / Math.max(8, width / (fontSize * 0.55))));
    const boxH = lines * fontSize * 1.3 + padding * 2;
    return (
      <Group {...common}>
        {isBubble ? (
          <>
            <Rect
              width={width}
              height={boxH}
              fill="#ffffff"
              stroke={outline ?? '#0a0a0a'}
              strokeWidth={outline ? 3 : 2}
              cornerRadius={Math.min(boxH, width) / 2}
            />
            <Line
              points={[width * 0.3, boxH - 2, width * 0.22, boxH + 22, width * 0.46, boxH - 2]}
              closed
              fill="#ffffff"
              stroke={outline ?? '#0a0a0a'}
              strokeWidth={outline ? 3 : 2}
            />
          </>
        ) : (
          <Rect
            width={width}
            height={boxH}
            fill="#0a0a0a"
            opacity={0.88}
            stroke={outline}
            strokeWidth={outline ? 3 : 0}
          />
        )}
        <Text
          text={text}
          width={width}
          padding={padding}
          fontSize={fontSize}
          fontStyle={isBubble ? 'normal' : 'italic'}
          align="center"
          fill={isBubble ? fill : '#fafafa'}
        />
      </Group>
    );
  }

  if (layer.type === 'sfx') {
    return (
      <Group {...common}>
        <Text
          text={text}
          fontSize={fontSize}
          fontStyle="bold"
          fill={fill}
          stroke="#000000"
          strokeWidth={1}
        />
        {selected && (
          <Rect width={width} height={fontSize * 1.2} stroke="#e11d48" strokeWidth={2} dash={[6, 4]} />
        )}
      </Group>
    );
  }

  // background / character / foreground / overlay markers
  const label =
    layer.type === 'character' && layer.characterId
      ? `◉ ${characterName(layer.characterId)}`
      : `◼ ${text}`;
  return (
    <Group {...common}>
      <Rect
        width={width}
        height={40}
        fill={fill}
        opacity={0.18}
        stroke={outline ?? fill}
        strokeWidth={selected ? 3 : 1.5}
        dash={[8, 4]}
        cornerRadius={4}
      />
      <Text text={label} width={width} padding={10} fontSize={13} fill={fill} />
    </Group>
  );
}
