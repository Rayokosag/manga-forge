import { Users } from 'lucide-react';
import { CharacterList } from './CharacterList';
import { CharacterEditor } from './CharacterEditor';
import { useCastStore } from '@/store/useCastStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export function CharactersView() {
  const hasProject = useWorkspaceStore((s) => !!s.currentProjectId);
  const characters = useCastStore((s) => s.characters);
  const currentId = useCastStore((s) => s.currentCharacterId);
  const character = characters.find((c) => c.id === currentId);

  if (!hasProject) {
    return <Placeholder text="Create or open a project to build its cast." />;
  }

  return (
    <div className="flex h-full overflow-hidden">
      <CharacterList />
      <main className="min-w-0 flex-1">
        {character ? (
          <CharacterEditor key={character.id} character={character} />
        ) : (
          <Placeholder text="Select a character, or add one from the list to start a profile." />
        )}
      </main>
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
      <Users className="h-10 w-10" />
      <p className="max-w-xs text-sm">{text}</p>
    </div>
  );
}
