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
  const sceneCharacters = useWorkspaceStore((s) => s.sceneCharacters);
  const loadSceneCharacters = useWorkspaceStore((s) => s.loadSceneCharacters);
  const setSceneCharacterIds = useWorkspaceStore((s) => s.setSceneCharacterIds);
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

  // Present characters are now stored relationally in the scene_characters join
  // table (stable character IDs), not as free-text names. Options are the cast.
  const characterOptions: Option[] = React.useMemo(
    () => characters.map((c) => ({ value: c.id, label: c.name })),
    [characters],
  );
  const selectedIds = React.useMemo(
    () => sceneCharacters.map((sc) => sc.characterId),
    [sceneCharacters],
  );

  // Load this scene's join rows, migrating any legacy name-based list once.
  const migratedFor = React.useRef<string | null>(null);
  React.useEffect(() => {
    void loadSceneCharacters(scene.id);
    migratedFor.current = null;
  }, [scene.id, loadSceneCharacters]);

  React.useEffect(() => {
    // One-shot: if the join table is empty but legacy names exist, resolve them
    // to cast IDs and seed the join table, then drop the stale name list.
    if (migratedFor.current === scene.id) return;
    const legacyNames = scene.structured?.presentCharacters ?? [];
    if (sceneCharacters.length > 0 || legacyNames.length === 0 || characters.length === 0) return;
    const byName = new Map(characters.map((c) => [c.name, c.id]));
    const matched = legacyNames.filter((n) => byName.has(n));
    const ids = matched.map((n) => byName.get(n) as string);
    migratedFor.current = scene.id;
    if (ids.length) void setSceneCharacterIds(scene.id, ids);
    // Keep the name-mirror consistent with what we could resolve.
    set('presentCharacters', matched);
  }, [scene.id, scene.structured?.presentCharacters, sceneCharacters, characters, setSceneCharacterIds]);

  const changeCharacters = (ids: string[]) => {
    void setSceneCharacterIds(scene.id, ids);
    // Mirror names into the JSON so exports/snapshots stay human-readable.
    const byId = new Map(characters.map((c) => [c.id, c.name]));
    set(
      'presentCharacters',
      ids.map((id) => byId.get(id)).filter((n): n is string => Boolean(n)),
    );
  };

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
            value={selectedIds}
            onChange={changeCharacters}
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
