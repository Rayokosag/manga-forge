import * as React from 'react';
import { ChevronRight, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
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
import { useWorldStore } from '@/store/useWorldStore';
import type { WorldEntity } from '@/db/schema';
import { ENTITY_ICON } from './entityMeta';

export function WorldTree() {
  const entities = useWorldStore((s) => s.entities);
  const currentId = useWorldStore((s) => s.currentEntityId);
  const select = useWorldStore((s) => s.selectEntity);
  const create = useWorldStore((s) => s.createEntity);
  const update = useWorldStore((s) => s.updateEntity);
  const remove = useWorldStore((s) => s.deleteEntity);

  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [rename, setRename] = React.useState<{ id: string; value: string } | null>(null);
  const [del, setDel] = React.useState<{ id: string; name: string } | null>(null);

  // Group by parent for recursive rendering.
  const childrenOf = React.useMemo(() => {
    const map = new Map<string | null, WorldEntity[]>();
    for (const e of entities) {
      const key = e.parentId ?? null;
      (map.get(key) ?? map.set(key, []).get(key)!).push(e);
    }
    return map;
  }, [entities]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const renderNode = (entity: WorldEntity, depth: number): React.ReactNode => {
    const kids = childrenOf.get(entity.id) ?? [];
    const isOpen = expanded.has(entity.id);
    const Icon = ENTITY_ICON[entity.type];
    const active = entity.id === currentId;

    return (
      <div key={entity.id}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => select(entity.id)}
          onKeyDown={(e) => e.key === 'Enter' && select(entity.id)}
          style={{ paddingLeft: depth * 14 + 6 }}
          className={cn(
            'group flex items-center gap-1 rounded-md py-1.5 pr-1 text-sm',
            active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
          )}
        >
          {kids.length > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggle(entity.id);
              }}
              className="shrink-0 text-muted-foreground"
            >
              <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-90')} />
            </button>
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate">{entity.name}</span>
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
                onSelect={() => {
                  setExpanded((p) => new Set(p).add(entity.id));
                  void create({ parentId: entity.id, type: entity.type });
                }}
              >
                <Plus /> Add child
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setRename({ id: entity.id, value: entity.name })}>
                <Pencil /> Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setDel({ id: entity.id, name: entity.name })}
              >
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {isOpen && kids.map((k) => renderNode(k, depth + 1))}
      </div>
    );
  };

  const roots = childrenOf.get(null) ?? [];

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card/40">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          World
        </span>
        <Button variant="ghost" size="icon-sm" title="New top-level entity" onClick={() => void create()}>
          <Plus />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-2 pb-6">
          {entities.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              No world entities yet. Countries, cities, rooms, factions, magic systems — build
              the setting here.
            </p>
          )}
          {roots.map((r) => renderNode(r, 0))}
        </div>
      </ScrollArea>

      <PromptDialog
        open={!!rename}
        onOpenChange={(o) => !o && setRename(null)}
        title="Rename entity"
        label="Name"
        initialValue={rename?.value ?? ''}
        onSubmit={(value) => {
          if (rename) void update(rename.id, { name: value });
        }}
      />
      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        destructive
        title={`Delete “${del?.name}”?`}
        description="Child entities are moved up to this entity's parent (not deleted)."
        confirmText="Delete"
        onConfirm={() => {
          if (del) void remove(del.id);
        }}
      />
    </aside>
  );
}
