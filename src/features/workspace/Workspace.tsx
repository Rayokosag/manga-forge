import { BookOpenText, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sidebar } from './Sidebar';
import { SceneEditor } from '@/features/editor/SceneEditor';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

/** The "Story" workspace view: chapter/scene tree + dual-mode scene editor. */
export function StoryView() {
  const focusMode = useWorkspaceStore((s) => s.focusMode);
  const toggleFocusMode = useWorkspaceStore((s) => s.toggleFocusMode);
  const currentProjectId = useWorkspaceStore((s) => s.currentProjectId);
  const currentSceneId = useWorkspaceStore((s) => s.currentSceneId);
  const scenes = useWorkspaceStore((s) => s.scenes);
  const scene = scenes.find((s) => s.id === currentSceneId);

  return (
    <div className="flex h-full overflow-hidden">
      {!focusMode && <Sidebar />}

      <main className="relative flex min-w-0 flex-1 flex-col">
        {focusMode && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute left-2 top-2 z-10"
            title="Exit focus mode"
            onClick={toggleFocusMode}
          >
            <PanelLeftOpen />
          </Button>
        )}

        {scene ? (
          <SceneEditor key={scene.id} scene={scene} />
        ) : (
          <EmptyState hasProject={!!currentProjectId} />
        )}
      </main>
    </div>
  );
}

function EmptyState({ hasProject }: { hasProject: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
      <BookOpenText className="h-10 w-10" />
      <p className="max-w-xs text-sm">
        {hasProject
          ? 'Select a scene, or add a chapter and scene from the sidebar to start writing.'
          : 'Create a project from the switcher in the top-left to begin.'}
      </p>
    </div>
  );
}
