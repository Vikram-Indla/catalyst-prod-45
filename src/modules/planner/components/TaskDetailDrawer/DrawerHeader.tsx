// ============================================================
// DRAWER HEADER - MATCHES REFERENCE SCREENSHOT EXACTLY
// Task ID + Workstream inline, action icons row, status pill
// ============================================================

import { useState } from 'react';
import { X, ChevronRight, ChevronDown, Check, Link2, Eye, Pin, MoreHorizontal } from 'lucide-react';
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
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; text: string }> = {
  backlog: { label: 'Backlog', color: '#9ca3af', bg: 'bg-gray-100', text: 'text-gray-700' },
  planned: { label: 'Planned', color: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-700' },
  'in-progress': { label: 'In Progress', color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700' },
  in_progress: { label: 'In Progress', color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700' },
  review: { label: 'Review', color: '#8b5cf6', bg: 'bg-violet-50', text: 'text-violet-700' },
  done: { label: 'Done', color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700' },
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
        <button
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
            "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1",
            config.bg,
            config.text
          )}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          {resolvedCurrent?.name || config.label}
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
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
              <span className={cfg.text}>{status.name}</span>
              {isSelected && <Check className="w-4 h-4 ml-auto text-primary" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

export function DrawerHeader({ task, onClose, onTitleChange, onStatusChange, saveStatus = 'idle' }: DrawerHeaderProps) {
  const workstreamName = task.workstream?.name || '';
  const wsColors = getWorkstreamColor(workstreamName);
  
  // Get task key from task_key field or key field
  const taskKey = task.task_key || task.key || '';

  const handleCopyLink = () => {
    const url = `${window.location.origin}/planner/task-list?task=${task.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="px-6 pt-4 pb-4 bg-background border-b border-border">
      {/* Top Row: Task ID + Workstream + Action Icons */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          {/* Task ID */}
          <span className="font-mono font-semibold text-foreground text-sm">{taskKey}</span>
          
          {/* Workstream badge */}
          {workstreamName && (
            <>
              <span className="flex items-center gap-1 text-muted-foreground text-sm">
                <span 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: wsColors.hex }}
                />
                {workstreamName.replace(' Track', '')}
              </span>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </>
          )}
        </div>
        
        {/* Action Icons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopyLink}
            className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground"
            title="Copy link"
          >
            <Link2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground"
            title="Watch task"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground"
            title="Pin task"
          >
            <Pin className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground"
            title="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground"
            title="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Status Pill */}
      <div className="mb-3">
        <StatusSelector 
          currentStatus={task.status}
          currentStatusId={task.status_id}
          onChange={onStatusChange} 
        />
      </div>

      {/* Title - Inline editable */}
      <h1 
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onTitleChange(e.currentTarget.textContent || '')}
        className="text-2xl font-bold text-foreground outline-none leading-tight cursor-text"
      >
        {task.title}
      </h1>
      
      {/* All changes saved indicator */}
      <div className="mt-2 flex items-center gap-1.5">
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
    </div>
  );
}
