import * as React from 'react';
import { LayoutPanelLeft, PlusSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageList } from './PageList';
import { PanelCanvas } from './PanelCanvas';
import { PageInspector } from './inspector/PageInspector';
import { PanelInspector } from './inspector/PanelInspector';
import { LayerInspector } from './inspector/LayerInspector';
import { useStoryboardStore } from '@/store/useStoryboardStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export function StoryboardView() {
  const hasProject = useWorkspaceStore((s) => !!s.currentProjectId);
  const currentChapterId = useWorkspaceStore((s) => s.currentChapterId);
  const chapters = useWorkspaceStore((s) => s.chapters);

  const loadForChapter = useStoryboardStore((s) => s.loadForChapter);
  const pages = useStoryboardStore((s) => s.pages);
  const currentPageId = useStoryboardStore((s) => s.currentPageId);
  const panels = useStoryboardStore((s) => s.panels);
  const layers = useStoryboardStore((s) => s.layers);
  const selection = useStoryboardStore((s) => s.selection);
  const createPage = useStoryboardStore((s) => s.createPage);
  const createPanel = useStoryboardStore((s) => s.createPanel);

  // The storyboard follows the active chapter from the Story workspace.
  React.useEffect(() => {
    void loadForChapter(currentChapterId);
  }, [currentChapterId, loadForChapter]);

  const page = pages.find((p) => p.id === currentPageId);
  const selectedPanel =
    selection?.kind === 'panel' ? panels.find((p) => p.id === selection.id) : undefined;
  const selectedLayer =
    selection?.kind === 'layer' ? layers.find((l) => l.id === selection.id) : undefined;

  if (!hasProject || !currentChapterId) {
    return (
      <Placeholder
        text={
          !hasProject
            ? 'Create or open a project, then pick a chapter in the Story tab.'
            : 'Select a chapter in the Story tab to storyboard it.'
        }
      />
    );
  }

  const chapterTitle = chapters.find((c) => c.id === currentChapterId)?.title;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-border px-4 py-2">
        <h2 className="truncate text-sm font-semibold">
          Storyboard{chapterTitle ? ` · ${chapterTitle}` : ''}
        </h2>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!page}
            onClick={() => void createPanel()}
          >
            <PlusSquare /> Add panel
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <PageList />

        <main className="min-w-0 flex-1">
          {page ? (
            <PanelCanvas key={page.id} page={page} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <LayoutPanelLeft className="h-10 w-10" />
              <p className="max-w-xs text-sm">This chapter has no pages yet.</p>
              <Button variant="outline" size="sm" onClick={() => void createPage()}>
                <PlusSquare /> Create first page
              </Button>
            </div>
          )}
        </main>

        <aside className="w-80 shrink-0 border-l border-border bg-card/40">
          {selectedPanel ? (
            <PanelInspector key={selectedPanel.id} panel={selectedPanel} />
          ) : selectedLayer ? (
            <LayerInspector key={selectedLayer.id} layer={selectedLayer} />
          ) : page ? (
            <PageInspector key={page.id} page={page} />
          ) : (
            <div className="p-4 text-sm text-muted-foreground">Create a page to begin.</div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
      <LayoutPanelLeft className="h-10 w-10" />
      <p className="max-w-xs text-sm">{text}</p>
    </div>
  );
}
