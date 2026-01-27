// ============================================================
// RECENT ACTIVITY WIDGET
// Planner V9: Activity timeline for recent task actions
// ============================================================

import { Clock, CheckCircle2, Edit3, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'completed' | 'updated' | 'created';
  taskKey: string;
  description: string;
  timestamp: Date;
}

interface RecentActivityProps {
  className?: string;
}

// Mock activity data - would be replaced with real data from useActivityLog hook
const mockActivities: ActivityItem[] = [
  { 
    id: '1', 
    type: 'completed', 
    taskKey: 'PLN-42', 
    description: 'API Integration', 
    timestamp: new Date(Date.now() - 15 * 60 * 1000) 
  },
  { 
    id: '2', 
    type: 'updated', 
    taskKey: 'PLN-45', 
    description: 'Updated status on Dashboard Optimization', 
    timestamp: new Date(Date.now() - 60 * 60 * 1000) 
  },
  { 
    id: '3', 
    type: 'created', 
    taskKey: 'PLN-51', 
    description: 'Created AI Model Pipeline task', 
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) 
  },
];

const ACTIVITY_ICONS: Record<ActivityItem['type'], typeof CheckCircle2> = {
  completed: CheckCircle2,
  updated: Edit3,
  created: Plus,
};

const ACTIVITY_COLORS: Record<ActivityItem['type'], string> = {
  completed: '#10b981',
  updated: '#f59e0b',
  created: '#3b82f6',
};

export function RecentActivity({ className }: RecentActivityProps) {
  const activities = mockActivities;

  return (
    <div className={cn('rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Recent Activity
        </h3>
      </div>

      {/* Activity List */}
      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = ACTIVITY_ICONS[activity.type];
          const color = ACTIVITY_COLORS[activity.type];
          
          return (
            <div key={activity.id} className="flex items-start gap-3">
              <div 
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                style={{ backgroundColor: `${color}20` }}
              >
                <Icon className="w-3 h-3" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-tight">
                  {activity.type === 'completed' && (
                    <>Completed <span className="font-semibold">{activity.taskKey}</span> {activity.description}</>
                  )}
                  {activity.type === 'updated' && (
                    <>{activity.description} <span className="font-semibold">{activity.taskKey}</span></>
                  )}
                  {activity.type === 'created' && (
                    <>{activity.description}</>
                  )}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
