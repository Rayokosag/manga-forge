import * as React from 'react';
import { ArrowRight, CalendarClock, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEntityDraft } from '@/hooks/useEntityDraft';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useCastStore } from '@/store/useCastStore';
import { relationshipsRepo } from '@/db/repositories';
import type { Relationship, RelationshipEvent, RelationshipVectors } from '@/db/schema';

const VECTORS: { key: keyof RelationshipVectors; label: string }[] = [
  { key: 'trust', label: 'Trust' },
  { key: 'affection', label: 'Affection' },
  { key: 'conflict', label: 'Conflict' },
  { key: 'jealousy', label: 'Jealousy' },
  { key: 'intimacy', label: 'Intimacy' },
  { key: 'power', label: 'Power dynamic' },
];

export function RelationshipEditor({ relationship }: { relationship: Relationship }) {
  const update = useCastStore((s) => s.updateRelationship);
  const remove = useCastStore((s) => s.deleteRelationship);
  const characterName = useCastStore((s) => s.characterName);

  const { draft, setField } = useEntityDraft<Relationship>(relationship, (patch) =>
    update(relationship.id, patch),
  );

  const [vectors, setVectors] = React.useState<RelationshipVectors>(
    relationship.vectors ?? {},
  );
  const commitVectors = useDebouncedCallback(
    (next: RelationshipVectors) => void update(relationship.id, { vectors: next }),
    350,
  );
  const setVector = (key: keyof RelationshipVectors, value: number) => {
    setVectors((prev) => {
      const next = { ...prev, [key]: value };
      commitVectors(next);
      return next;
    });
  };

  // Timeline events for this edge.
  const [events, setEvents] = React.useState<RelationshipEvent[]>([]);
  const [eventText, setEventText] = React.useState('');

  React.useEffect(() => {
    let active = true;
    void relationshipsRepo.listRelationshipEvents(relationship.id).then((rows) => {
      if (active) setEvents(rows);
    });
    return () => {
      active = false;
    };
  }, [relationship.id]);

  const addEvent = async () => {
    const description = eventText.trim();
    if (!description) return;
    const row = await relationshipsRepo.createRelationshipEvent(relationship.id, {
      description,
      orderIndex: events.length + 1,
      deltas: { ...vectors }, // snapshot the vectors at this story beat
    });
    setEvents((prev) => [...prev, row]);
    setEventText('');
  };

  const deleteEvent = async (id: string) => {
    await relationshipsRepo.deleteRelationshipEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="truncate">{characterName(relationship.fromCharacterId)}</span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{characterName(relationship.toCharacterId)}</span>
        </div>

        <div className="space-y-1.5">
          <Label>Label</Label>
          <Input
            value={draft.label ?? ''}
            placeholder="rivals, lovers, estranged siblings…"
            onChange={(e) => setField('label', e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
          <div>
            <Label>Directed</Label>
            <p className="text-xs text-muted-foreground">
              {draft.directed ? 'A → B may differ from B → A' : 'Symmetric (mutual)'}
            </p>
          </div>
          <Switch
            checked={!!draft.directed}
            onCheckedChange={(v) => setField('directed', v)}
          />
        </div>

        <Separator />

        <div className="space-y-4">
          {VECTORS.map(({ key, label }) => {
            const value = vectors[key] ?? 0;
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">{label}</Label>
                  <span
                    className="text-xs tabular-nums"
                    style={{
                      color:
                        value > 0 ? '#10b981' : value < 0 ? '#ef4444' : 'hsl(var(--muted-foreground))',
                    }}
                  >
                    {value > 0 ? `+${value}` : value}
                  </span>
                </div>
                <Slider
                  value={[value]}
                  min={-100}
                  max={100}
                  step={1}
                  onValueChange={([v]) => setVector(key, v)}
                />
              </div>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea
            rows={2}
            value={draft.notes ?? ''}
            onChange={(e) => setField('notes', e.target.value)}
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" /> Progression timeline
          </Label>
          <p className="text-xs text-muted-foreground">
            Snapshot how this bond stands at a story beat. The current vectors are captured with
            each entry.
          </p>
          {events.map((e) => (
            <div
              key={e.id}
              className="flex items-start gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm"
            >
              <span className="flex-1">{e.description}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => void deleteEvent(e.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Input
              value={eventText}
              placeholder="e.g. Ch.3 — betrayal at the gate"
              onChange={(e) => setEventText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void addEvent()}
            />
            <Button variant="outline" size="icon-sm" onClick={() => void addEvent()}>
              <Plus />
            </Button>
          </div>
        </div>

        <Separator />

        <Button
          variant="ghost"
          className="w-full text-destructive hover:text-destructive"
          onClick={() => void remove(relationship.id)}
        >
          <Trash2 /> Delete relationship
        </Button>
      </div>
    </ScrollArea>
  );
}
