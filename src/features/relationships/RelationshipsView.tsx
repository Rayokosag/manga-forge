import * as React from 'react';
import { Link2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RelationshipGraph } from './RelationshipGraph';
import { RelationshipEditor } from './RelationshipEditor';
import { useCastStore } from '@/store/useCastStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import type { RelationshipVectors } from '@/db/schema';

const VECTOR_OPTIONS: { key: keyof RelationshipVectors; label: string }[] = [
  { key: 'trust', label: 'Trust' },
  { key: 'affection', label: 'Affection' },
  { key: 'conflict', label: 'Conflict' },
  { key: 'jealousy', label: 'Jealousy' },
  { key: 'intimacy', label: 'Intimacy' },
  { key: 'power', label: 'Power dynamic' },
];

export function RelationshipsView() {
  const hasProject = useWorkspaceStore((s) => !!s.currentProjectId);
  const characters = useCastStore((s) => s.characters);
  const relationships = useCastStore((s) => s.relationships);
  const selectedId = useCastStore((s) => s.selectedRelationshipId);
  const createRelationship = useCastStore((s) => s.createRelationship);

  const [vectorKey, setVectorKey] = React.useState<keyof RelationshipVectors>('affection');
  const [linkMode, setLinkMode] = React.useState(false);
  const [from, setFrom] = React.useState<string>('');
  const [to, setTo] = React.useState<string>('');

  const selected = relationships.find((r) => r.id === selectedId);

  if (!hasProject) {
    return <Placeholder text="Create or open a project to map its relationships." />;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-border px-4 py-2">
        <h2 className="text-sm font-semibold">Relationship graph</h2>
        <div className="ml-4 flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Color edges by</Label>
          <Select value={vectorKey} onValueChange={(v) => setVectorKey(v as keyof RelationshipVectors)}>
            <SelectTrigger className="h-8 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VECTOR_OPTIONS.map((o) => (
                <SelectItem key={o.key} value={o.key}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant={linkMode ? 'secondary' : 'outline'}
          size="sm"
          className="ml-auto"
          disabled={characters.length < 2}
          onClick={() => setLinkMode((v) => !v)}
        >
          <Link2 /> {linkMode ? 'Click two nodes…' : 'Link characters'}
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:22px_22px]">
          <RelationshipGraph
            vectorKey={vectorKey}
            linkMode={linkMode}
            onConsumeLink={() => setLinkMode(false)}
          />
        </div>

        <aside className="w-80 shrink-0 border-l border-border bg-card/40">
          {selected ? (
            <RelationshipEditor key={selected.id} relationship={selected} />
          ) : (
            <div className="space-y-5 p-4">
              <div>
                <h3 className="text-sm font-semibold">Create relationship</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pick two characters, or use “Link characters” and click two nodes on the graph.
                </p>
              </div>

              {characters.length < 2 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                  Add at least two characters first.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">From</Label>
                    <Select value={from} onValueChange={setFrom}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Character A" />
                      </SelectTrigger>
                      <SelectContent>
                        {characters.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">To</Label>
                    <Select value={to} onValueChange={setTo}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Character B" />
                      </SelectTrigger>
                      <SelectContent>
                        {characters.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    disabled={!from || !to || from === to}
                    onClick={() => {
                      void createRelationship(from, to);
                      setFrom('');
                      setTo('');
                    }}
                  >
                    Add relationship
                  </Button>
                </div>
              )}

              <Legend />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="space-y-1.5 rounded-md border border-border p-3 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">Reading the graph</p>
      <p>
        <span className="text-emerald-500">●</span> positive &nbsp;
        <span className="text-red-500">●</span> negative — thickness = intensity.
      </p>
      <p>Arrows mark directed bonds. Drag nodes to rearrange; positions are saved.</p>
      <p>Click an edge to edit its vectors and timeline.</p>
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
      <Share2 className="h-10 w-10" />
      <p className="max-w-xs text-sm">{text}</p>
    </div>
  );
}
