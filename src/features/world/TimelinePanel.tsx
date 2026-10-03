import * as React from 'react';
import { ChevronDown, ChevronUp, Clock, MoreVertical, Plus, Trash2 } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MultiSelect } from '@/components/common/MultiSelect';
import { useEntityDraft } from '@/hooks/useEntityDraft';
import { useWorldStore } from '@/store/useWorldStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useCastStore } from '@/store/useCastStore';
import { scenesRepo } from '@/db/repositories';
import type { Scene, TimelineEvent } from '@/db/schema';

export function TimelinePanel() {
  const events = useWorldStore((s) => s.events);
  const currentId = useWorldStore((s) => s.currentEventId);
  const current = events.find((e) => e.id === currentId);

  return (
    <div className="flex h-full overflow-hidden">
      <TimelineList />
      <main className="min-w-0 flex-1">
        {current ? (
          <EventEditor key={current.id} event={current} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <Clock className="h-10 w-10" />
            <p className="max-w-xs text-sm">
              Select an event, or add one to build the chronological spine of the story.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function TimelineList() {
  const events = useWorldStore((s) => s.events);
  const currentId = useWorldStore((s) => s.currentEventId);
  const select = useWorldStore((s) => s.selectEvent);
  const create = useWorldStore((s) => s.createEvent);
  const move = useWorldStore((s) => s.moveEvent);
  const remove = useWorldStore((s) => s.deleteEvent);

  const ordered = [...events].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <aside className="flex h-full w-80 flex-col border-r border-border bg-card/40">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Timeline
        </span>
        <Button variant="ghost" size="icon-sm" title="New event" onClick={() => void create()}>
          <Plus />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-2 pb-6">
          {ordered.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              No timeline events yet.
            </p>
          )}
          {ordered.map((e, i) => (
            <div
              key={e.id}
              role="button"
              tabIndex={0}
              onClick={() => select(e.id)}
              onKeyDown={(k) => k.key === 'Enter' && select(e.id)}
              className={cn(
                'group relative flex items-start gap-2 rounded-md px-2 py-2 text-sm',
                e.id === currentId ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
              )}
            >
              <div className="flex flex-col items-center pt-0.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                {i < ordered.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{e.title}</div>
                {e.inWorldTime && (
                  <div className="truncate text-xs text-muted-foreground">{e.inWorldTime}</div>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(ev) => ev.stopPropagation()}>
                  <DropdownMenuItem disabled={i === 0} onSelect={() => void move(e.id, -1)}>
                    <ChevronUp /> Move earlier
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={i === ordered.length - 1}
                    onSelect={() => void move(e.id, 1)}
                  >
                    <ChevronDown /> Move later
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => void remove(e.id)}
                  >
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}

function EventEditor({ event }: { event: TimelineEvent }) {
  const update = useWorldStore((s) => s.updateEvent);
  const chapters = useWorkspaceStore((s) => s.chapters);
  const characters = useCastStore((s) => s.characters);
  const entities = useWorldStore((s) => s.entities);

  const { draft, setField } = useEntityDraft<TimelineEvent>(event, (patch) =>
    update(event.id, patch),
  );

  // Scenes depend on the selected chapter; fetched on demand.
  const [scenes, setScenes] = React.useState<Scene[]>([]);
  React.useEffect(() => {
    let active = true;
    if (!draft.chapterId) {
      setScenes([]);
      return;
    }
    void scenesRepo.listScenes(draft.chapterId).then((rows) => active && setScenes(rows));
    return () => {
      active = false;
    };
  }, [draft.chapterId]);

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-2xl space-y-6 px-6 py-6">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={draft.title} onChange={(e) => setField('title', e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>In-world time</Label>
          <Input
            value={draft.inWorldTime ?? ''}
            placeholder="Year 1023, Spring — the Founding"
            onChange={(e) => setField('inWorldTime', e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea
            rows={4}
            value={draft.description ?? ''}
            onChange={(e) => setField('description', e.target.value)}
          />
        </div>

        <Separator />

        <section className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Chapter</Label>
            <Select
              value={draft.chapterId ?? 'none'}
              onValueChange={(v) => {
                setField('chapterId', v === 'none' ? null : v);
                setField('sceneId', null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Not linked" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not linked</SelectItem>
                {chapters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Scene</Label>
            <Select
              value={draft.sceneId ?? 'none'}
              disabled={!draft.chapterId}
              onValueChange={(v) => setField('sceneId', v === 'none' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Not linked" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not linked</SelectItem>
                {scenes.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Characters involved</Label>
            <MultiSelect
              options={characters.map((c) => ({ value: c.id, label: c.name }))}
              value={draft.affectedCharacterIds ?? []}
              onChange={(v) => setField('affectedCharacterIds', v)}
              placeholder="Add characters"
              emptyText="No characters yet"
            />
          </div>
          <div className="space-y-1.5">
            <Label>World entities involved</Label>
            <MultiSelect
              options={entities.map((e) => ({ value: e.id, label: e.name }))}
              value={draft.affectedEntityIds ?? []}
              onChange={(v) => setField('affectedEntityIds', v)}
              placeholder="Add entities"
              emptyText="No entities yet"
            />
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
