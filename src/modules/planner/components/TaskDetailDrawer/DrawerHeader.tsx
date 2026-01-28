// ============================================================
// DRAWER HEADER - LINEAR-INSPIRED REDESIGN
// Clean breadcrumb with workstream color, prominent status pill
// ============================================================

import { useState } from 'react';
import { X, ChevronRight, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getWorkstreamColor } from '@/lib/workstream-colors';

interface DrawerHeaderProps {
  task: any;
  onClose: () => void;
  onTitleChange: (title: string) => void;
  onStatusChange: (statusId: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; text: string; border: string }> = {
  backlog: { label: 'Backlog', color: '#9ca3af', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  planned: { label: 'Planned', color: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
  'in-progress': { label: 'In Progress', color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
  in_progress: { label: 'In Progress', color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
  review: { label: 'Review', color: '#8b5cf6', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-300' },
  done: { label: 'Done', color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
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
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all",
            "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1",
            config.bg,
            config.text,
            config.border
          )}
        >
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          {resolvedCurrent?.name || config.label}
          <ChevronDown className="w-4 h-4 opacity-60" />
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

export function DrawerHeader({ task, onClose, onTitleChange, onStatusChange }: DrawerHeaderProps) {
  const workstreamName = task.workstream?.name || '';
  const wsColors = getWorkstreamColor(workstreamName);
  
  // Get task key from task_key field or key field
  const taskKey = task.task_key || task.key || '';

  const handleCopyLink = () => {
    const url = `${window.location.origin}/planner/task-list?task=${task.id}`;
    navigator.clipboard.writeText(url);
    // Toast will be shown by the caller if needed
  };

  return (
    <div className="px-6 pt-5 pb-5 bg-background border-b border-border">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-3 right-3 w-8 h-8 rounded-full hover:bg-muted"
      >
        <X className="w-4 h-4" />
      </Button>

      {/* Breadcrumb with Task ID - Workstream colored */}
      <div className="flex items-center gap-2 text-xs mb-4">
        {workstreamName && (
          <span 
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold text-[11px]"
            style={{ 
              backgroundColor: wsColors.hexLight, 
              color: wsColors.hex 
            }}
          >
            <span 
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: wsColors.hex }}
            />
            {workstreamName.replace(' Track', '')}
          </span>
        )}
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
        {/* Task ID - Prominent display */}
        <span className="font-mono font-bold text-foreground text-sm">{taskKey}</span>
        
        {/* Copy Link Button */}
        <button
          onClick={handleCopyLink}
          className="ml-1 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Copy link (⌘L)"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>
      </div>

      {/* Status Selector - PROMINENT */}
      <div className="mb-4">
        <StatusSelector 
          currentStatus={task.status}
          currentStatusId={task.status_id}
          onChange={onStatusChange} 
        />
      </div>

      {/* Title - Click-to-edit with visual feedback */}
      <h1 
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onTitleChange(e.currentTarget.textContent || '')}
        className="text-xl font-bold text-foreground outline-none hover:bg-muted/50 focus:bg-accent/50 focus:px-2 focus:-mx-2 rounded-md transition-colors leading-tight cursor-text py-1"
        title="Click to edit (E)"
      >
        {task.title}
      </h1>
      
      {/* Keyboard hint */}
      <div className="mt-2 text-[10px] text-muted-foreground/60">
        Press <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[9px]">E</kbd> to edit
      </div>
    </div>
  );
}
