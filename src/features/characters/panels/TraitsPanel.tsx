import * as React from 'react';
import { Lock, Plus, Trash2, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useCastStore } from '@/store/useCastStore';
import type { Character, TraitRule } from '@/db/schema';

const PRESETS = ['Hair style', 'Hair color', 'Eye color', 'Body shape', 'Skin tone', 'Height'];

function combine(character: Character): TraitRule[] {
  return [
    ...(character.lockedTraits ?? []).map((t) => ({ ...t, locked: true })),
    ...(character.variableTraits ?? []).map((t) => ({ ...t, locked: false })),
  ];
}

export function TraitsPanel({ character }: { character: Character }) {
  const update = useCastStore((s) => s.updateCharacter);
  const [traits, setTraits] = React.useState<TraitRule[]>(() => combine(character));

  const commit = useDebouncedCallback((next: TraitRule[]) => {
    void update(character.id, {
      lockedTraits: next.filter((t) => t.locked),
      variableTraits: next.filter((t) => !t.locked),
    });
  }, 400);

  const apply = (next: TraitRule[]) => {
    setTraits(next);
    commit(next);
  };

  const setAt = (i: number, patch: Partial<TraitRule>) =>
    apply(traits.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const removeAt = (i: number) => apply(traits.filter((_, idx) => idx !== i));
  const add = (key = '', locked = true) =>
    apply([...traits, { key, value: '', locked, promptFragment: '' }]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Locked traits (🔒) are forced into every generated panel unchanged. Unlocked traits
        are allowed to vary per scene (pose, outfit, lighting). This is what keeps a character
        on-model across the whole manga.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <Button key={p} variant="outline" size="sm" onClick={() => add(p, true)}>
            <Lock /> {p}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {traits.length === 0 && (
          <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            No traits defined yet. Add locked traits for the identity features that must never
            change.
          </p>
        )}
        {traits.map((t, i) => (
          <div
            key={i}
            className={cn(
              'grid grid-cols-[auto_1fr_1fr_1.4fr_auto] items-center gap-2 rounded-md border p-2',
              t.locked ? 'border-primary/40 bg-primary/5' : 'border-border',
            )}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              title={t.locked ? 'Locked — click to unlock' : 'Unlocked — click to lock'}
              onClick={() => setAt(i, { locked: !t.locked })}
              className={t.locked ? 'text-primary' : 'text-muted-foreground'}
            >
              {t.locked ? <Lock /> : <Unlock />}
            </Button>
            <Input
              value={t.key}
              placeholder="trait"
              onChange={(e) => setAt(i, { key: e.target.value })}
            />
            <Input
              value={t.value}
              placeholder="value"
              onChange={(e) => setAt(i, { value: e.target.value })}
            />
            <Input
              value={t.promptFragment ?? ''}
              placeholder="prompt override (optional)"
              onChange={(e) => setAt(i, { promptFragment: e.target.value })}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => removeAt(i)}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={() => add('', false)}>
        <Plus /> Add variable trait
      </Button>
    </div>
  );
}
