import * as React from 'react';
import {
  ChevronRight,
  FilePlus2,
  FileText,
  FolderPlus,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PromptDialog } from '@/components/common/PromptDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ProjectSwitcher } from './ProjectSwitcher';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

type RenameTarget =
  | { kind: 'chapter'; id: string; value: string }
  | { kind: 'scene'; id: string; value: string };
type DeleteTarget =
  | { kind: 'chapter'; id: string; name: string }
  | { kind: 'scene'; id: string; name: string };

function RowMenu({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Sidebar() {
  const chapters = useWorkspaceStore((s) => s.chapters);
  const scenes = useWorkspaceStore((s) => s.scenes);
  const currentProjectId = useWorkspaceStore((s) => s.currentProjectId);
  const currentChapterId = useWorkspaceStore((s) => s.currentChapterId);
  const currentSceneId = useWorkspaceStore((s) => s.currentSceneId);

  const selectChapter = useWorkspaceStore((s) => s.selectChapter);
  const selectScene = useWorkspaceStore((s) => s.selectScene);
  const createChapter = useWorkspaceStore((s) => s.createChapter);
  const createScene = useWorkspaceStore((s) => s.createScene);
  const updateChapter = useWorkspaceStore((s) => s.updateChapter);
  const updateScene = useWorkspaceStore((s) => s.updateScene);
  const deleteChapter = useWorkspaceStore((s) => s.deleteChapter);
  const deleteScene = useWorkspaceStore((s) => s.deleteScene);

  const [rename, setRename] = React.useState<RenameTarget | null>(null);
  const [del, setDel] = React.useState<DeleteTarget | null>(null);

  return (
    <aside className="flex h-full w-72 flex-col border-r border-border bg-card/40">
      <ProjectSwitcher />

      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Chapters
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          title="New chapter"
          disabled={!currentProjectId}
          onClick={() => void createChapter()}
        >
          <FolderPlus />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-6">
          {!currentProjectId && (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              Create a project to begin.
            </p>
          )}

          {currentProjectId && chapters.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              No chapters yet. Add one with the folder icon above.
            </p>
          )}

          {chapters.map((chapter) => {
            const active = chapter.id === currentChapterId;
            return (
              <div key={chapter.id} className="mb-0.5">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => void selectChapter(chapter.id)}
                  onKeyDown={(e) => e.key === 'Enter' && void selectChapter(chapter.id)}
                  className={cn(
                    'group flex items-center gap-1 rounded-md px-1.5 py-1.5 text-sm',
                    active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
                  )}
                >
                  <ChevronRight
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
                      active && 'rotate-90',
                    )}
                  />
                  <span className="flex-1 truncate font-medium">{chapter.title}</span>
                  <RowMenu>
                    <DropdownMenuItem onSelect={() => void createScene()}>
                      <FilePlus2 /> New scene
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        setRename({ kind: 'chapter', id: chapter.id, value: chapter.title })
                      }
                    >
                      <Pencil /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() =>
                        setDel({ kind: 'chapter', id: chapter.id, name: chapter.title })
                      }
                    >
                      <Trash2 /> Delete chapter
                    </DropdownMenuItem>
                  </RowMenu>
                </div>

                {active && (
                  <div className="ml-4 mt-0.5 border-l border-border pl-2">
                    {scenes.length === 0 && (
                      <button
                        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent/50"
                        onClick={() => void createScene()}
                      >
                        <FilePlus2 className="h-3.5 w-3.5" /> Add the first scene
                      </button>
                    )}
                    {scenes.map((scene) => {
                      const sceneActive = scene.id === currentSceneId;
                      return (
                        <div
                          key={scene.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => selectScene(scene.id)}
                          onKeyDown={(e) => e.key === 'Enter' && selectScene(scene.id)}
                          className={cn(
                            'group flex items-center gap-1.5 rounded-md px-2 py-1 text-sm',
                            sceneActive
                              ? 'bg-primary/15 text-foreground'
                              : 'text-muted-foreground hover:bg-accent/50',
                          )}
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="flex-1 truncate">{scene.title}</span>
                          <RowMenu>
                            <DropdownMenuItem
                              onSelect={() =>
                                setRename({ kind: 'scene', id: scene.id, value: scene.title })
                              }
                            >
                              <Pencil /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() =>
                                setDel({ kind: 'scene', id: scene.id, name: scene.title })
                              }
                            >
                              <Trash2 /> Delete scene
                            </DropdownMenuItem>
                          </RowMenu>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Rename */}
      <PromptDialog
        open={!!rename}
        onOpenChange={(o) => !o && setRename(null)}
        title={rename?.kind === 'chapter' ? 'Rename chapter' : 'Rename scene'}
        label="Title"
        initialValue={rename?.value ?? ''}
        onSubmit={(value) => {
          if (!rename) return;
          if (rename.kind === 'chapter') void updateChapter(rename.id, { title: value });
          else void updateScene(rename.id, { title: value });
        }}
      />

      {/* Delete */}
      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        destructive
        title={`Delete “${del?.name}”?`}
        description={
          del?.kind === 'chapter'
            ? 'All scenes in this chapter will be deleted too.'
            : 'This scene and its storyboard panels will be deleted.'
        }
        confirmText="Delete"
        onConfirm={() => {
          if (!del) return;
          if (del.kind === 'chapter') void deleteChapter(del.id);
          else void deleteScene(del.id);
        }}
      />
    </aside>
  );
}
