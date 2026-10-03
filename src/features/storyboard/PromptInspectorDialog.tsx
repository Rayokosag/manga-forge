import * as React from 'react';
import { ImageIcon, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { compilePrompt, type PromptSubject } from '@/ai/promptCompiler';
import { runPromptEnhance } from '@/agents/orchestrator';
import { outfitsRepo, expressionsRepo } from '@/db/repositories';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useCastStore } from '@/store/useCastStore';
import { useWorldStore } from '@/store/useWorldStore';
import { useAiStore } from '@/store/useAiStore';
import { useStoryboardStore } from '@/store/useStoryboardStore';
import type { Expression, LoraTag, Outfit, Panel } from '@/db/schema';

interface SubjectState {
  characterId: string;
  outfits: Outfit[];
  expressions: Expression[];
  outfitId: string | null;
  expressionId: string | null;
}

function initSize(panel: Panel): { width: number; height: number } {
  const r = panel.rect.width / panel.rect.height || 1;
  const round8 = (n: number) => Math.max(512, Math.round(n / 8) * 8);
  return r >= 1
    ? { width: 1024, height: round8(1024 / r) }
    : { width: round8(1024 * r), height: 1024 };
}

export function PromptInspectorDialog({
  panel,
  open,
  onOpenChange,
}: {
  panel: Panel;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const project = useWorkspaceStore((s) =>
    s.projects.find((p) => p.id === s.currentProjectId),
  );
  const scenes = useWorkspaceStore((s) => s.scenes);
  const characters = useCastStore((s) => s.characters);
  const entities = useWorldStore((s) => s.entities);
  const layers = useStoryboardStore((s) => s.layers);
  const updatePanel = useStoryboardStore((s) => s.updatePanel);

  const [subjects, setSubjects] = React.useState<SubjectState[]>([]);
  const [positive, setPositive] = React.useState('');
  const [negative, setNegative] = React.useState('');
  const [loras, setLoras] = React.useState<LoraTag[]>([]);
  const [size, setSize] = React.useState(() => initSize(panel));
  const [seed, setSeed] = React.useState<number | ''>('');
  const [status, setStatus] = React.useState<string>('');
  const [generating, setGenerating] = React.useState(false);
  const [enhancing, setEnhancing] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(panel.generatedImagePath ?? null);

  // Scene + location context for this panel.
  const scene = scenes.find((s) => s.id === panel.sceneId) ?? scenes[0];
  const location = scene?.locationId
    ? entities.find((e) => e.id === scene.locationId)
    : undefined;

  // Character layers on the panel define who is in frame.
  const panelCharIds = React.useMemo(
    () =>
      Array.from(
        new Set(
          layers
            .filter((l) => l.panelId === panel.id && l.type === 'character' && l.characterId)
            .map((l) => l.characterId as string),
        ),
      ),
    [layers, panel.id],
  );

  // Load outfits/expressions for each subject when the dialog opens.
  React.useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      const loaded = await Promise.all(
        panelCharIds.map(async (characterId) => {
          const [outfits, expressions] = await Promise.all([
            outfitsRepo.listOutfits(characterId),
            project ? expressionsRepo.listExpressions(project.id, characterId) : Promise.resolve([]),
          ]);
          return {
            characterId,
            outfits,
            expressions,
            outfitId: outfits.find((o) => o.isDefault)?.id ?? outfits[0]?.id ?? null,
            expressionId: null,
          } satisfies SubjectState;
        }),
      );
      if (active) setSubjects(loaded);
    })();
    return () => {
      active = false;
    };
  }, [open, panelCharIds, project]);

  const compile = React.useCallback(() => {
    if (!project) return;
    const built: PromptSubject[] = subjects
      .map((s): PromptSubject | null => {
        const character = characters.find((c) => c.id === s.characterId);
        if (!character) return null;
        return {
          character,
          outfit: s.outfits.find((o) => o.id === s.outfitId) ?? null,
          expression: s.expressions.find((e) => e.id === s.expressionId) ?? null,
        };
      })
      .filter((x): x is PromptSubject => x !== null);
    const result = compilePrompt({ project, panel, location, subjects: built });
    setPositive(result.positive);
    setNegative(result.negative);
    setLoras(result.loras);
  }, [project, subjects, characters, panel, location]);

  // Compile once subjects are ready / selections change.
  React.useEffect(() => {
    if (open) compile();
  }, [open, compile]);

  const enhance = async () => {
    setEnhancing(true);
    try {
      const adapter = useAiStore.getState().resolveLlm('prompt');
      const res = await runPromptEnhance(adapter, {
        positive,
        negative,
        style: project?.artStyle ?? undefined,
      });
      setPositive(res.positive);
      setNegative(res.negative);
      if (res.notes) toast.success('Prompt refined', { description: res.notes });
    } catch (err) {
      toast.error('Enhance failed', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setEnhancing(false);
    }
  };

  const generate = async () => {
    setGenerating(true);
    setStatus('Starting…');
    try {
      const adapter = useAiStore.getState().resolveImage();
      const result = await adapter.generate(
        {
          positive,
          negative,
          loras,
          seed: seed === '' ? undefined : Number(seed),
          width: size.width,
          height: size.height,
        },
        setStatus,
      );
      setPreview(result.imageUrl);
      setSeed(result.seed);
      await updatePanel(panel.id, {
        generatedImagePath: result.imageUrl,
        seed: result.seed,
        status: 'rendered',
        promptPositive: positive,
        promptNegative: negative,
        promptLoras: loras,
        promptPayload: { width: size.width, height: size.height, seed: result.seed },
      });
      toast.success('Panel rendered');
    } catch (err) {
      toast.error('Generation failed', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setGenerating(false);
      setStatus('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Prompt inspector</DialogTitle>
          <DialogDescription>
            Review and edit the compiled prompt before sending it to ComfyUI. Locked character
            traits are baked in; nothing is filtered.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[1fr_320px] gap-4">
          {/* left: prompt editing */}
          <ScrollArea className="max-h-[70vh] pr-3">
            <div className="space-y-4">
              {subjects.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs">Subjects in frame</Label>
                  {subjects.map((s, i) => {
                    const name = characters.find((c) => c.id === s.characterId)?.name ?? '?';
                    return (
                      <div key={s.characterId} className="grid grid-cols-[1fr_1fr_1fr] items-center gap-2">
                        <span className="truncate text-sm font-medium">{name}</span>
                        <Select
                          value={s.outfitId ?? 'none'}
                          onValueChange={(v) =>
                            setSubjects((prev) =>
                              prev.map((x, idx) => (idx === i ? { ...x, outfitId: v === 'none' ? null : v } : x)),
                            )
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Outfit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No outfit</SelectItem>
                            {s.outfits.map((o) => (
                              <SelectItem key={o.id} value={o.id}>
                                {o.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={s.expressionId ?? 'none'}
                          onValueChange={(v) =>
                            setSubjects((prev) =>
                              prev.map((x, idx) => (idx === i ? { ...x, expressionId: v === 'none' ? null : v } : x)),
                            )
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Expression" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Neutral</SelectItem>
                            {s.expressions.map((e) => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              )}
              {subjects.length === 0 && (
                <p className="rounded-md border border-dashed border-border p-2 text-xs text-muted-foreground">
                  No character layers on this panel — add one (and link a character) for full
                  identity prompting. Location &amp; style are still included.
                </p>
              )}

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={compile}>
                  <RefreshCw /> Recompile
                </Button>
                <Button variant="secondary" size="sm" disabled={enhancing} onClick={() => void enhance()}>
                  <Sparkles /> {enhancing ? 'Enhancing…' : 'Enhance (Prompt Agent)'}
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Positive</Label>
                <Textarea rows={5} value={positive} onChange={(e) => setPositive(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Negative</Label>
                <Textarea rows={3} value={negative} onChange={(e) => setNegative(e.target.value)} />
              </div>
              {loras.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {loras.map((l) => (
                    <Badge key={l.name} variant="secondary">
                      {l.name}:{l.weight}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* right: generation */}
          <div className="space-y-3">
            <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40">
              {preview ? (
                <img src={preview} alt="panel preview" className="h-full w-full object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-xs">No render yet</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Width</Label>
                <Input
                  type="number"
                  step={8}
                  className="h-8"
                  value={size.width}
                  onChange={(e) => setSize((s) => ({ ...s, width: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Height</Label>
                <Input
                  type="number"
                  step={8}
                  className="h-8"
                  value={size.height}
                  onChange={(e) => setSize((s) => ({ ...s, height: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Seed (blank = random)</Label>
              <Input
                type="number"
                className="h-8"
                value={seed}
                onChange={(e) => setSeed(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>

            <Button className="w-full" disabled={generating || !positive} onClick={() => void generate()}>
              <Wand2 /> {generating ? status || 'Generating…' : 'Generate panel'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Sends to the default ComfyUI connection.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
