import * as React from 'react';
import { Plus, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PromptDialog } from '@/components/common/PromptDialog';
import { ProjectSettingsDialog } from './ProjectSettingsDialog';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export function ProjectSwitcher() {
  const projects = useWorkspaceStore((s) => s.projects);
  const currentProjectId = useWorkspaceStore((s) => s.currentProjectId);
  const selectProject = useWorkspaceStore((s) => s.selectProject);
  const createProject = useWorkspaceStore((s) => s.createProject);

  const [creating, setCreating] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const current = projects.find((p) => p.id === currentProjectId);

  return (
    <div className="flex items-center gap-1.5 p-2">
      <Select
        value={currentProjectId ?? undefined}
        onValueChange={(id) => void selectProject(id)}
      >
        <SelectTrigger className="h-8 flex-1">
          <SelectValue placeholder="No project" />
        </SelectTrigger>
        <SelectContent>
          {projects.length === 0 && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No projects yet</div>
          )}
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="icon-sm"
        title="Project settings"
        disabled={!current}
        onClick={() => setSettingsOpen(true)}
      >
        <Settings2 />
      </Button>
      <Button variant="ghost" size="icon-sm" title="New project" onClick={() => setCreating(true)}>
        <Plus />
      </Button>

      <PromptDialog
        open={creating}
        onOpenChange={setCreating}
        title="New project"
        label="Project name"
        placeholder="The Hollow Crown"
        confirmText="Create"
        onSubmit={(name) => createProject({ name })}
      />

      {current && (
        <ProjectSettingsDialog
          key={current.id}
          project={current}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      )}
    </div>
  );
}
