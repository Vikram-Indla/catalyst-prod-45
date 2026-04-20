import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { useWorkItemActivityFeed } from '@/hooks/useWorkItemActivityFeed';
import { cn } from '@/lib/utils';

interface WorkItemActivityFeedProps {
  entityType: string;
  entityId: string;
  className?: string;
}

export function WorkItemActivityFeed({ entityType, entityId, className }: WorkItemActivityFeedProps) {
  const { activities, isLoading } = useWorkItemActivityFeed(entityType, entityId);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4 animate-pulse" />
          Loading activity...
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Activity className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No activity yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {activities.map((activity) => {
        const isExpanded = expandedItems.has(activity.id);
        const hasChanges = activity.changes.length > 0;

        return (
          <div
            key={activity.id}
            className="border border-neutral-200 rounded-lg bg-white p-3"
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarFallback className="bg-brand-primary/20 text-brand-primary text-xs">
                  {activity.actorId?.substring(0, 2).toUpperCase() || 'SY'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Lozenge
                    appearance={
                      (activity.action === 'created'
                        ? 'success'
                        : activity.action === 'updated'
                        ? 'inprogress'
                        : activity.action === 'deleted'
                        ? 'removed'
                        : 'default') as LozengeAppearance
                    }
                  >
                    {activity.action}
                  </Lozenge>
                  <span className="text-xs text-muted-foreground">
                    {activity.relativeTime}
                  </span>
                </div>
                
                <p className="text-sm mt-1">{activity.description}</p>

                {hasChanges && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 mt-1 text-xs text-muted-foreground"
                    onClick={() => toggleExpanded(activity.id)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-1" />
                        Hide changes
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Show {activity.changes.length} change{activity.changes.length > 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                )}

                {isExpanded && hasChanges && (
                  <div className="mt-2 space-y-1 text-xs">
                    {activity.changes.map((change, idx) => (
                      <div key={idx} className="flex items-start gap-2 py-1 px-2 bg-neutral-50 rounded">
                        <span className="font-medium capitalize text-muted-foreground min-w-[80px]">
                          {change.field}:
                        </span>
                        <span className="text-red-600 line-through">
                          {typeof change.from === 'object' ? JSON.stringify(change.from) : String(change.from || '—')}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-green-600">
                          {typeof change.to === 'object' ? JSON.stringify(change.to) : String(change.to || '—')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
