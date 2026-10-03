import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useCastStore } from '@/store/useCastStore';
import type { Character } from '@/db/schema';
import { IdentityPanel } from './panels/IdentityPanel';
import { TraitsPanel } from './panels/TraitsPanel';
import { WardrobePanel } from './panels/WardrobePanel';
import { ExpressionsPanel } from './panels/ExpressionsPanel';
import { PromptPanel } from './panels/PromptPanel';

export function CharacterEditor({ character }: { character: Character }) {
  const update = useCastStore((s) => s.updateCharacter);
  const [name, setName] = React.useState(character.name);
  const persistName = useDebouncedCallback(
    (v: string) => void update(character.id, { name: v.trim() || 'Unnamed' }),
    500,
  );

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border px-6 py-2.5">
        <span
          className="h-7 w-7 shrink-0 rounded-full border border-border"
          style={{ background: character.colorHex ?? 'hsl(var(--muted))' }}
        />
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            persistName(e.target.value);
          }}
          className="h-8 max-w-sm border-0 px-0 text-base font-semibold shadow-none focus-visible:ring-0"
          placeholder="Character name"
        />
      </header>

      <Tabs defaultValue="identity" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border px-6 py-2">
          <TabsList>
            <TabsTrigger value="identity">Identity</TabsTrigger>
            <TabsTrigger value="traits">Traits 🔒</TabsTrigger>
            <TabsTrigger value="wardrobe">Wardrobe</TabsTrigger>
            <TabsTrigger value="expressions">Expressions</TabsTrigger>
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto max-w-3xl px-6 py-6">
            <TabsContent value="identity" className="mt-0">
              <IdentityPanel character={character} />
            </TabsContent>
            <TabsContent value="traits" className="mt-0">
              <TraitsPanel character={character} />
            </TabsContent>
            <TabsContent value="wardrobe" className="mt-0">
              <WardrobePanel />
            </TabsContent>
            <TabsContent value="expressions" className="mt-0">
              <ExpressionsPanel character={character} />
            </TabsContent>
            <TabsContent value="prompt" className="mt-0">
              <PromptPanel character={character} />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
