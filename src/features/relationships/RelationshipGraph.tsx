import * as React from 'react';
import { Stage, Layer, Group, Circle, Text, Line, Arrow } from 'react-konva';
import type Konva from 'konva';
import { useCastStore } from '@/store/useCastStore';
import type { RelationshipVectors } from '@/db/schema';

type Pos = { x: number; y: number };
const NODE_R = 28;

/** Maps a vector value (-100..100) to an edge color + width. */
function edgeStyle(value: number | undefined) {
  const v = value ?? 0;
  const mag = Math.min(Math.abs(v), 100);
  const width = 1.5 + (mag / 100) * 6;
  // emerald for positive, red for negative, dim grey near zero
  const color = mag < 8 ? '#52525b' : v >= 0 ? '#10b981' : '#ef4444';
  const opacity = 0.35 + (mag / 100) * 0.6;
  return { width, color, opacity };
}

export function RelationshipGraph({
  vectorKey,
  linkMode,
  onConsumeLink,
}: {
  vectorKey: keyof RelationshipVectors;
  linkMode: boolean;
  onConsumeLink: () => void;
}) {
  const characters = useCastStore((s) => s.characters);
  const relationships = useCastStore((s) => s.relationships);
  const selectedId = useCastStore((s) => s.selectedRelationshipId);
  const selectRelationship = useCastStore((s) => s.selectRelationship);
  const createRelationship = useCastStore((s) => s.createRelationship);
  const moveCharacter = useCastStore((s) => s.moveCharacter);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ w: 800, h: 600 });
  const [positions, setPositions] = React.useState<Record<string, Pos>>({});
  const [linkSource, setLinkSource] = React.useState<string | null>(null);

  // Track the container size for a crisp, responsive stage.
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const idsKey = characters.map((c) => c.id).join(',');

  // Seed positions when the set of characters changes (not on every coord save).
  React.useEffect(() => {
    setPositions((prev) => {
      const next: Record<string, Pos> = {};
      const cx = size.w / 2;
      const cy = size.h / 2;
      const radius = Math.max(120, Math.min(size.w, size.h) / 2 - 90);
      characters.forEach((c, i) => {
        if (prev[c.id]) next[c.id] = prev[c.id];
        else if (c.graphX != null && c.graphY != null)
          next[c.id] = { x: c.graphX, y: c.graphY };
        else {
          const angle = (i / Math.max(characters.length, 1)) * Math.PI * 2 - Math.PI / 2;
          next[c.id] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
        }
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, size.w, size.h]);

  const handleNodeClick = (id: string) => {
    if (!linkMode) return;
    if (!linkSource) {
      setLinkSource(id);
    } else if (linkSource !== id) {
      void createRelationship(linkSource, id);
      setLinkSource(null);
      onConsumeLink();
    }
  };

  const onDragMove = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const { x, y } = e.target.position();
    setPositions((p) => ({ ...p, [id]: { x, y } }));
  };

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {characters.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Add characters in the Characters tab — they appear here as nodes.
        </div>
      )}
      <Stage
        width={size.w}
        height={size.h}
        onMouseDown={(e) => {
          // click on empty canvas clears selection + pending link
          if (e.target === e.target.getStage()) {
            selectRelationship(null);
            setLinkSource(null);
          }
        }}
      >
        <Layer>
          {/* edges */}
          {relationships.map((r) => {
            const a = positions[r.fromCharacterId];
            const b = positions[r.toCharacterId];
            if (!a || !b) return null;
            const style = edgeStyle(r.vectors?.[vectorKey]);
            const selected = r.id === selectedId;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const p1 = [a.x + ux * NODE_R, a.y + uy * NODE_R];
            const p2 = [b.x - ux * NODE_R, b.y - uy * NODE_R];
            const common = {
              points: [...p1, ...p2],
              stroke: selected ? '#e11d48' : style.color,
              strokeWidth: selected ? style.width + 2 : style.width,
              opacity: selected ? 1 : style.opacity,
              hitStrokeWidth: 16,
              onClick: () => selectRelationship(r.id),
              onTap: () => selectRelationship(r.id),
            };
            return r.directed ? (
              <Arrow key={r.id} {...common} pointerLength={9} pointerWidth={9} fill={common.stroke} />
            ) : (
              <Line key={r.id} {...common} />
            );
          })}

          {/* nodes */}
          {characters.map((c) => {
            const p = positions[c.id];
            if (!p) return null;
            const isSource = linkSource === c.id;
            return (
              <Group
                key={c.id}
                x={p.x}
                y={p.y}
                draggable
                onDragMove={(e) => onDragMove(c.id, e)}
                onDragEnd={(e) => moveCharacter(c.id, e.target.x(), e.target.y())}
                onClick={() => handleNodeClick(c.id)}
                onTap={() => handleNodeClick(c.id)}
              >
                <Circle
                  radius={NODE_R}
                  fill={c.colorHex ?? '#3f3f46'}
                  stroke={isSource ? '#f59e0b' : '#09090b'}
                  strokeWidth={isSource ? 3 : 2}
                  shadowColor="black"
                  shadowBlur={8}
                  shadowOpacity={0.4}
                />
                <Text
                  text={c.name}
                  fontSize={12}
                  fontStyle="600"
                  fill="#fafafa"
                  width={140}
                  align="center"
                  offsetX={70}
                  y={NODE_R + 4}
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
