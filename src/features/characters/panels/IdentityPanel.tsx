import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { TagInput } from '@/components/common/TagInput';
import { useEntityDraft } from '@/hooks/useEntityDraft';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useCastStore } from '@/store/useCastStore';
import type { Anatomy, Character } from '@/db/schema';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function IdentityPanel({ character }: { character: Character }) {
  const update = useCastStore((s) => s.updateCharacter);

  const { draft, setField } = useEntityDraft<Character>(character, (patch) =>
    update(character.id, patch),
  );

  // Anatomy is a nested JSON blob; commit the whole object on change.
  const [anatomy, setAnatomy] = React.useState<Anatomy>(character.anatomy ?? {});
  const commitAnatomy = useDebouncedCallback(
    (next: Anatomy) => void update(character.id, { anatomy: next }),
    500,
  );
  const setAnat = <K extends keyof Anatomy>(key: K, value: Anatomy[K]) => {
    setAnatomy((prev) => {
      const next = { ...prev, [key]: value };
      commitAnatomy(next);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4">
        <Field label="Role">
          <Input
            value={draft.role ?? ''}
            placeholder="protagonist, rival…"
            onChange={(e) => setField('role', e.target.value)}
          />
        </Field>
        <Field label="Accent color">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={draft.colorHex ?? '#8b5cf6'}
              onChange={(e) => setField('colorHex', e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent"
            />
            <Input
              value={draft.colorHex ?? ''}
              placeholder="#8b5cf6"
              onChange={(e) => setField('colorHex', e.target.value)}
            />
          </div>
        </Field>
        <Field label="Age">
          <Input
            value={draft.age ?? ''}
            placeholder='17 / "looks 20"'
            onChange={(e) => setField('age', e.target.value)}
          />
        </Field>
        <Field label="Gender">
          <Input
            value={draft.gender ?? ''}
            onChange={(e) => setField('gender', e.target.value)}
          />
        </Field>
        <Field label="Species / race">
          <Input
            value={draft.species ?? ''}
            placeholder="human, elf, android…"
            onChange={(e) => setField('species', e.target.value)}
          />
        </Field>
        <Field label="Aliases">
          <TagInput
            value={draft.aliases ?? []}
            onChange={(v) => setField('aliases', v)}
            placeholder="nicknames, titles…"
          />
        </Field>
      </section>

      <Field label="Biography">
        <Textarea
          rows={4}
          value={draft.bio ?? ''}
          placeholder="Backstory, motivations, voice…"
          onChange={(e) => setField('bio', e.target.value)}
        />
      </Field>

      <Separator />
      <h3 className="text-sm font-semibold text-muted-foreground">Anatomy & physicality</h3>

      <section className="grid grid-cols-3 gap-4">
        <Field label="Height (cm)">
          <Input
            type="number"
            value={anatomy.heightCm ?? ''}
            onChange={(e) =>
              setAnat('heightCm', e.target.value ? Number(e.target.value) : undefined)
            }
          />
        </Field>
        <Field label="Build">
          <Input
            value={anatomy.build ?? ''}
            placeholder="athletic, petite…"
            onChange={(e) => setAnat('build', e.target.value)}
          />
        </Field>
        <Field label="Body proportions">
          <Input
            value={anatomy.bodyProportions ?? ''}
            placeholder="long-limbed…"
            onChange={(e) => setAnat('bodyProportions', e.target.value)}
          />
        </Field>
        <Field label="Face shape">
          <Input
            value={anatomy.faceShape ?? ''}
            onChange={(e) => setAnat('faceShape', e.target.value)}
          />
        </Field>
        <Field label="Eye shape">
          <Input
            value={anatomy.eyeShape ?? ''}
            onChange={(e) => setAnat('eyeShape', e.target.value)}
          />
        </Field>
        <Field label="Eye color">
          <Input
            value={anatomy.eyeColor ?? ''}
            onChange={(e) => setAnat('eyeColor', e.target.value)}
          />
        </Field>
        <Field label="Skin tone">
          <Input
            value={anatomy.skinTone ?? ''}
            onChange={(e) => setAnat('skinTone', e.target.value)}
          />
        </Field>
        <Field label="Hair style">
          <Input
            value={anatomy.hairStyle ?? ''}
            onChange={(e) => setAnat('hairStyle', e.target.value)}
          />
        </Field>
        <Field label="Hair color">
          <Input
            value={anatomy.hairColor ?? ''}
            onChange={(e) => setAnat('hairColor', e.target.value)}
          />
        </Field>
      </section>

      <Field label="Distinguishing features">
        <TagInput
          value={anatomy.features ?? []}
          onChange={(v) => setAnat('features', v)}
          placeholder="horns, tattoos, cybernetic arm…"
        />
      </Field>
      <Field label="Scars & marks">
        <TagInput
          value={anatomy.scars ?? []}
          onChange={(v) => setAnat('scars', v)}
          placeholder="scar across left eye…"
        />
      </Field>
    </div>
  );
}
