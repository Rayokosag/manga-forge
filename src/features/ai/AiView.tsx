import { Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConnectionsPanel } from './ConnectionsPanel';
import { AgentConsole } from './AgentConsole';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export function AiView() {
  const hasProject = useWorkspaceStore((s) => !!s.currentProjectId);

  if (!hasProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
        <Sparkles className="h-10 w-10" />
        <p className="max-w-xs text-sm">Open a project to configure AI and run agents.</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="agents" className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-2">
        <TabsList>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="agents" className="mt-0 min-h-0 flex-1">
        <AgentConsole />
      </TabsContent>
      <TabsContent value="connections" className="mt-0 min-h-0 flex-1 overflow-auto">
        <ConnectionsPanel />
      </TabsContent>
    </Tabs>
  );
}
