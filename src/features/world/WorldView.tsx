import { Globe2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorldTree } from './WorldTree';
import { EntityEditor } from './EntityEditor';
import { TimelinePanel } from './TimelinePanel';
import { useWorldStore } from '@/store/useWorldStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export function WorldView() {
  const hasProject = useWorkspaceStore((s) => !!s.currentProjectId);
  const entities = useWorldStore((s) => s.entities);
  const currentId = useWorldStore((s) => s.currentEntityId);
  const entity = entities.find((e) => e.id === currentId);

  if (!hasProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
        <Globe2 className="h-10 w-10" />
        <p className="max-w-xs text-sm">Create or open a project to build its world.</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="entities" className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-2">
        <TabsList>
          <TabsTrigger value="entities">World database</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="entities" className="mt-0 min-h-0 flex-1">
        <div className="flex h-full overflow-hidden">
          <WorldTree />
          <main className="min-w-0 flex-1">
            {entity ? (
              <EntityEditor key={entity.id} entity={entity} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <Globe2 className="h-10 w-10" />
                <p className="max-w-xs text-sm">
                  Select an entity, or add one from the tree to describe your setting.
                </p>
              </div>
            )}
          </main>
        </div>
      </TabsContent>

      <TabsContent value="timeline" className="mt-0 min-h-0 flex-1">
        <TimelinePanel />
      </TabsContent>
    </Tabs>
  );
}
