import * as React from 'react';
import {
  Camera,
  FileArchive,
  FileJson,
  FileText,
  Loader2,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PromptDialog } from '@/components/common/PromptDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useExportStore } from '@/store/useExportStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export function ExportView() {
  const hasProject = useWorkspaceStore((s) => !!s.currentProjectId);
  const busy = useExportStore((s) => s.busy);
  const progress = useExportStore((s) => s.progress);
  const snapshots = useExportStore((s) => s.snapshots);
  const exportJson = useExportStore((s) => s.exportJson);
  const exportZip = useExportStore((s) => s.exportZip);
  const exportPdf = useExportStore((s) => s.exportPdf);
  const importJson = useExportStore((s) => s.importJson);
  const createSnapshot = useExportStore((s) => s.createSnapshot);
  const restoreSnapshot = useExportStore((s) => s.restoreSnapshot);
  const deleteSnapshot = useExportStore((s) => s.deleteSnapshot);

  const [snapOpen, setSnapOpen] = React.useState(false);
  const [restoreId, setRestoreId] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  if (!hasProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
        <Upload className="h-10 w-10" />
        <p className="max-w-xs text-sm">Open a project to export it or manage snapshots.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-3xl space-y-8 p-6">
        {busy && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-card/60 px-3 py-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            {progress || 'Working…'}
          </div>
        )}

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Export project</h3>
            <p className="text-xs text-muted-foreground">
              Everything runs locally. JSON is the complete, re-importable project; ZIP adds
              rendered page images; PDF composes the storyboard pages.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ExportCard
              icon={FileJson}
              title="JSON"
              desc="Full data bundle"
              disabled={!!busy}
              onClick={() => void exportJson()}
            />
            <ExportCard
              icon={FileArchive}
              title="ZIP"
              desc="Data + page PNGs"
              disabled={!!busy}
              onClick={() => void exportZip()}
            />
            <ExportCard
              icon={FileText}
              title="PDF"
              desc="Storyboard pages"
              disabled={!!busy}
              onClick={() => void exportPdf()}
            />
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Import</h3>
          <p className="text-xs text-muted-foreground">
            Load a previously exported JSON as a new project (your current data is untouched).
          </p>
          <Button variant="outline" size="sm" disabled={!!busy} onClick={() => void importJson()}>
            <Upload /> Import project JSON…
          </Button>
        </section>

        <Separator />

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Snapshots</h3>
              <p className="text-xs text-muted-foreground">
                Database-backed version history. Restore brings a snapshot back as a fresh copy.
              </p>
            </div>
            <Button variant="outline" size="sm" disabled={!!busy} onClick={() => setSnapOpen(true)}>
              <Camera /> Save snapshot
            </Button>
          </div>

          <div className="space-y-1.5">
            {snapshots.length === 0 && (
              <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                No snapshots yet.
              </p>
            )}
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                  v{snap.version}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{snap.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(snap.createdAt).toLocaleString()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!!busy}
                  onClick={() => setRestoreId(snap.id)}
                >
                  <RotateCcw /> Restore
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteId(snap.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <PromptDialog
        open={snapOpen}
        onOpenChange={setSnapOpen}
        title="Save snapshot"
        label="Label (optional)"
        placeholder="Before the big rewrite…"
        confirmText="Save"
        onSubmit={(label) => createSnapshot(label)}
      />
      <ConfirmDialog
        open={!!restoreId}
        onOpenChange={(o) => !o && setRestoreId(null)}
        title="Restore snapshot?"
        description="This creates a new project copy from the snapshot. Nothing current is overwritten."
        confirmText="Restore as copy"
        onConfirm={() => {
          if (restoreId) void restoreSnapshot(restoreId);
        }}
      />
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        destructive
        title="Delete snapshot?"
        description="This permanently removes the snapshot."
        confirmText="Delete"
        onConfirm={() => {
          if (deleteId) void deleteSnapshot(deleteId);
        }}
      />
    </ScrollArea>
  );
}

function ExportCard({
  icon: Icon,
  title,
  desc,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="flex flex-col items-start gap-1 rounded-lg border border-border bg-card/40 p-4 text-left transition-colors hover:bg-accent/50 disabled:pointer-events-none disabled:opacity-50"
    >
      <Icon className="mb-1 h-6 w-6 text-primary" />
      <span className="font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">{desc}</span>
    </button>
  );
}
