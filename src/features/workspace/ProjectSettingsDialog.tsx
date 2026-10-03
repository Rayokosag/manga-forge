import * as React from 'react';
import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TagInput } from '@/components/common/TagInput';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { CONTENT_RATINGS, type Project } from '@/db/schema';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

const RATING_LABELS: Record<(typeof CONTENT_RATINGS)[number], string> = {
  general: 'General',
  teen: 'Teen',
  mature: 'Mature',
  adult: 'Adult / Explicit',
};

interface Props {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Edits the project-level metadata that drives the content-agnostic pipeline. */
export function ProjectSettingsDialog({ project, open, onOpenChange }: Props) {
  const updateProject = useWorkspaceStore((s) => s.updateProject);
  const deleteProject = useWorkspaceStore((s) => s.deleteProject);

  const [name, setName] = React.useState(project.name);
  const [description, setDescription] = React.useState(project.description ?? '');
  const [contentRating, setContentRating] = React.useState(project.contentRating);
  const [genreTags, setGenreTags] = React.useState<string[]>(project.genreTags ?? []);
  const [artStyle, setArtStyle] = React.useState(project.artStyle ?? '');
  const [defaultNegativePrompt, setDefaultNegativePrompt] = React.useState(
    project.defaultNegativePrompt ?? '',
  );
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  // Resync local form whenever a different project is opened.
  React.useEffect(() => {
    if (!open) return;
    setName(project.name);
    setDescription(project.description ?? '');
    setContentRating(project.contentRating);
    setGenreTags(project.genreTags ?? []);
    setArtStyle(project.artStyle ?? '');
    setDefaultNegativePrompt(project.defaultNegativePrompt ?? '');
  }, [open, project]);

  const save = async () => {
    await updateProject(project.id, {
      name: name.trim() || 'Untitled Project',
      description: description.trim() || null,
      contentRating,
      genreTags,
      artStyle: artStyle.trim() || null,
      defaultNegativePrompt: defaultNegativePrompt.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Project settings</DialogTitle>
            <DialogDescription>
              Metadata and defaults for this project. These fields feed the prompt
              pipeline unchanged — nothing here is filtered.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="proj-name">Name</Label>
              <Input id="proj-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-desc">Description / logline</Label>
              <Textarea
                id="proj-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Content rating</Label>
                <Select
                  value={contentRating}
                  onValueChange={(v) => setContentRating(v as typeof contentRating)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_RATINGS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {RATING_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="proj-style">Default art style</Label>
                <Input
                  id="proj-style"
                  placeholder="e.g. seinen, heavy ink, muted palette"
                  value={artStyle}
                  onChange={(e) => setArtStyle(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Genre tags</Label>
              <TagInput
                value={genreTags}
                onChange={setGenreTags}
                placeholder="Isekai, Dark Fantasy, Romance…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-neg">Default negative prompt</Label>
              <Textarea
                id="proj-neg"
                rows={2}
                placeholder="lowres, bad anatomy, extra fingers…"
                value={defaultNegativePrompt}
                onChange={(e) => setDefaultNegativePrompt(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 /> Delete project
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => void save()}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        destructive
        title={`Delete “${project.name}”?`}
        description="This permanently removes the project and all of its chapters, scenes, characters, and world data. This cannot be undone."
        confirmText="Delete everything"
        onConfirm={async () => {
          await deleteProject(project.id);
          onOpenChange(false);
        }}
      />
    </>
  );
}
