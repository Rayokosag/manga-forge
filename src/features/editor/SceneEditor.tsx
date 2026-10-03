import * as React from 'react';
import { AlignLeft, Focus, LayoutList } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { SCENE_MODES, type Scene } from '@/db/schema';
import { SimpleEditor } from './SimpleEditor';
import { AdvancedEditor } from './AdvancedEditor';

export function SceneEditor({ scene }: { scene: Scene }) {
  const updateScene = useWorkspaceStore((s) => s.updateScene);
  const focusMode = useWorkspaceStore((s) => s.focusMode);
  const toggleFocusMode = useWorkspaceStore((s) => s.toggleFocusMode);

  const [title, setTitle] = React.useState(scene.title);
  const persistTitle = useDebouncedCallback(
    (v: string) => void updateScene(scene.id, { title: v.trim() || 'Untitled Scene' }),
    500,
  );

  const mode = (SCENE_MODES as readonly string[]).includes(scene.mode) ? scene.mode : 'simple';

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border px-6 py-2.5">
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            persistTitle(e.target.value);
          }}
          className="h-8 max-w-sm border-0 px-0 text-base font-semibold shadow-none focus-visible:ring-0"
          placeholder="Scene title"
        />
        <div className="ml-auto flex items-center gap-2">
          <Tabs
            value={mode}
            onValueChange={(v) => void updateScene(scene.id, { mode: v as Scene['mode'] })}
          >
            <TabsList className="h-8">
              <TabsTrigger value="simple">
                <AlignLeft /> Simple
              </TabsTrigger>
              <TabsTrigger value="advanced">
                <LayoutList /> Advanced
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant={focusMode ? 'secondary' : 'ghost'}
            size="icon-sm"
            title="Toggle focus mode"
            onClick={toggleFocusMode}
          >
            <Focus />
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        {mode === 'simple' ? <SimpleEditor scene={scene} /> : <AdvancedEditor scene={scene} />}
      </div>
    </div>
  );
}
