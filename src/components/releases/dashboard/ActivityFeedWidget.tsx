import { ActivityItem } from '@/types/release-dashboard';
import { CheckCircle, XCircle, AlertTriangle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ActivityFeedWidgetProps {
  activities: ActivityItem[];
}

const activityConfig: Record<ActivityItem['type'], { icon: typeof CheckCircle; bg: string; text: string }> = {
  'test-passed': { icon: CheckCircle, bg: 'bg-teal-100', text: 'text-teal-600' },
  'test-failed': { icon: XCircle, bg: 'bg-destructive/10', text: 'text-destructive' },
  'defect-logged': { icon: AlertTriangle, bg: 'bg-destructive/10', text: 'text-destructive' },
  'test-blocked': { icon: AlertTriangle, bg: 'bg-amber-100', text: 'text-amber-600' },
  'execution-started': { icon: Play, bg: 'bg-primary/10', text: 'text-primary' },
};

export function ActivityFeedWidget({ activities }: ActivityFeedWidgetProps) {
  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="px-3.5 py-2.5 border-b border-border">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Recent Activity</h3>
      </div>
      <div className="divide-y divide-border/50 max-h-[240px] overflow-y-auto">
        {activities.map((activity) => {
          const config = activityConfig[activity.type];
          const Icon = config.icon;
          return (
            <div key={activity.id} className="flex gap-2.5 px-3.5 py-2.5">
              <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", config.bg)}>
                <Icon className={cn("w-3.5 h-3.5", config.text)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground">
                  <span className="font-medium">{activity.userName}</span>{' '}
                  <span className="text-muted-foreground">{activity.description}</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
