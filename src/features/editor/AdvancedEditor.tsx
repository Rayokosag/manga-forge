import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { TagInput } from '@/components/common/TagInput';
import { MultiSelect, type Option } from '@/components/common/MultiSelect';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useCastStore } from '@/store/useCastStore';
import type { Scene, SceneStructured } from '@/db/schema';

/**
 * Structured, relational breakdown of a scene. Mirrors the two first-class
 * columns (timeOfDay/weather) and stores the rest in the `structured` JSON.
 * Edits here never touch the prose; the two modes are complementary.
 */
export function AdvancedEditor({ scene }: { scene: Scene }) {
  const updateScene = useWorkspaceStore((s) => s.updateScene);
  const characters = useCastStore((s) => s.characters);

  const [draft, setDraft] = React.useState<SceneStructured>(() => ({
    locationName: scene.structured?.locationName ?? '',
    timeOfDay: scene.timeOfDay ?? scene.structured?.timeOfDay ?? '',
    weather: scene.weather ?? scene.structured?.weather ?? '',
    lighting: scene.structured?.lighting ?? '',
    presentCharacters: scene.structured?.presentCharacters ?? [],
    emotionalStates: scene.structured?.emotionalStates ?? [],
    cameraAngles: scene.structured?.cameraAngles ?? [],
    audioSfx: scene.structured?.audioSfx ?? [],
    moodKeywords: scene.structured?.moodKeywords ?? [],
  }));

  const persist = useDebouncedCallback((next: SceneStructured) => {
    void updateScene(scene.id, {
      structured: next,
      timeOfDay: next.timeOfDay || null,
      weather: next.weather || null,
    });
  }, 500);

  const set = <K extends keyof SceneStructured>(key: K, value: SceneStructured[K]) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      persist(next);
      return next;
    });
  };

  // Options are the project's real cast, plus any legacy free-text names that
  // were entered before this field was linked to the character DB — so older
  // scenes never silently lose a present character.
  const characterOptions: Option[] = React.useMemo(() => {
    const names = new Set(characters.map((c) => c.name));
    const legacy = (draft.presentCharacters ?? []).filter((n) => !names.has(n));
    return [
      ...characters.map((c) => ({ value: c.name, label: c.name })),
      ...legacy.map((n) => ({ value: n, label: `${n} (not in cast)` })),
    ];
  }, [characters, draft.presentCharacters]);

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-3xl space-y-6 px-8 py-6">
        <section className="grid grid-cols-2 gap-4">
          <Field label="Location">
            <Input
              value={draft.locationName ?? ''}
              placeholder="Abandoned chapel, east wing"
              onChange={(e) => set('locationName', e.target.value)}
            />
          </Field>
          <Field label="Lighting">
            <Input
              value={draft.lighting ?? ''}
              placeholder="moonlight through broken stained glass"
              onChange={(e) => set('lighting', e.target.value)}
            />
          </Field>
          <Field label="Time of day">
            <Input
              value={draft.timeOfDay ?? ''}
              placeholder="dusk"
              onChange={(e) => set('timeOfDay', e.target.value)}
            />
          </Field>
          <Field label="Weather">
            <Input
              value={draft.weather ?? ''}
              placeholder="heavy rain"
              onChange={(e) => set('weather', e.target.value)}
            />
          </Field>
        </section>

        <Separator />

        <Field label="Present characters" hint="Pick from this project's cast">
          <MultiSelect
            options={characterOptions}
            value={draft.presentCharacters ?? []}
            onChange={(v) => set('presentCharacters', v)}
            placeholder="Select characters…"
            emptyText="No characters yet — add them in the Characters view"
          />
        </Field>

        <Field label="Emotional states">
          <TagInput
            value={draft.emotionalStates ?? []}
            onChange={(v) => set('emotionalStates', v)}
            placeholder="dread, defiance…"
          />
        </Field>

        <Separator />

        <Field label="Camera angles">
          <TagInput
            value={draft.cameraAngles ?? []}
            onChange={(v) => set('cameraAngles', v)}
            placeholder="low angle, dutch tilt, close-up…"
          />
        </Field>

        <Field label="Audio / SFX">
          <TagInput
            value={draft.audioSfx ?? []}
            onChange={(v) => set('audioSfx', v)}
            placeholder="thunder, dripping water…"
          />
        </Field>

        <Field label="Mood keywords">
          <TagInput
            value={draft.moodKeywords ?? []}
            onChange={(v) => set('moodKeywords', v)}
            placeholder="oppressive, sacred, tense…"
          />
        </Field>
      </div>
    </ScrollArea>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}
