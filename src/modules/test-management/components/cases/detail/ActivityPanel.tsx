/**
 * Activity Panel - Section 3
 * Displays activity feed for test case changes
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Activity,
  Plus,
  Edit2,
  Trash2,
  ArrowRight,
  User,
  Link2,
  Unlink,
  Copy,
  Archive,
  RotateCcw,
  Play,
  Bug,
  FileText,
  GripVertical,
  Paperclip,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityEntry, ActivityActionEnum } from '../../../types/test-case-detail';

// =============================================
// ACTIVITY ICON
// =============================================

function ActivityIcon({ action }: { action: ActivityActionEnum }) {
  const iconMap: Record<ActivityActionEnum, { icon: React.ElementType; color: string; bg: string }> = {
    created: { icon: Plus, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    updated: { icon: Edit2, color: 'text-blue-600', bg: 'bg-blue-100' },
    status_changed: { icon: ArrowRight, color: 'text-purple-600', bg: 'bg-purple-100' },
    assigned: { icon: User, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    step_added: { icon: Plus, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    step_updated: { icon: Edit2, color: 'text-blue-600', bg: 'bg-blue-100' },
    step_deleted: { icon: Trash2, color: 'text-red-600', bg: 'bg-red-100' },
    step_reordered: { icon: GripVertical, color: 'text-slate-600', bg: 'bg-slate-100' },
    attachment_added: { icon: Paperclip, color: 'text-teal-600', bg: 'bg-teal-100' },
    attachment_removed: { icon: Paperclip, color: 'text-red-600', bg: 'bg-red-100' },
    executed: { icon: Play, color: 'text-amber-600', bg: 'bg-amber-100' },
    defect_linked: { icon: Bug, color: 'text-red-600', bg: 'bg-red-100' },
    defect_unlinked: { icon: Unlink, color: 'text-slate-600', bg: 'bg-slate-100' },
    requirement_linked: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
    requirement_unlinked: { icon: Unlink, color: 'text-slate-600', bg: 'bg-slate-100' },
    duplicated: { icon: Copy, color: 'text-purple-600', bg: 'bg-purple-100' },
    archived: { icon: Archive, color: 'text-slate-600', bg: 'bg-slate-100' },
    restored: { icon: RotateCcw, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  };

  const config = iconMap[action] || iconMap.updated;
  const Icon = config.icon;

  return (
    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', config.bg)}>
      <Icon className={cn('w-4 h-4', config.color)} />
    </div>
  );
}

// =============================================
// ACTIVITY DESCRIPTION
// =============================================

function formatActivityDescription(activity: ActivityEntry): React.ReactNode {
  const { action, metadata, createdByName } = activity;

  const actionDescriptions: Record<ActivityActionEnum, string> = {
    created: 'created this test case',
    updated: 'updated the test case',
    status_changed: 'changed the status',
    assigned: 'updated the assignee',
    step_added: 'added a new step',
    step_updated: 'updated a step',
    step_deleted: 'deleted a step',
    step_reordered: 'reordered the steps',
    attachment_added: 'added an attachment',
    attachment_removed: 'removed an attachment',
    executed: 'executed the test case',
    defect_linked: 'linked a defect',
    defect_unlinked: 'unlinked a defect',
    requirement_linked: 'linked a requirement',
    requirement_unlinked: 'unlinked a requirement',
    duplicated: 'duplicated this test case',
    archived: 'archived this test case',
    restored: 'restored this test case',
  };

  const baseDescription = actionDescriptions[action] || 'performed an action';

  // Add context from metadata if available
  if (metadata) {
    if (action === 'status_changed' && metadata.from && metadata.to) {
      return (
        <>
          <span className="font-medium">{createdByName}</span> changed status from{' '}
          <Badge variant="outline" className="text-xs mx-1">{String(metadata.from)}</Badge>
          to
          <Badge variant="outline" className="text-xs mx-1">{String(metadata.to)}</Badge>
        </>
      );
    }

    if (action === 'executed' && metadata.result) {
      return (
        <>
          <span className="font-medium">{createdByName}</span> executed the test case with result{' '}
          <Badge 
            variant="outline" 
            className={cn(
              'text-xs',
              metadata.result === 'passed' && 'text-emerald-700 border-emerald-300',
              metadata.result === 'failed' && 'text-red-700 border-red-300'
            )}
          >
            {String(metadata.result)}
          </Badge>
        </>
      );
    }
  }

  return (
    <>
      <span className="font-medium">{createdByName}</span> {baseDescription}
    </>
  );
}

// =============================================
// ACTIVITY ITEM
// =============================================

interface ActivityItemProps {
  activity: ActivityEntry;
  isLast: boolean;
}

function ActivityItem({ activity, isLast }: ActivityItemProps) {
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex gap-3">
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <ActivityIcon action={activity.action} />
        {!isLast && (
          <div className="w-px flex-1 bg-slate-200 my-1" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <p className="text-sm text-slate-700">
          {formatActivityDescription(activity)}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          {formatTime(activity.createdAt)}
        </p>
      </div>
    </div>
  );
}

// =============================================
// MAIN PANEL
// =============================================

interface ActivityPanelProps {
  activities: ActivityEntry[];
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function ActivityPanel({
  activities,
  onLoadMore,
  hasMore = false,
}: ActivityPanelProps) {
  // Group activities by date
  const groupedActivities = activities.reduce(
    (groups, activity) => {
      const date = new Date(activity.createdAt).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
      return groups;
    },
    {} as Record<string, ActivityEntry[]>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-medium text-slate-700">Activity</h3>
        <Badge variant="secondary" className="text-xs">
          {activities.length}
        </Badge>
      </div>

      {/* Activity List */}
      {activities.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedActivities).map(([date, dateActivities]) => (
            <div key={date}>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                {date === new Date().toLocaleDateString() ? 'Today' : date}
              </p>
              <div>
                {dateActivities.map((activity, index) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    isLast={index === dateActivities.length - 1}
                  />
                ))}
              </div>
            </div>
          ))}

          {hasMore && (
            <button
              onClick={onLoadMore}
              className="w-full text-sm text-blue-600 hover:text-blue-700 py-2"
            >
              Load more activity
            </button>
          )}
        </div>
      )}
    </div>
  );
}
