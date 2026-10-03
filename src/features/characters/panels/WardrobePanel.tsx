import { Plus, Shirt, Star, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEntityDraft } from '@/hooks/useEntityDraft';
import { useCastStore } from '@/store/useCastStore';
import { OUTFIT_CATEGORIES, type Outfit, type PromptFragment } from '@/db/schema';

export function WardrobePanel() {
  const outfits = useCastStore((s) => s.outfits);
  const create = useCastStore((s) => s.createOutfit);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Configure outfits per situation. The active outfit is selected per scene and merged into
        the panel prompt alongside the character's locked traits.
      </p>
      {outfits.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          No outfits yet.
        </p>
      )}
      {outfits.map((o) => (
        <OutfitCard key={o.id} outfit={o} />
      ))}
      <Button variant="outline" size="sm" onClick={() => void create()}>
        <Plus /> Add outfit
      </Button>
    </div>
  );
}

function OutfitCard({ outfit }: { outfit: Outfit }) {
  const update = useCastStore((s) => s.updateOutfit);
  const remove = useCastStore((s) => s.deleteOutfit);
  const { draft, setField } = useEntityDraft<Outfit>(outfit, (patch) =>
    update(outfit.id, patch),
  );

  const prompt = draft.promptFragment ?? {};
  const setPrompt = (patch: Partial<PromptFragment>) =>
    setField('promptFragment', { ...prompt, ...patch });

  return (
    <div
      className={cn(
        'space-y-3 rounded-lg border p-3',
        draft.isDefault ? 'border-primary/40 bg-primary/5' : 'border-border',
      )}
    >
      <div className="flex items-center gap-2">
        <Shirt className="h-4 w-4 text-muted-foreground" />
        <Input
          value={draft.name}
          onChange={(e) => setField('name', e.target.value)}
          className="h-8 flex-1 font-medium"
        />
        <Select
          value={draft.category}
          onValueChange={(v) => setField('category', v as Outfit['category'])}
        >
          <SelectTrigger className="h-8 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OUTFIT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon-sm"
          title={draft.isDefault ? 'Default outfit' : 'Set as default'}
          className={draft.isDefault ? 'text-primary' : 'text-muted-foreground'}
          onClick={() => setField('isDefault', !draft.isDefault)}
        >
          <Star className={draft.isDefault ? 'fill-current' : undefined} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => void remove(outfit.id)}
        >
          <Trash2 />
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Input
          value={draft.description ?? ''}
          placeholder="Pleated uniform, loosened tie, worn boots…"
          onChange={(e) => setField('description', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Prompt (positive)</Label>
          <Textarea
            rows={2}
            value={prompt.positive ?? ''}
            placeholder="school uniform, navy blazer…"
            onChange={(e) => setPrompt({ positive: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Prompt (negative)</Label>
          <Textarea
            rows={2}
            value={prompt.negative ?? ''}
            placeholder="casual clothes, armor…"
            onChange={(e) => setPrompt({ negative: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
