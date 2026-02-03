// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ PANEL ACTIVITY TAB COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { formatDistanceToNow, parseISO } from 'date-fns';
import { 
  Plus, 
  Check, 
  ArrowUpDown, 
  UserPlus, 
  UserMinus, 
  Edit2, 
  CheckCircle, 
  RefreshCw, 
  Trash2, 
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { useT10ItemActivity } from '../../hooks';
import type { T10ActivityType } from '../../types';
import { getActivityIconColor, getActivityLabel } from '../../types';

interface T10PanelActivityTabProps {
  itemId: string;
}

const iconMap: Record<T10ActivityType, React.ElementType> = {
  created: Plus,
  completed: Check,
  uncompleted: RotateCcw,
  rank_changed: ArrowUpDown,
  assigned: UserPlus,
  unassigned: UserMinus,
  updated: Edit2,
  resolved: CheckCircle,
  carried: RefreshCw,
  removed: Trash2,
  restored: RotateCcw,
};

const colorClasses: Record<string, string> = {
  blue: 't10-activity-icon--blue',
  green: 't10-activity-icon--green',
  purple: 't10-activity-icon--purple',
  orange: 't10-activity-icon--orange',
  gray: 't10-activity-icon--gray',
  red: 't10-activity-icon--red',
};

export function T10PanelActivityTab({ itemId }: T10PanelActivityTabProps) {
  const { data: activities, isLoading, error } = useT10ItemActivity(itemId);

  if (isLoading) {
    return (
      <div className="t10-panel-activity t10-panel-activity--loading">
        <Loader2 className="t10-spinner" />
        <span>Loading activity...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="t10-panel-activity t10-panel-activity--error">
        <span>Failed to load activity</span>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="t10-panel-activity t10-panel-activity--empty">
        <span>No activity yet</span>
      </div>
    );
  }

  return (
    <div className="t10-panel-activity">
      <div className="t10-activity-timeline">
        {activities.map((activity, index) => {
          const Icon = iconMap[activity.activity_type];
          const colorClass = colorClasses[getActivityIconColor(activity.activity_type)];
          const isLast = index === activities.length - 1;
          
          return (
            <div key={activity.id} className="t10-activity-item">
              <div className="t10-activity-item__line-container">
                <div className={`t10-activity-item__icon ${colorClass}`}>
                  <Icon />
                </div>
                {!isLast && <div className="t10-activity-item__line" />}
              </div>
              
              <div className="t10-activity-item__content">
                <div className="t10-activity-item__header">
                  <span className="t10-activity-item__user">
                    {activity.performer?.full_name || 'System'}
                  </span>
                  <span className="t10-activity-item__action">
                    {getActivityLabel(activity.activity_type)}
                  </span>
                </div>
                
                {/* Show metadata for certain activity types */}
                {activity.activity_type === 'rank_changed' && activity.metadata && (
                  <div className="t10-activity-item__meta">
                    Moved from #{(activity.metadata as any).old_rank} to #{(activity.metadata as any).new_rank}
                  </div>
                )}
                
                <div className="t10-activity-item__time">
                  {formatDistanceToNow(parseISO(activity.performed_at), { addSuffix: true })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default T10PanelActivityTab;
