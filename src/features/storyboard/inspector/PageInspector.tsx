import { LayoutTemplate as LayoutIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStoryboardStore } from '@/store/useStoryboardStore';
import type { CanvasSize, Page } from '@/db/schema';
import { LAYOUT_TEMPLATES } from '../layouts';

const PRESETS: { id: string; label: string; size: CanvasSize }[] = [
  { id: 'a4', label: 'A4 (150dpi)', size: { width: 1240, height: 1754, dpi: 150 } },
  { id: 'b5', label: 'B5 manga', size: { width: 1075, height: 1518, dpi: 150 } },
  { id: 'web', label: 'Webtoon strip', size: { width: 800, height: 2400, dpi: 96 } },
  { id: 'square', label: 'Square', size: { width: 1200, height: 1200, dpi: 150 } },
];

export function PageInspector({ page }: { page: Page }) {
  const update = useStoryboardStore((s) => s.updatePage);
  const applyLayout = useStoryboardStore((s) => s.applyLayout);
  const size = page.canvasSize;

  const setSize = (patch: Partial<CanvasSize>) =>
    void update(page.id, { canvasSize: { ...size, ...patch } });

  const matchedPreset =
    PRESETS.find((p) => p.size.width === size.width && p.size.height === size.height)?.id ??
    'custom';

  return (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-4">
        <h3 className="text-sm font-semibold">Page settings</h3>

        <div className="space-y-1.5">
          <Label className="text-xs">Canvas preset</Label>
          <Select
            value={matchedPreset}
            onValueChange={(v) => {
              const preset = PRESETS.find((p) => p.id === v);
              if (preset) void update(page.id, { canvasSize: preset.size });
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
              {matchedPreset === 'custom' && <SelectItem value="custom">Custom</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Width</Label>
            <Input
              type="number"
              className="h-8 px-2"
              value={size.width}
              onChange={(e) => setSize({ width: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Height</Label>
            <Input
              type="number"
              className="h-8 px-2"
              value={size.height}
              onChange={(e) => setSize({ height: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Gutter</Label>
            <Input
              type="number"
              className="h-8 px-2"
              value={page.gutter}
              onChange={(e) => void update(page.id, { gutter: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bleed</Label>
            <Input
              type="number"
              className="h-8 px-2"
              value={page.bleed}
              onChange={(e) => void update(page.id, { bleed: Math.max(0, Number(e.target.value)) })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Reading dir.</Label>
            <Select
              value={page.readingDirection}
              onValueChange={(v) => void update(page.id, { readingDirection: v as Page['readingDirection'] })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rtl">Right → Left</SelectItem>
                <SelectItem value="ltr">Left → Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs">
            <LayoutIcon className="h-3.5 w-3.5" /> Layout templates
          </Label>
          <p className="text-xs text-muted-foreground">Replaces the panels on this page.</p>
          <div className="grid grid-cols-2 gap-1.5">
            {LAYOUT_TEMPLATES.map((t) => (
              <Button
                key={t.id}
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => void applyLayout(t)}
              >
                {t.name}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
