// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ PANEL ACTIVITY TAB COMPONENT
// Timeline matching reference design with proper icons
// ═══════════════════════════════════════════════════════════════════════════

import { format, parseISO } from 'date-fns';
import { 
  Plus, 
  Check, 
  ArrowUpDown, 
  User, 
  Edit2, 
  Loader2,
} from 'lucide-react';
import { useT10ItemActivity } from '../../hooks';
import type { T10ActivityType } from '../../types';
import { getActivityIconColor } from '../../types';

interface T10PanelActivityTabProps {
  itemId: string;
}

// Map activity types to icons
const iconMap: Record<T10ActivityType, React.ElementType> = {
  created: Plus,
  completed: Check,
  uncompleted: Check,
  rank_changed: ArrowUpDown,
  assigned: User,
  unassigned: User,
  updated: Edit2,
  resolved: Check,
  carried: ArrowUpDown,
  removed: Plus,
  restored: Plus,
};

// Get formatted activity message
function getActivityMessage(activity: any): { action: string; detail?: string } {
  const type = activity.activity_type;
  const performer = activity.performer?.full_name || 'System';
  const meta = activity.metadata as any;

  switch (type) {
    case 'completed':
      return { action: 'Marked as completed', detail: `by ${performer}` };
    case 'uncompleted':
      return { action: 'Marked as incomplete', detail: `by ${performer}` };
    case 'rank_changed':
      return { 
        action: 'Rank changed', 
        detail: `from #${meta?.old_rank || '?'} to #${meta?.new_rank || '?'} by ${performer}` 
      };
    case 'updated':
      return { action: 'Description updated', detail: `by ${performer}` };
    case 'assigned':
      const oldAssignee = meta?.old_assignee || 'Unassigned';
      const newAssignee = meta?.new_assignee || 'Unassigned';
      return { 
        action: 'Assigned', 
        detail: `changed from ${oldAssignee} → ${newAssignee} by ${performer}` 
      };
    case 'created':
      return { action: 'Created', detail: `by ${performer}` };
    default:
      return { action: type.replace(/_/g, ' '), detail: `by ${performer}` };
  }
}

// Format timestamp
function formatTimestamp(dateStr: string): string {
  const date = parseISO(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = format(date, 'h:mm a');

  if (isToday) {
    return `Today · ${time}`;
  } else if (isYesterday) {
    return `Yesterday · ${time}`;
  } else {
    return `${format(date, 'MMM d, yyyy')} · ${time}`;
  }
}

export function T10PanelActivityTab({ itemId }: T10PanelActivityTabProps) {
  const { data: activities, isLoading, error } = useT10ItemActivity(itemId);

  if (isLoading) {
    return (
      <div className="t10-activity t10-activity--loading">
        <Loader2 className="t10-activity__spinner" />
        <span>Loading activity...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="t10-activity t10-activity--error">
        <span>Failed to load activity</span>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="t10-activity t10-activity--empty">
        <span>No activity yet</span>
      </div>
    );
  }

  return (
    <div className="t10-activity">
      {activities.map((activity) => {
        const Icon = iconMap[activity.activity_type] || Plus;
        const iconColor = getActivityIconColor(activity.activity_type);
        const message = getActivityMessage(activity);
        
        return (
          <div key={activity.id} className="t10-activity__item">
            <div className={`t10-activity__icon t10-activity__icon--${iconColor}`}>
              <Icon size={14} />
            </div>
            <div className="t10-activity__content">
              <p className="t10-activity__message">
                <strong>{message.action}</strong>
                {message.detail && <span> {message.detail}</span>}
              </p>
              <span className="t10-activity__time">
                {formatTimestamp(activity.performed_at)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default T10PanelActivityTab;
