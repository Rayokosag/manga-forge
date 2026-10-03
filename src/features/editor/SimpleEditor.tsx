import * as React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import type { Scene } from '@/db/schema';

/** Focus-mode markdown prose writer. The raw text is the source of truth. */
export function SimpleEditor({ scene }: { scene: Scene }) {
  const updateScene = useWorkspaceStore((s) => s.updateScene);
  const [text, setText] = React.useState(scene.proseContent);

  const persist = useDebouncedCallback(
    (value: string) => void updateScene(scene.id, { proseContent: value }),
    600,
  );

  const words = React.useMemo(() => {
    const t = text.trim();
    return t ? t.split(/\s+/).length : 0;
  }, [text]);

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-8 py-6">
        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            persist(e.target.value);
          }}
          placeholder="Write the scene in prose. Markdown is welcome. The parser reads this later without ever changing it…"
          spellCheck
          className="flex-1 resize-none border-0 bg-transparent px-0 text-[15px] leading-relaxed shadow-none focus-visible:ring-0"
        />
      </div>
      <div className="flex justify-end border-t border-border px-6 py-1.5 text-xs text-muted-foreground">
        {words} {words === 1 ? 'word' : 'words'} · {text.length} chars
      </div>
    </div>
  );
}
