import * as React from 'react';
import { FolderOpen, Plus, Trash2 } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
import { toast } from '@/components/ui/sonner';
import { useEntityDraft } from '@/hooks/useEntityDraft';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useWorldStore } from '@/store/useWorldStore';
import {
  WORLD_ENTITY_TYPES,
  type PromptFragment,
  type WorldEntity,
} from '@/db/schema';
import { ENTITY_ICON, entityTypeLabel } from './entityMeta';

/** Ids of an entity and all its descendants — invalid parent choices (cycles). */
function descendantIds(all: WorldEntity[], rootId: string): Set<string> {
  const byParent = new Map<string, WorldEntity[]>();
  for (const e of all) {
    if (!e.parentId) continue;
    (byParent.get(e.parentId) ?? byParent.set(e.parentId, []).get(e.parentId)!).push(e);
  }
  const out = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const child of byParent.get(id) ?? []) {
      if (!out.has(child.id)) {
        out.add(child.id);
        stack.push(child.id);
      }
    }
  }
  return out;
}

export function EntityEditor({ entity }: { entity: WorldEntity }) {
  const entities = useWorldStore((s) => s.entities);
  const update = useWorldStore((s) => s.updateEntity);
  const remove = useWorldStore((s) => s.deleteEntity);

  const { draft, setField } = useEntityDraft<WorldEntity>(entity, (patch) =>
    update(entity.id, patch),
  );

  const Icon = ENTITY_ICON[draft.type];
  const invalidParents = React.useMemo(
    () => descendantIds(entities, entity.id),
    [entities, entity.id],
  );
  const parentOptions = entities.filter((e) => !invalidParents.has(e.id));

  const prompt = draft.promptFragment ?? {};
  const setPrompt = (patch: Partial<PromptFragment>) =>
    setField('promptFragment', { ...prompt, ...patch });

  const images = draft.referenceImages ?? [];
  const browse = async () => {
    try {
      const picked = await open({
        multiple: true,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
      });
      if (!picked) return;
      const paths = Array.isArray(picked) ? picked : [picked];
      setField('referenceImages', [...images, ...paths.filter((p) => !images.includes(p))]);
    } catch (err) {
      toast.error('File picker failed', {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border px-6 py-2.5">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <Input
          value={draft.name}
          onChange={(e) => setField('name', e.target.value)}
          className="h-8 max-w-sm border-0 px-0 text-base font-semibold shadow-none focus-visible:ring-0"
          placeholder="Entity name"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto text-muted-foreground hover:text-destructive"
          title="Delete entity"
          onClick={() => void remove(entity.id)}
        >
          <Trash2 />
        </Button>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
          <section className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={draft.type} onValueChange={(v) => setField('type', v as WorldEntity['type'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {WORLD_ENTITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {entityTypeLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Parent</Label>
              <Select
                value={draft.parentId ?? 'none'}
                onValueChange={(v) => setField('parentId', v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (top level)" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="none">None (top level)</SelectItem>
                  {parentOptions.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          <div className="space-y-1.5">
            <Label>Short description</Label>
            <Input
              value={draft.description ?? ''}
              placeholder="One-line summary for quick reference"
              onChange={(e) => setField('description', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Lore</Label>
            <Textarea
              rows={5}
              value={draft.loreText ?? ''}
              placeholder="History, rules, culture, geography, politics…"
              onChange={(e) => setField('loreText', e.target.value)}
            />
          </div>

          <AttributesEditor
            value={(draft.attributes as Record<string, unknown>) ?? {}}
            onChange={(next) => setField('attributes', next)}
          />

          <div className="space-y-1.5">
            <Label>Continuity notes</Label>
            <Textarea
              rows={2}
              value={draft.continuityNotes ?? ''}
              placeholder="Facts that must stay consistent (the Continuity Agent reads these)"
              onChange={(e) => setField('continuityNotes', e.target.value)}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Scene prompt (positive)</Label>
              <Textarea
                rows={2}
                value={prompt.positive ?? ''}
                placeholder="gothic cathedral interior, candlelight…"
                onChange={(e) => setPrompt({ positive: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Scene prompt (negative)</Label>
              <Textarea
                rows={2}
                value={prompt.negative ?? ''}
                placeholder="modern, daylight…"
                onChange={(e) => setPrompt({ negative: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Reference images</Label>
              <Button variant="outline" size="sm" onClick={() => void browse()}>
                <FolderOpen /> Browse…
              </Button>
            </div>
            {images.map((path, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={path}
                  onChange={(e) =>
                    setField(
                      'referenceImages',
                      images.map((p, idx) => (idx === i ? e.target.value : p)),
                    )
                  }
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setField('referenceImages', images.filter((_, idx) => idx !== i))}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function AttributesEditor({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  // Work on a local ordered row list so empty keys don't collapse while typing.
  const [rows, setRows] = React.useState<{ key: string; value: string }[]>(() =>
    Object.entries(value).map(([k, v]) => ({ key: k, value: String(v ?? '') })),
  );
  const commit = useDebouncedCallback((next: { key: string; value: string }[]) => {
    const obj: Record<string, unknown> = {};
    for (const r of next) if (r.key.trim()) obj[r.key.trim()] = r.value;
    onChange(obj);
  }, 400);

  const apply = (next: { key: string; value: string }[]) => {
    setRows(next);
    commit(next);
  };

  return (
    <div className="space-y-2">
      <Label>Attributes</Label>
      <p className="text-xs text-muted-foreground">
        Structured facts: population, ruler, currency, climate, tech level, schedule…
      </p>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={r.key}
            placeholder="key"
            className="w-1/3"
            onChange={(e) => apply(rows.map((x, idx) => (idx === i ? { ...x, key: e.target.value } : x)))}
          />
          <Input
            value={r.value}
            placeholder="value"
            onChange={(e) => apply(rows.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => apply(rows.filter((_, idx) => idx !== i))}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => apply([...rows, { key: '', value: '' }])}>
        <Plus /> Add attribute
      </Button>
    </div>
  );
}
