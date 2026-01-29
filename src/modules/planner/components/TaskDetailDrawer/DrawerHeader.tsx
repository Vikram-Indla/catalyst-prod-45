// ============================================================
// DRAWER HEADER V2 - ENTERPRISE CLEAN DESIGN
// 18px title (not 24px), status bar, inline fields
// ============================================================

import { useState, useMemo } from 'react';
import { X, ChevronDown, Check, Link2, Eye, Pin, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getWorkstreamColor } from '@/lib/workstream-colors';
import { toast } from 'sonner';

interface DrawerHeaderProps {
  task: any;
  onClose: () => void;
  onTitleChange: (title: string) => void;
  onStatusChange: (statusId: string) => void;
  onAssigneeChange?: (assigneeId: string | null) => void;
  onWorkstreamChange?: (workstreamId: string | null) => void;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  backlog: { label: 'Backlog', color: '#94a3b8' },
  planned: { label: 'Planned', color: '#3b82f6' },
  'in-progress': { label: 'In Progress', color: '#0284c7' },
  in_progress: { label: 'In Progress', color: '#0284c7' },
  review: { label: 'Review', color: '#8b5cf6' },
  done: { label: 'Done', color: '#16a34a' },
};

const HEALTH_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#dc2626' },
  at_risk: { label: 'At Risk', color: '#ca8a04' },
  on_track: { label: 'On Track', color: '#16a34a' },
};

function useStatuses() {
  return useQuery({
    queryKey: ['drawer-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planner_statuses')
        .select('*')
        .order('position');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// Status Field Component for Status Bar
function StatusBarField({
  label,
  value,
  dotColor,
  onClick,
  hasChevron = true,
}: {
  label: string;
  value: string;
  dotColor?: string;
  onClick?: () => void;
  hasChevron?: boolean;
}) {
  return (
    <div className="task-modal__status-field">
      <span className="task-modal__status-label">{label}</span>
      <button
        onClick={onClick}
        className={cn(
          "task-modal__status-value",
          !onClick && "cursor-default"
        )}
        disabled={!onClick}
      >
        {dotColor && (
          <span
            className="task-modal__status-dot"
            style={{ backgroundColor: dotColor }}
          />
        )}
        <span>{value}</span>
        {hasChevron && onClick && (
          <span className="task-modal__status-chevron">▾</span>
        )}
      </button>
    </div>
  );
}

// Assignee Field for Status Bar
function AssigneeStatusField({ assignee }: { assignee: any }) {
  const initials = assignee?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  return (
    <div className="task-modal__status-field">
      <span className="task-modal__status-label">Assignee</span>
      <div className="task-modal__status-value">
        <span className="task-modal__assignee-avatar">{initials}</span>
        <span>{assignee?.full_name || 'Unassigned'}</span>
      </div>
    </div>
  );
}

// Status Selector Dropdown
function StatusSelector({
  currentStatus,
  currentStatusId,
  onChange,
}: {
  currentStatus: any;
  currentStatusId?: string | null;
  onChange: (statusId: string) => void;
}) {
  const { data: statuses = [] } = useStatuses();
  const [open, setOpen] = useState(false);

  const resolvedCurrent = statuses.find((s: any) => s.id === currentStatusId) || currentStatus;
  const slug = resolvedCurrent?.slug || 'backlog';
  const config = STATUS_CONFIG[slug] || STATUS_CONFIG.backlog;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="task-modal__status-value">
          <span
            className="task-modal__status-dot"
            style={{ backgroundColor: config.color }}
          />
          <span>{resolvedCurrent?.name || config.label}</span>
          <span className="task-modal__status-chevron">▾</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-48 p-1.5 z-[500] bg-popover max-h-[min(320px,var(--radix-popover-content-available-height))] scrollable-overlay"
        align="start"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onWheelCapture={(e) => e.stopPropagation()}
      >
        {statuses.map((status: any) => {
          const statusSlug = status.slug || 'backlog';
          const cfg = STATUS_CONFIG[statusSlug] || STATUS_CONFIG.backlog;
          const isSelected = (currentStatusId || resolvedCurrent?.id) === status.id;

          return (
            <button
              key={status.id}
              onClick={() => {
                onChange(status.id);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isSelected ? 'bg-muted font-semibold' : 'hover:bg-muted/50'
              )}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
              <span>{status.name}</span>
              {isSelected && <Check className="w-4 h-4 ml-auto text-primary" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

export function DrawerHeader({ 
  task, 
  onClose, 
  onTitleChange, 
  onStatusChange, 
  saveStatus = 'idle' 
}: DrawerHeaderProps) {
  const workstreamName = task.workstream?.name || '';
  const wsColors = getWorkstreamColor(workstreamName);
  const taskKey = task.task_key || task.key || '';
  
  // Determine health status (derive from overdue/blocked status)
  const health = useMemo(() => {
    if (task.is_blocked) return 'critical';
    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      const now = new Date();
      if (dueDate < now) return 'critical';
      const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 3) return 'at_risk';
    }
    return 'on_track';
  }, [task.due_date, task.is_blocked]);

  const healthConfig = HEALTH_CONFIG[health];
  const statusSlug = task.status?.slug || 'backlog';
  const statusConfig = STATUS_CONFIG[statusSlug] || STATUS_CONFIG.backlog;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/planner/task-list?task=${task.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="task-modal__header">
      {/* Top Row: Task ID + Workstream + Action Icons */}
      <div className="task-modal__header-top">
        <div className="task-modal__breadcrumb">
          <span className="task-modal__id">{taskKey}</span>
          {workstreamName && (
            <>
              <span>·</span>
              <span className="task-modal__workstream">{workstreamName}</span>
            </>
          )}
        </div>
        
        {/* Action Icons */}
        <div className="task-modal__actions">
          <button
            onClick={handleCopyLink}
            className="task-modal__action-btn"
            title="Copy link"
          >
            <Link2 className="w-4 h-4" />
          </button>
          <button
            className="task-modal__action-btn"
            title="Watch task"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            className="task-modal__action-btn"
            title="Pin task"
          >
            <Pin className="w-4 h-4" />
          </button>
          <button
            className="task-modal__action-btn"
            title="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="task-modal__action-btn task-modal__action-btn--close"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Title Row - 18px, EDITABLE */}
      <div className="task-modal__title-row">
        <div 
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onTitleChange(e.currentTarget.textContent || '')}
          className="task-modal__title"
        >
          {task.title}
        </div>
        <span className="task-modal__edit-hint">Click to edit</span>
      </div>
      
      {/* Saving indicator */}
      <div className="flex items-center gap-1.5 mb-3">
        {saveStatus === 'saved' ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-emerald-600">All changes saved</span>
          </>
        ) : saveStatus === 'saving' ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs text-amber-600">Saving...</span>
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-emerald-600">All changes saved</span>
          </>
        )}
      </div>

      {/* Status Bar - 4 fields grid */}
      <div className="task-modal__status-bar">
        {/* Status */}
        <div className="task-modal__status-field">
          <span className="task-modal__status-label">Status</span>
          <StatusSelector
            currentStatus={task.status}
            currentStatusId={task.status_id}
            onChange={onStatusChange}
          />
        </div>
        
        {/* Health */}
        <StatusBarField
          label="Health"
          value={healthConfig.label}
          dotColor={healthConfig.color}
          hasChevron={false}
        />
        
        {/* Workstream */}
        <StatusBarField
          label="Workstream"
          value={workstreamName || 'None'}
          dotColor={wsColors.hex}
          hasChevron={false}
        />
        
        {/* Assignee */}
        <AssigneeStatusField assignee={task.assignee} />
      </div>
    </div>
  );
}
