/**
 * Task¹⁰ Activity Timeline - Displays item history
 */
import { 
  History, Check, User, Calendar, Tag, FileText, MessageSquare, 
  ArrowRight, Plus 
} from 'lucide-react';
import { useAqdActivity, type AqdActivity } from '../hooks/useAqdActivity';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ActivityTimelineProps {
  itemId: string;
}

export function ActivityTimeline({ itemId }: ActivityTimelineProps) {
  const { activities, isLoading } = useAqdActivity(itemId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-6 bottom-0 w-px bg-slate-200" />

        {/* Activity items */}
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="relative flex gap-3">
              {/* Icon */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10",
                getActivityIconBg(activity.action)
              )}>
                {getActivityIcon(activity.action)}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <p className="text-sm text-slate-700">
                  <span className="font-medium">{activity.creatorName}</span>
                  {' '}
                  {getActivityText(activity)}
                </p>
                
                {/* Value change display */}
                {(activity.old_value || activity.new_value) && activity.action !== 'note_added' && (
                  <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                    {activity.old_value && (
                      <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded line-through">
                        {activity.old_value}
                      </span>
                    )}
                    {activity.old_value && activity.new_value && (
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    )}
                    {activity.new_value && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded">
                        {activity.new_value}
                      </span>
                    )}
                  </div>
                )}

                <p className="text-xs text-slate-400 mt-1">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getActivityIcon(action: string) {
  const iconClass = "w-4 h-4 text-white";
  
  switch (action) {
    case 'created':
      return <Plus className={iconClass} />;
    case 'status_changed':
      return <Check className={iconClass} />;
    case 'assigned':
      return <User className={iconClass} />;
    case 'due_date_set':
    case 'due_date_removed':
      return <Calendar className={iconClass} />;
    case 'label_added':
    case 'label_removed':
      return <Tag className={iconClass} />;
    case 'description_updated':
      return <FileText className={iconClass} />;
    case 'note_added':
    case 'note_updated':
    case 'note_deleted':
      return <MessageSquare className={iconClass} />;
    case 'carried_over':
      return <ArrowRight className={iconClass} />;
    default:
      return <History className={iconClass} />;
  }
}

function getActivityIconBg(action: string) {
  switch (action) {
    case 'created':
      return 'bg-emerald-500';
    case 'status_changed':
      return 'bg-blue-500';
    case 'assigned':
      return 'bg-violet-500';
    case 'due_date_set':
    case 'due_date_removed':
      return 'bg-amber-500';
    case 'label_added':
    case 'label_removed':
      return 'bg-pink-500';
    case 'description_updated':
      return 'bg-cyan-500';
    case 'note_added':
    case 'note_updated':
    case 'note_deleted':
      return 'bg-indigo-500';
    case 'carried_over':
      return 'bg-orange-500';
    default:
      return 'bg-slate-400';
  }
}

function getActivityText(activity: AqdActivity): string {
  switch (activity.action) {
    case 'created':
      return 'created this item';
    case 'status_changed':
      return `changed status to ${activity.new_value}`;
    case 'assigned':
      return activity.new_value 
        ? `assigned to ${activity.new_value}`
        : 'removed assignee';
    case 'due_date_set':
      return `set due date to ${activity.new_value}`;
    case 'due_date_removed':
      return 'removed due date';
    case 'label_added':
      return `added label "${activity.new_value}"`;
    case 'label_removed':
      return `removed label "${activity.old_value}"`;
    case 'description_updated':
      return 'updated description';
    case 'note_added':
      return 'added a note';
    case 'note_updated':
      return 'edited a note';
    case 'note_deleted':
      return 'deleted a note';
    case 'carried_over':
      return 'carried over from previous week';
    case 'rank_changed':
      return `moved from #${activity.old_value} to #${activity.new_value}`;
    default:
      return 'made a change';
  }
}
