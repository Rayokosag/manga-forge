import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEntityDraft } from '@/hooks/useEntityDraft';
import { useStoryboardStore } from '@/store/useStoryboardStore';
import { useCastStore } from '@/store/useCastStore';
import type { PanelLayer } from '@/db/schema';
import type { LayerKonva } from '../layouts';
import { LAYER_META } from '../layerMeta';

export function LayerInspector({ layer }: { layer: PanelLayer }) {
  const update = useStoryboardStore((s) => s.updateLayer);
  const remove = useStoryboardStore((s) => s.deleteLayer);
  const characters = useCastStore((s) => s.characters);

  const { draft, setField } = useEntityDraft<PanelLayer>(layer, (patch) =>
    update(layer.id, patch),
  );

  const geom = (draft.konva as LayerKonva | null) ?? { x: 20, y: 20 };
  const setGeom = (patch: Partial<LayerKonva>) => setField('konva', { ...geom, ...patch });

  const meta = LAYER_META[draft.type];
  const isText = draft.type === 'dialogue' || draft.type === 'narration' || draft.type === 'sfx';

  return (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <meta.icon className="h-4 w-4" /> {meta.label}
          </h3>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => void remove(layer.id)}
          >
            <Trash2 />
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">{isText ? 'Text' : 'Label'}</Label>
          <Textarea
            rows={isText ? 3 : 1}
            value={draft.content ?? ''}
            placeholder={meta.defaultContent}
            onChange={(e) => setField('content', e.target.value)}
          />
        </div>

        {draft.type === 'character' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Linked character</Label>
            <Select
              value={draft.characterId ?? 'none'}
              onValueChange={(v) => setField('characterId', v === 'none' ? null : v)}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {characters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Separator />

        <div className="grid grid-cols-2 gap-2">
          <Geom label="X" value={geom.x} onChange={(v) => setGeom({ x: v })} />
          <Geom label="Y" value={geom.y} onChange={(v) => setGeom({ y: v })} />
          <Geom label="Width" value={geom.width ?? 180} onChange={(v) => setGeom({ width: v })} />
          {isText && (
            <Geom
              label="Font size"
              value={geom.fontSize ?? 16}
              onChange={(v) => setGeom({ fontSize: v })}
            />
          )}
          <Geom
            label="Rotation"
            value={geom.rotation ?? 0}
            onChange={(v) => setGeom({ rotation: v })}
          />
        </div>

        {isText && (
          <div className="space-y-1.5">
            <Label className="text-xs">Fill color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={geom.fill ?? '#0a0a0a'}
                onChange={(e) => setGeom({ fill: e.target.value })}
                className="h-8 w-12 cursor-pointer rounded-md border border-input bg-transparent"
              />
              <Input
                value={geom.fill ?? ''}
                placeholder="#0a0a0a"
                onChange={(e) => setGeom({ fill: e.target.value })}
              />
            </div>
          </div>
        )}

        <Separator />

        <div className="flex items-center justify-between">
          <Label className="text-xs">Visible</Label>
          <Switch checked={!!draft.visible} onCheckedChange={(v) => setField('visible', v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Locked</Label>
          <Switch checked={!!draft.locked} onCheckedChange={(v) => setField('locked', v)} />
        </div>
      </div>
    </ScrollArea>
  );
}

function Geom({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        className="h-8 px-2"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
