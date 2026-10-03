import * as React from 'react';
import { AlertTriangle, Info, OctagonAlert, ScanText, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAiStore } from '@/store/useAiStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useCastStore } from '@/store/useCastStore';
import { useStoryboardStore } from '@/store/useStoryboardStore';
import { useUiStore } from '@/store/useUiStore';

const SEVERITY = {
  info: { icon: Info, cls: 'text-sky-500' },
  warning: { icon: AlertTriangle, cls: 'text-amber-500' },
  error: { icon: OctagonAlert, cls: 'text-red-500' },
} as const;

export function AgentConsole() {
  const scenes = useWorkspaceStore((s) => s.scenes);
  const currentSceneId = useWorkspaceStore((s) => s.currentSceneId);

  const busy = useAiStore((s) => s.busy);
  const storyResult = useAiStore((s) => s.storyResult);
  const continuityResult = useAiStore((s) => s.continuityResult);
  const runStory = useAiStore((s) => s.runStory);
  const runContinuity = useAiStore((s) => s.runContinuity);
  const applyStoryBeats = useAiStore((s) => s.applyStoryBeats);
  const characters = useCastStore((s) => s.characters);
  const createPageFromBeats = useStoryboardStore((s) => s.createPageFromBeats);
  const setView = useUiStore((s) => s.setView);

  const [sceneId, setSceneId] = React.useState<string>(currentSceneId ?? '');
  React.useEffect(() => {
    if (!sceneId && currentSceneId) setSceneId(currentSceneId);
  }, [currentSceneId, sceneId]);

  const scene = scenes.find((s) => s.id === sceneId);

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 p-6">
      <div>
        <h3 className="text-sm font-semibold">Agents</h3>
        <p className="text-xs text-muted-foreground">
          Specialized agents run in the background and never overwrite your prose — results are
          suggestions you choose to apply.
        </p>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs">Scene (from the active chapter)</Label>
          <Select value={sceneId} onValueChange={setSceneId}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Pick a scene" />
            </SelectTrigger>
            <SelectContent>
              {scenes.length === 0 && (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No scenes in the active chapter
                </div>
              )}
              {scenes.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button disabled={!scene || busy.story} onClick={() => scene && void runStory(scene)}>
          <ScanText /> {busy.story ? 'Parsing…' : 'Parse scene'}
        </Button>
        <Button
          variant="secondary"
          disabled={!scene || busy.continuity}
          onClick={() => scene && void runContinuity(scene)}
        >
          <Wand2 /> {busy.continuity ? 'Checking…' : 'Check continuity'}
        </Button>
      </div>

      <Separator />

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-6 pr-3">
          {/* Story Agent output */}
          {storyResult && storyResult.sceneId === sceneId && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-primary" /> Parsed beats ({storyResult.beats.length})
                </h4>
                {storyResult.beats.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void applyStoryBeats(sceneId, storyResult.beats)}
                    >
                      Save to scene
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        if (!scene) return;
                        await createPageFromBeats(
                          scene.chapterId,
                          scene.id,
                          storyResult.beats,
                          characters,
                        );
                        setView('storyboard');
                      }}
                    >
                      Create storyboard page
                    </Button>
                  </div>
                )}
              </div>
              <ol className="space-y-1.5">
                {storyResult.beats.map((b, i) => (
                  <li key={i} className="rounded-md border border-border p-2.5 text-sm">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">#{i + 1}</span>
                      {b.characterRef && <span>· {b.characterRef}</span>}
                      {b.cameraHint && <span>· {b.cameraHint}</span>}
                    </div>
                    {b.action && <p className="mt-0.5">{b.action}</p>}
                    {b.dialogue && <p className="mt-0.5 italic text-muted-foreground">“{b.dialogue}”</p>}
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {b.expression && <span>😐 {b.expression}</span>}
                      {b.props?.length ? <span>🎒 {b.props.join(', ')}</span> : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Continuity Agent output */}
          {continuityResult && continuityResult.sceneId === sceneId && (
            <section className="space-y-2">
              <h4 className="text-sm font-medium">Continuity ({continuityResult.flags.length})</h4>
              {continuityResult.flags.length === 0 && (
                <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  No contradictions found against the current character/world/timeline facts.
                </p>
              )}
              {continuityResult.flags.map((f, i) => {
                const S = SEVERITY[f.severity] ?? SEVERITY.info;
                return (
                  <div key={i} className="flex gap-2 rounded-md border border-border p-2.5 text-sm">
                    <S.icon className={cn('mt-0.5 h-4 w-4 shrink-0', S.cls)} />
                    <div>
                      <p className="font-medium">{f.summary}</p>
                      {f.detail && <p className="text-xs text-muted-foreground">{f.detail}</p>}
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {!storyResult && !continuityResult && (
            <p className="text-sm text-muted-foreground">
              Pick a scene and run an agent. Make sure a text model connection (e.g. Ollama) is
              enabled under the Connections tab.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
