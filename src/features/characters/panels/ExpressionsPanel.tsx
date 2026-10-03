import { Plus, Smile, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useEntityDraft } from '@/hooks/useEntityDraft';
import { useCastStore } from '@/store/useCastStore';
import type { Character, Expression, PromptFragment } from '@/db/schema';

const QUICK = ['happy', 'smug', 'embarrassed', 'terrified', 'aroused', 'crying', 'enraged'];

export function ExpressionsPanel({ character }: { character: Character }) {
  const expressions = useCastStore((s) => s.expressions);
  const create = useCastStore((s) => s.createExpression);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Granular emotional states. Locked identity traits still apply — only the expression and
        pose change. Shared states (no owner) are reusable across the whole cast.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {QUICK.map((q) => (
          <Button key={q} variant="outline" size="sm" onClick={() => void create({ name: q })}>
            <Plus /> {q}
          </Button>
        ))}
      </div>

      {expressions.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          No expressions yet.
        </p>
      )}
      {expressions.map((e) => (
        <ExpressionCard key={e.id} expression={e} character={character} />
      ))}

      <Button variant="outline" size="sm" onClick={() => void create({ name: 'custom' })}>
        <Plus /> Add custom expression
      </Button>
    </div>
  );
}

function ExpressionCard({
  expression,
  character,
}: {
  expression: Expression;
  character: Character;
}) {
  const update = useCastStore((s) => s.updateExpression);
  const remove = useCastStore((s) => s.deleteExpression);
  const { draft, setField } = useEntityDraft<Expression>(expression, (patch) =>
    update(expression.id, patch),
  );

  const prompt = draft.promptFragment ?? {};
  const setPrompt = (patch: Partial<PromptFragment>) =>
    setField('promptFragment', { ...prompt, ...patch });
  const shared = draft.characterId == null;

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <Smile className="h-4 w-4 text-muted-foreground" />
        <Input
          value={draft.name}
          onChange={(e) => setField('name', e.target.value)}
          className="h-8 flex-1 font-medium"
        />
        <Input
          value={draft.category ?? ''}
          placeholder="category"
          onChange={(e) => setField('category', e.target.value)}
          className="h-8 w-32"
        />
        <Badge
          variant={shared ? 'secondary' : 'outline'}
          className="cursor-pointer select-none"
          title="Toggle shared / character-specific"
          onClick={() => setField('characterId', shared ? character.id : null)}
        >
          {shared ? 'Shared' : character.name}
        </Badge>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => void remove(expression.id)}
        >
          <Trash2 />
        </Button>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Intensity</Label>
          <span className="text-xs tabular-nums text-muted-foreground">{draft.intensity}</span>
        </div>
        <Slider
          value={[draft.intensity]}
          min={0}
          max={100}
          step={1}
          onValueChange={([v]) => setField('intensity', v)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Prompt (positive)</Label>
          <Textarea
            rows={2}
            value={prompt.positive ?? ''}
            placeholder="wide eyes, blushing, open mouth…"
            onChange={(e) => setPrompt({ positive: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Prompt (negative)</Label>
          <Textarea
            rows={2}
            value={prompt.negative ?? ''}
            placeholder="smiling, neutral…"
            onChange={(e) => setPrompt({ negative: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
