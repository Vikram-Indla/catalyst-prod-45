import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface StoryDetailsPanelProps {
  story: any;
  open: boolean;
  onClose: () => void;
}

export function StoryDetailsPanel({ story, open, onClose }: StoryDetailsPanelProps) {
  if (!story) return null;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'backlog': 'bg-muted text-muted-foreground',
      'ready': 'bg-secondary text-secondary-foreground',
      'in_progress': 'bg-primary/20 text-primary',
      'done': 'bg-success/20 text-success',
      'accepted': 'bg-success/20 text-success',
      'blocked': 'bg-destructive/20 text-destructive'
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="executive-drawer w-full sm:w-[500px] sm:max-w-[90vw] p-0 flex flex-col overflow-hidden">
        <SheetHeader className="executive-drawer-header flex-row items-start justify-between space-y-0 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-mono text-muted-foreground">
                {story.story_key || story.id?.slice(0, 8)}
              </span>
              <Badge className={getStatusColor(story.status || 'backlog')}>
                {(story.status || 'backlog').replace(/_/g, ' ')}
              </Badge>
            </div>
            <SheetTitle className="executive-drawer-title truncate">{story.name || story.title}</SheetTitle>
            <SheetDescription className="executive-drawer-subtitle mt-1">
              Story Details
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="executive-drawer-content flex-1 overflow-y-auto p-[var(--s4)] sm:p-[var(--s6)]">
          <div className="space-y-4">
            {story.description && (
              <div className="bg-card p-4 rounded-lg border border-border/60">
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                <p className="text-sm">{story.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {(story.story_points || story.estimate_points || story.points_loe) && (
                <div className="bg-card p-4 rounded-lg border border-border/60">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Story Points</h4>
                  <p className="text-sm font-semibold">
                    {story.story_points || story.estimate_points || story.points_loe}
                  </p>
                </div>
              )}

              {story.priority && (
                <div className="bg-card p-4 rounded-lg border border-border/60">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Priority</h4>
                  <p className="text-sm">{story.priority}</p>
                </div>
              )}

              {story.assignee_name && (
                <div className="bg-card p-4 rounded-lg border border-border/60">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Assignee</h4>
                  <p className="text-sm">{story.assignee_name}</p>
                </div>
              )}
            </div>

            {story.acceptance_criteria && (
              <div className="bg-card p-4 rounded-lg border border-border/60">
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Acceptance Criteria</h4>
                <p className="text-sm whitespace-pre-wrap">{story.acceptance_criteria}</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
