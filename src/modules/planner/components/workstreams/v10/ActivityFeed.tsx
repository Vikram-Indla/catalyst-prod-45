// ============================================================
// WORKSTREAMS V10 ACTIVITY FEED
// Timeline-structured activity display with avatars
// ============================================================

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import type { WorkstreamActivity, ActivityAction } from './types';
import { 
  Plus, 
  UserPlus, 
  UserMinus, 
  Crown, 
  FileText, 
  Settings, 
  Archive, 
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

interface ActivityFeedProps {
  activities: WorkstreamActivity[];
  maxItems?: number;
  showEmptyState?: boolean;
  className?: string;
}

const ACTION_CONFIG: Record<ActivityAction, { icon: typeof Plus; label: string; color: string }> = {
  created: { icon: Plus, label: 'created this workstream', color: 'text-blue-500' },
  health_changed: { icon: TrendingUp, label: 'changed health status', color: 'text-amber-500' },
  lead_changed: { icon: Crown, label: 'changed lead', color: 'text-purple-500' },
  member_added: { icon: UserPlus, label: 'added as member', color: 'text-emerald-500' },
  member_removed: { icon: UserMinus, label: 'removed from workstream', color: 'text-red-500' },
  description_updated: { icon: FileText, label: 'updated description', color: 'text-slate-500' },
  settings_updated: { icon: Settings, label: 'updated settings', color: 'text-slate-500' },
  archived: { icon: Archive, label: 'archived workstream', color: 'text-orange-500' },
  unarchived: { icon: RotateCcw, label: 'restored workstream', color: 'text-green-500' },
};

function formatActivityTime(dateStr: string): string {
  const date = new Date(dateStr);
  
  if (isToday(date)) {
    return formatDistanceToNow(date, { addSuffix: true });
  }
  
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'h:mm a')}`;
  }
  
  return format(date, 'MMM d, yyyy');
}

function formatActivityAction(action: ActivityAction, data?: Record<string, unknown> | null): string {
  const config = ACTION_CONFIG[action];
  if (!config) return 'performed an action';
  
  // Handle health_changed with specific data
  if (action === 'health_changed' && data) {
    const newHealth = data.to as string;
    if (newHealth) {
      return `changed health status to ${newHealth.replace('-', ' ')}`;
    }
  }
  
  // Handle lead_changed with specific data
  if (action === 'lead_changed' && data) {
    const newLead = data.new_lead_name as string;
    if (newLead) {
      return `changed lead to ${newLead}`;
    }
  }
  
  // Handle member_added with specific data
  if (action === 'member_added' && data) {
    const memberName = data.member_name as string;
    if (memberName) {
      return `added ${memberName} as Contributor`;
    }
  }
  
  return config.label;
}

function ActivityItem({ activity }: { activity: WorkstreamActivity }) {
  const config = ACTION_CONFIG[activity.action_type] || ACTION_CONFIG.created;
  const Icon = config.icon;

  return (
    <div className="flex gap-3 relative">
      {/* Timeline line */}
      <div 
        className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"
        aria-hidden="true"
      />
      
      {/* Avatar */}
      <Avatar className="w-8 h-8 shrink-0 ring-2 ring-white dark:ring-slate-900 relative z-10">
        <AvatarFallback 
          style={{ backgroundColor: activity.user_color }}
          className="text-white text-xs font-medium"
        >
          {activity.user_initials}
        </AvatarFallback>
      </Avatar>
      
      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {activity.user_name}
          </span>
          {' '}
          <span>{formatActivityAction(activity.action_type, activity.action_data)}</span>
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {formatActivityTime(activity.created_at)}
        </p>
      </div>
    </div>
  );
}

export function ActivityFeed({ 
  activities, 
  maxItems = 10, 
  showEmptyState = true,
  className 
}: ActivityFeedProps) {
  const displayedActivities = activities.slice(0, maxItems);

  if (displayedActivities.length === 0 && showEmptyState) {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
          <FileText className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No activity yet
        </p>
      </div>
    );
  }

  return (
    <div 
      className={cn('space-y-0', className)}
      role="feed"
      aria-label="Workstream activity"
    >
      {displayedActivities.map((activity, index) => (
        <article 
          key={activity.id}
          aria-posinset={index + 1}
          aria-setsize={displayedActivities.length}
        >
          <ActivityItem activity={activity} />
        </article>
      ))}
      
      {/* End of timeline */}
      {displayedActivities.length > 0 && (
        <div className="flex gap-3 relative">
          <div 
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Minus className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-center text-xs text-slate-400 dark:text-slate-500 pt-2">
            {activities.length > maxItems 
              ? `${activities.length - maxItems} more activities...`
              : 'End of activity'}
          </div>
        </div>
      )}
    </div>
  );
}
