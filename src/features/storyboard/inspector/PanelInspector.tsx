import * as React from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Lock,
  Sparkles,
  Trash2,
  Unlock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
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
import type { Panel, PanelRect } from '@/db/schema';
import { LAYER_META, LAYER_TYPE_ORDER } from '../layerMeta';
import { PromptInspectorDialog } from '../PromptInspectorDialog';

const PANEL_SHAPES = ['rect', 'splash', 'spread', 'polygon', 'circle', 'custom'] as const;
const PANEL_STATUS = ['empty', 'drafted', 'queued', 'generating', 'rendered', 'approved'] as const;

export function PanelInspector({ panel }: { panel: Panel }) {
  const update = useStoryboardStore((s) => s.updatePanel);
  const remove = useStoryboardStore((s) => s.deletePanel);
  const createLayer = useStoryboardStore((s) => s.createLayer);
  const allLayers = useStoryboardStore((s) => s.layers);
  const layers = React.useMemo(
    () => allLayers.filter((l) => l.panelId === panel.id).sort((a, b) => a.zIndex - b.zIndex),
    [allLayers, panel.id],
  );
  const updateLayer = useStoryboardStore((s) => s.updateLayer);
  const deleteLayer = useStoryboardStore((s) => s.deleteLayer);
  const changeLayerZ = useStoryboardStore((s) => s.changeLayerZ);
  const select = useStoryboardStore((s) => s.select);

  const { draft, setField } = useEntityDraft<Panel>(panel, (patch) => update(panel.id, patch));
  const [promptOpen, setPromptOpen] = React.useState(false);

  const setRect = (patch: Partial<PanelRect>) =>
    setField('rect', { ...draft.rect, ...patch });

  const addLayer = (type: keyof typeof LAYER_META) => {
    const { x, y } = draft.rect;
    void createLayer(panel.id, {
      type,
      content: LAYER_META[type].defaultContent,
      konva: { x: x + 24, y: y + 24 },
    });
  };

  return (
    <>
    <ScrollArea className="h-full">
      <div className="space-y-5 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Panel</h3>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => void remove(panel.id)}
          >
            <Trash2 />
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {(['x', 'y', 'width', 'height'] as const).map((k) => (
            <div key={k} className="space-y-1">
              <Label className="text-xs capitalize">{k === 'width' ? 'W' : k === 'height' ? 'H' : k.toUpperCase()}</Label>
              <Input
                type="number"
                className="h-8 px-2"
                value={Math.round(draft.rect[k])}
                onChange={(e) => setRect({ [k]: Number(e.target.value) })}
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Shape</Label>
            <Select value={draft.shape} onValueChange={(v) => setField('shape', v as Panel['shape'])}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PANEL_SHAPES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={draft.status} onValueChange={(v) => setField('status', v as Panel['status'])}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PANEL_STATUS.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Camera direction</Label>
          <Input
            value={draft.cameraDirection ?? ''}
            placeholder="low angle, wide establishing shot"
            onChange={(e) => setField('cameraDirection', e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Prompt notes (positive)</Label>
          <Textarea
            rows={2}
            value={draft.promptPositive ?? ''}
            placeholder="Extra tags merged into the compiled prompt"
            onChange={(e) => setField('promptPositive', e.target.value)}
          />
        </div>

        <Button className="w-full" onClick={() => setPromptOpen(true)}>
          <Sparkles /> Compile &amp; generate
        </Button>

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs">Layers</Label>
          <div className="flex flex-wrap gap-1">
            {LAYER_TYPE_ORDER.map((t) => {
              const Icon = LAYER_META[t].icon;
              return (
                <Button key={t} variant="outline" size="sm" onClick={() => addLayer(t)}>
                  <Icon /> {LAYER_META[t].label}
                </Button>
              );
            })}
          </div>

          <div className="space-y-1 pt-1">
            {layers.length === 0 && (
              <p className="text-xs text-muted-foreground">No layers on this panel yet.</p>
            )}
            {[...layers].reverse().map((l) => {
              const Icon = LAYER_META[l.type].icon;
              return (
                <div
                  key={l.id}
                  className={cn(
                    'group flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm',
                    'border-border hover:bg-accent/50',
                  )}
                  role="button"
                  tabIndex={0}
                  onClick={() => select({ kind: 'layer', id: l.id })}
                  onKeyDown={(e) => e.key === 'Enter' && select({ kind: 'layer', id: l.id })}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-xs">
                    {l.content || LAYER_META[l.type].label}
                  </span>
                  <LayerIconBtn title="Up" onClick={() => void changeLayerZ(l.id, 1)}>
                    <ArrowUp />
                  </LayerIconBtn>
                  <LayerIconBtn title="Down" onClick={() => void changeLayerZ(l.id, -1)}>
                    <ArrowDown />
                  </LayerIconBtn>
                  <LayerIconBtn
                    title={l.visible ? 'Hide' : 'Show'}
                    onClick={() => void updateLayer(l.id, { visible: !l.visible })}
                  >
                    {l.visible ? <Eye /> : <EyeOff />}
                  </LayerIconBtn>
                  <LayerIconBtn
                    title={l.locked ? 'Unlock' : 'Lock'}
                    onClick={() => void updateLayer(l.id, { locked: !l.locked })}
                  >
                    {l.locked ? <Lock /> : <Unlock />}
                  </LayerIconBtn>
                  <LayerIconBtn
                    title="Delete"
                    className="hover:text-destructive"
                    onClick={() => void deleteLayer(l.id)}
                  >
                    <Trash2 />
                  </LayerIconBtn>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ScrollArea>
    <PromptInspectorDialog panel={panel} open={promptOpen} onOpenChange={setPromptOpen} />
    </>
  );
}

function LayerIconBtn({
  children,
  onClick,
  title,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      title={title}
      className={cn('h-6 w-6 text-muted-foreground', className)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </Button>
  );
}
