import React from 'react';
import { X, ExternalLink, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useTheme } from '@/hooks/useTheme';

interface WorkItem {
  id: string;
  type: string;
  key: string;
  summary: string;
  status: string;
  comments: number;
  assignee: { name: string; avatar?: string } | null;
  dueDate: string | null;
  priority: string;
  labels: string[];
  created: string;
  updated: string;
  hasChildren?: boolean;
  parentKey?: string;
  parentSummary?: string;
  description?: string;
}

interface WorkItemDetailPanelProps {
  item: WorkItem | null;
  onClose: () => void;
}

// Design System V2 compliant - Story uses teal (not green)
// Type icons now use canonical JiraIssueTypeIcon component

// Design System V2 compliant - Done uses teal (not green)
const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  'Backlog': { bg: 'bg-muted', text: 'text-muted-foreground', label: 'BACKLOG' },
  'To Do': { bg: 'bg-muted', text: 'text-muted-foreground', label: 'TO DO' },
  'In Progress': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'IN PROGRESS' },
  'In Requirement': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'IN REQUIREMENTS' },
  'In Production': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'IN PRODUCTION' },
  'Done': { bg: 'bg-[rgba(13,148,136,0.1)] dark:bg-[rgba(20,184,166,0.15)]', text: 'text-[#0d9488] dark:text-[#14b8a6]', label: 'DONE' },
  'Closed': { bg: 'bg-muted', text: 'text-muted-foreground', label: 'CLOSED' },
  'Blocked': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'BLOCKED' },
};

export function WorkItemDetailPanel({ item, onClose }: WorkItemDetailPanelProps) {
  const { isDark } = useTheme();
  if (!item) return null;

  // typeInfo no longer needed — using JiraIssueTypeIcon directly
  const statusStyle = statusStyles[item.status] || statusStyles['Backlog'];

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const getAvatarColor = (name: string) => {
    // Catalyst V5 avatar colors (Blue, Teal, Gray only)
    const colors = ['bg-[#2563eb]', 'bg-[#0d9488]', 'bg-[#6b7280]'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  return (
    <div
      className="w-[440px] border-l h-full flex flex-col"
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
        borderColor: isDark ? '#2E2E2E' : undefined,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}` }}
      >
        <div className="flex items-center gap-2">
          <JiraIssueTypeIcon type={item.type} size={16} />
          <span className="text-sm font-medium" style={{ color: isDark ? '#EDEDED' : '#172B4D' }}>Jira work item</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className={cn("h-7 w-7", isDark ? "hover:bg-[#1A1A1A]" : "hover:bg-muted")}>
            <ExternalLink className="h-4 w-4" style={{ color: isDark ? '#878787' : '#6B778C' }} />
          </Button>
          <Button variant="ghost" size="icon" className={cn("h-7 w-7", isDark ? "hover:bg-[#1A1A1A]" : "hover:bg-muted")}>
            <MoreHorizontal className="h-4 w-4" style={{ color: isDark ? '#878787' : '#6B778C' }} />
          </Button>
          <Button variant="ghost" size="icon" className={cn("h-7 w-7", isDark ? "hover:bg-[#1A1A1A]" : "hover:bg-muted")} onClick={onClose}>
            <X className="h-4 w-4" style={{ color: isDark ? '#878787' : '#6B778C' }} />
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      {item.parentKey && (
        <div
          className="px-4 py-2 text-xs"
          style={{ borderBottom: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}` }}
        >
          <span style={{ color: isDark ? '#878787' : '#6B778C' }}>{item.parentKey}</span>
          <span style={{ color: isDark ? '#878787' : '#6B778C' }} className="mx-1">/</span>
          <span className="text-[#2563eb] hover:underline cursor-pointer">{item.key}</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Title & Status */}
        <div className="mb-4">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-[11px]" style={{ color: isDark ? '#878787' : '#6B778C' }}>{item.key}</span>
            <span className="text-[11px]" style={{ color: isDark ? '#878787' : '#6B778C' }}>•</span>
            <span className="text-[11px]" style={{ color: isDark ? '#878787' : '#6B778C' }}>{item.comments} comments</span>
          </div>
          <h2 className="text-[20px] font-medium leading-tight mb-3" style={{ color: isDark ? '#EDEDED' : '#172B4D' }}>
            {item.summary}
          </h2>
          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center px-2 py-1 rounded-[3px] text-[11px] font-bold uppercase tracking-wide",
              statusStyle.bg, statusStyle.text
            )}>
              {statusStyle.label}
            </span>
            <Button variant="ghost" size="sm" className={cn("h-7 text-[12px]", isDark ? "text-[#878787] hover:bg-[#1A1A1A]" : "text-[#6B778C] hover:bg-[#F4F5F7]")}>
              + Add
            </Button>
          </div>
        </div>

        {/* Parent */}
        {item.parentKey && item.parentSummary && (
          <div className="mb-4">
            <div className="text-xs font-semibold uppercase mb-1" style={{ color: isDark ? '#878787' : '#6B778C' }}>Parent</div>
            <div
              className="flex items-center gap-2 p-2 rounded-md"
              style={{
                backgroundColor: isDark ? '#1A1A1A' : '#F1F5F9',
                border: isDark ? '1px solid #2E2E2E' : 'none',
              }}
            >
              <JiraIssueTypeIcon type="Epic" size={16} />
              <span className="text-sm text-[#2563eb] hover:underline cursor-pointer">
                {item.parentKey} {item.parentSummary}
              </span>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mb-4">
          <div className="text-[11px] font-semibold uppercase mb-2" style={{ color: isDark ? '#878787' : '#6B778C' }}>Description</div>
          <div className="text-[14px] leading-relaxed" style={{ color: isDark ? '#EDEDED' : '#172B4D' }}>
            {item.description || (
              <span style={{ color: isDark ? '#878787' : '#6B778C', fontStyle: 'italic' }}>No description provided.</span>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="pt-4" style={{ borderTop: `1px solid ${isDark ? '#2E2E2E' : '#DFE1E6'}` }}>
          <div className="text-[11px] font-semibold uppercase mb-3" style={{ color: isDark ? '#878787' : '#6B778C' }}>Details</div>

          <div className="space-y-3">
            {/* Assignee */}
            <div className="flex items-center justify-between">
              <span className="text-[13px]" style={{ color: isDark ? '#878787' : '#6B778C' }}>Assignee</span>
              <div className="flex items-center gap-2">
                {item.assignee ? (
                  <>
                    <Avatar className="h-6 w-6">
                      {item.assignee.avatar && <AvatarImage src={item.assignee.avatar} alt={item.assignee.name} />}
                      <AvatarFallback className={cn("text-[10px] text-white", getAvatarColor(item.assignee.name))}>
                        {getInitials(item.assignee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[13px]" style={{ color: isDark ? '#EDEDED' : '#172B4D' }}>{item.assignee.name}</span>
                  </>
                ) : (
                  <span className="text-[13px]" style={{ color: isDark ? '#878787' : '#6B778C' }}>Unassigned</span>
                )}
              </div>
            </div>

            {/* Priority */}
            <div className="flex items-center justify-between">
              <span className="text-[13px]" style={{ color: isDark ? '#878787' : '#6B778C' }}>Priority</span>
              <span className="text-[13px]" style={{ color: isDark ? '#EDEDED' : '#172B4D' }}>{item.priority}</span>
            </div>

            {/* Due Date */}
            <div className="flex items-center justify-between">
              <span className="text-[13px]" style={{ color: isDark ? '#878787' : '#6B778C' }}>Due date</span>
              <span className="text-[13px]" style={{ color: isDark ? '#EDEDED' : '#172B4D' }}>
                {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}
              </span>
            </div>

            {/* Labels */}
            {item.labels.length > 0 && (
              <div className="flex items-start justify-between">
                <span className="text-[13px]" style={{ color: isDark ? '#878787' : '#6B778C' }}>Labels</span>
                <div className="flex gap-1 flex-wrap justify-end">
                  {item.labels.map((label) => (
                    <Badge
                      key={label}
                      variant="secondary"
                      className="text-[11px]"
                      style={{
                        backgroundColor: isDark ? '#292929' : '#DFE1E6',
                        color: isDark ? '#A1A1A1' : '#42526E',
                      }}
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
