import { FolderOpen, ImageOff, Plus, Trash2 } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/sonner';
import { useEntityDraft } from '@/hooks/useEntityDraft';
import { useCastStore } from '@/store/useCastStore';
import type { Character, LoraTag } from '@/db/schema';

export function PromptPanel({ character }: { character: Character }) {
  const update = useCastStore((s) => s.updateCharacter);
  const { draft, setField } = useEntityDraft<Character>(character, (patch) =>
    update(character.id, patch),
  );

  const loras = draft.loraTags ?? [];
  const setLoras = (next: LoraTag[]) => setField('loraTags', next);
  const images = draft.referenceImages ?? [];
  const setImages = (next: string[]) => setField('referenceImages', next);

  const browse = async () => {
    try {
      const picked = await open({
        multiple: true,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
      });
      if (!picked) return;
      const paths = Array.isArray(picked) ? picked : [picked];
      setImages([...images, ...paths.filter((p) => !images.includes(p))]);
    } catch (err) {
      toast.error('File picker failed', {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        The identity prompt is merged into every panel this character appears in, together with
        locked traits, the active outfit, and the scene's expression.
      </p>

      <div className="space-y-1.5">
        <Label>Base identity prompt (positive)</Label>
        <Textarea
          rows={3}
          value={draft.basePrompt ?? ''}
          placeholder="1girl, silver hair, violet eyes, slender, pale skin…"
          onChange={(e) => setField('basePrompt', e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Negative prompt</Label>
        <Textarea
          rows={2}
          value={draft.negativePrompt ?? ''}
          placeholder="bad anatomy, extra fingers, inconsistent eye color…"
          onChange={(e) => setField('negativePrompt', e.target.value)}
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>LoRA tags</Label>
        {loras.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={l.name}
              placeholder="lora filename"
              onChange={(e) =>
                setLoras(loras.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))
              }
            />
            <Input
              type="number"
              step={0.05}
              value={l.weight}
              className="w-24"
              onChange={(e) =>
                setLoras(
                  loras.map((x, idx) =>
                    idx === i ? { ...x, weight: Number(e.target.value) } : x,
                  ),
                )
              }
            />
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setLoras(loras.filter((_, idx) => idx !== i))}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLoras([...loras, { name: '', weight: 0.8 }])}
        >
          <Plus /> Add LoRA
        </Button>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Reference images</Label>
          <Button variant="outline" size="sm" onClick={() => void browse()}>
            <FolderOpen /> Browse…
          </Button>
        </div>
        {images.length === 0 && (
          <p className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
            <ImageOff className="h-4 w-4" /> No reference images linked.
          </p>
        )}
        {images.map((path, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={path}
              onChange={(e) =>
                setImages(images.map((p, idx) => (idx === i ? e.target.value : p)))
              }
            />
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setImages(images.filter((_, idx) => idx !== i))}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
