import * as React from 'react';
import { FilePlus2, MoreVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useStoryboardStore } from '@/store/useStoryboardStore';

export function PageList() {
  const pages = useStoryboardStore((s) => s.pages);
  const currentPageId = useStoryboardStore((s) => s.currentPageId);
  const selectPage = useStoryboardStore((s) => s.selectPage);
  const createPage = useStoryboardStore((s) => s.createPage);
  const deletePage = useStoryboardStore((s) => s.deletePage);

  const [del, setDel] = React.useState<string | null>(null);

  return (
    <aside className="flex h-full w-44 flex-col border-r border-border bg-card/40">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pages
        </span>
        <Button variant="ghost" size="icon-sm" title="New page" onClick={() => void createPage()}>
          <FilePlus2 />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1 px-2 pb-6">
          {pages.length === 0 && (
            <p className="px-2 py-8 text-center text-xs text-muted-foreground">
              No pages yet.
            </p>
          )}
          {pages.map((p, i) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => void selectPage(p.id)}
              onKeyDown={(e) => e.key === 'Enter' && void selectPage(p.id)}
              className={cn(
                'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                p.id === currentPageId ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
              )}
            >
              <span className="flex-1 truncate">Page {i + 1}</span>
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
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => setDel(p.id)}
                  >
                    <Trash2 /> Delete page
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>

      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        destructive
        title="Delete this page?"
        description="All panels and layers on the page are removed."
        confirmText="Delete"
        onConfirm={() => {
          if (del) void deletePage(del);
        }}
      />
    </aside>
  );
}
