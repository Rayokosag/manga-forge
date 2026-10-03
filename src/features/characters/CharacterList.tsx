import * as React from 'react';
import { MoreVertical, Pencil, Trash2, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useCastStore } from '@/store/useCastStore';

export function CharacterList() {
  const characters = useCastStore((s) => s.characters);
  const currentId = useCastStore((s) => s.currentCharacterId);
  const select = useCastStore((s) => s.selectCharacter);
  const create = useCastStore((s) => s.createCharacter);
  const update = useCastStore((s) => s.updateCharacter);
  const remove = useCastStore((s) => s.deleteCharacter);

  const [query, setQuery] = React.useState('');
  const [rename, setRename] = React.useState<{ id: string; value: string } | null>(null);
  const [del, setDel] = React.useState<{ id: string; name: string } | null>(null);

  const filtered = characters.filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card/40">
      <div className="flex items-center gap-2 p-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cast…"
          className="h-8"
        />
        <Button variant="ghost" size="icon-sm" title="New character" onClick={() => void create()}>
          <UserPlus />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-6">
          {characters.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              No characters yet. Add one with the person icon above.
            </p>
          )}
          {filtered.map((c) => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => void select(c.id)}
              onKeyDown={(e) => e.key === 'Enter' && void select(c.id)}
              className={cn(
                'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                c.id === currentId ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
              )}
            >
              <span
                className="h-6 w-6 shrink-0 rounded-full border border-border"
                style={{ background: c.colorHex ?? 'hsl(var(--muted))' }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{c.name}</div>
                {c.role && <div className="truncate text-xs text-muted-foreground">{c.role}</div>}
              </div>
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
                  <DropdownMenuItem onSelect={() => setRename({ id: c.id, value: c.name })}>
                    <Pencil /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => setDel({ id: c.id, name: c.name })}
                  >
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>

      <PromptDialog
        open={!!rename}
        onOpenChange={(o) => !o && setRename(null)}
        title="Rename character"
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
        description="Outfits, expressions, and relationships for this character are removed too."
        confirmText="Delete"
        onConfirm={() => {
          if (del) void remove(del.id);
        }}
      />
    </aside>
  );
}
