import {
  Globe2,
  LayoutPanelLeft,
  PenLine,
  Share2,
  Sparkles,
  Upload,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ENABLED_VIEWS, useUiStore, type AppView } from '@/store/useUiStore';

const ITEMS: { view: AppView; label: string; icon: LucideIcon }[] = [
  { view: 'story', label: 'Story', icon: PenLine },
  { view: 'characters', label: 'Characters', icon: Users },
  { view: 'relationships', label: 'Relationships', icon: Share2 },
  { view: 'world', label: 'World', icon: Globe2 },
  { view: 'storyboard', label: 'Storyboard', icon: LayoutPanelLeft },
  { view: 'ai', label: 'AI', icon: Sparkles },
  { view: 'export', label: 'Export', icon: Upload },
];

export function ActivityRail() {
  const activeView = useUiStore((s) => s.activeView);
  const setView = useUiStore((s) => s.setView);

  return (
    <nav className="flex w-14 flex-col items-center gap-1 border-r border-border bg-card/60 py-3">
      {ITEMS.map((item, i) => {
        const enabled = ENABLED_VIEWS.includes(item.view);
        const active = activeView === item.view;
        return (
          <div key={item.view} className="contents">
            {i === 3 && <Separator className="my-1 w-8" />}
            <Button
              variant={active ? 'secondary' : 'ghost'}
              size="icon"
              title={enabled ? item.label : `${item.label} — coming soon`}
              disabled={!enabled}
              onClick={() => setView(item.view)}
              className={cn('relative', active && 'ring-1 ring-primary/40')}
            >
              <item.icon />
              {active && (
                <span className="absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r bg-primary" style={{ width: 2 }} />
              )}
            </Button>
          </div>
        );
      })}
    </nav>
  );
}
