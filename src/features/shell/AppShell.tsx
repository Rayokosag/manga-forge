import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { ActivityRail } from './ActivityRail';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useCastStore } from '@/store/useCastStore';
import { useWorldStore } from '@/store/useWorldStore';
import { useAiStore } from '@/store/useAiStore';
import { useExportStore } from '@/store/useExportStore';
import { useUiStore } from '@/store/useUiStore';

// Views are code-split: Konva (storyboard/relationships) and the export libs
// (jsPDF/JSZip) stay out of the startup bundle and resident memory until opened.
const named = <K extends string>(p: Promise<Record<K, React.ComponentType>>, key: K) =>
  p.then((m) => ({ default: m[key] }));
const StoryView = React.lazy(() => named(import('@/features/workspace/Workspace'), 'StoryView'));
const CharactersView = React.lazy(() =>
  named(import('@/features/characters/CharactersView'), 'CharactersView'),
);
const RelationshipsView = React.lazy(() =>
  named(import('@/features/relationships/RelationshipsView'), 'RelationshipsView'),
);
const WorldView = React.lazy(() => named(import('@/features/world/WorldView'), 'WorldView'));
const StoryboardView = React.lazy(() =>
  named(import('@/features/storyboard/StoryboardView'), 'StoryboardView'),
);
const AiView = React.lazy(() => named(import('@/features/ai/AiView'), 'AiView'));
const ExportView = React.lazy(() => named(import('@/features/export/ExportView'), 'ExportView'));

function ViewFallback() {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

export function AppShell() {
  const ready = useWorkspaceStore((s) => s.ready);
  const dbError = useWorkspaceStore((s) => s.dbError);
  const init = useWorkspaceStore((s) => s.init);
  const focusMode = useWorkspaceStore((s) => s.focusMode);
  const currentProjectId = useWorkspaceStore((s) => s.currentProjectId);

  const loadCast = useCastStore((s) => s.load);
  const loadWorld = useWorldStore((s) => s.load);
  const loadAi = useAiStore((s) => s.load);
  const loadExport = useExportStore((s) => s.load);
  const activeView = useUiStore((s) => s.activeView);

  React.useEffect(() => {
    void init();
  }, [init]);

  // Keep project-scoped data stores in sync with the active project.
  React.useEffect(() => {
    void loadCast(currentProjectId);
    void loadWorld(currentProjectId);
    void loadAi(currentProjectId);
    void loadExport(currentProjectId);
  }, [currentProjectId, loadCast, loadWorld, loadAi, loadExport]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading workspace…
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="mx-auto flex h-screen max-w-md flex-col items-center justify-center gap-3 text-center">
        <h2 className="text-lg font-semibold text-destructive">Database unavailable</h2>
        <p className="text-sm text-muted-foreground">{dbError}</p>
        <p className="text-xs text-muted-foreground">
          The SQLite layer runs through the Tauri SQL plugin — launch with{' '}
          <code className="rounded bg-muted px-1 py-0.5">npm run app:dev</code>, not the
          browser-only <code className="rounded bg-muted px-1 py-0.5">npm run dev</code>.
        </p>
      </div>
    );
  }

  // Focus mode is a writing concept: collapse everything but the prose.
  if (focusMode && activeView === 'story') {
    return (
      <div className="h-screen">
        <React.Suspense fallback={<ViewFallback />}>
          <StoryView />
        </React.Suspense>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <ActivityRail />
      <div className="min-w-0 flex-1">
        <React.Suspense fallback={<ViewFallback />}>
          {activeView === 'story' && <StoryView />}
          {activeView === 'characters' && <CharactersView />}
          {activeView === 'relationships' && <RelationshipsView />}
          {activeView === 'world' && <WorldView />}
          {activeView === 'storyboard' && <StoryboardView />}
          {activeView === 'ai' && <AiView />}
          {activeView === 'export' && <ExportView />}
        </React.Suspense>
      </div>
    </div>
  );
}
