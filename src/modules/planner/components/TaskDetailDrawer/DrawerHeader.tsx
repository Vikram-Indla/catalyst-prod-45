// ============================================================
// DRAWER HEADER COMPONENT - POLISHED
// Clean header with breadcrumb, styled status pill, inline title
// GUARDRAIL: Aggressive caching to prevent flickering
// ============================================================

import { useState } from 'react';
import { X, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DrawerHeaderProps {
  task: any;
  onClose: () => void;
  onTitleChange: (title: string) => void;
  onStatusChange: (statusId: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; text: string }> = {
  backlog: { label: 'Backlog', color: '#9ca3af', bg: 'bg-gray-100', text: 'text-gray-600' },
  planned: { label: 'Planned', color: '#2563eb', bg: 'bg-blue-50', text: 'text-blue-600' },
  'in-progress': { label: 'In Progress', color: '#d97706', bg: 'bg-amber-50', text: 'text-amber-600' },
  in_progress: { label: 'In Progress', color: '#d97706', bg: 'bg-amber-50', text: 'text-amber-600' },
  review: { label: 'Review', color: '#8b5cf6', bg: 'bg-purple-50', text: 'text-purple-600' },
  done: { label: 'Done', color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-600' },
};

// GUARDRAIL: Aggressive caching to prevent flickering
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
    refetchOnReconnect: false,
  });
}

function StatusSelect({
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

  const resolvedCurrent =
    statuses.find((s: any) => s.id === currentStatusId) || currentStatus;

  const slug = resolvedCurrent?.slug || 'backlog';
  const config = STATUS_CONFIG[slug] || STATUS_CONFIG.backlog;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all hover:ring-2 hover:ring-offset-1 hover:ring-gray-300",
            config.bg,
            config.text
          )}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          {resolvedCurrent?.name || config.label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1 z-[500] bg-popover" align="start">
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
                "w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors",
                isSelected ? 'bg-muted' : 'hover:bg-muted/50'
              )}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
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
  return (
    <div className="px-6 pt-5 pb-4 bg-background border-b border-border">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-3 right-3 w-8 h-8 rounded-full hover:bg-muted"
      >
        <X className="w-4 h-4" />
      </Button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-3">
        {task.workstream && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-teal-50 rounded text-teal-700 font-semibold text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            {task.workstream.name}
          </span>
        )}
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
        <span className="text-muted-foreground font-medium">{task.key}</span>
      </div>

      {/* Meta row: Key badge + Status pill */}
      <div className="flex items-center gap-3 mb-3">
        <span className="px-2 py-1 bg-muted rounded text-xs font-mono font-semibold text-muted-foreground">
          {task.key}
        </span>
        
        <StatusSelect 
          currentStatus={task.status}
          currentStatusId={task.status_id}
          onChange={onStatusChange} 
        />
      </div>

      {/* Title - Clean inline editable, NO border box */}
      <h1 
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onTitleChange(e.currentTarget.textContent || '')}
        className="text-xl font-bold text-foreground outline-none focus:bg-accent/50 focus:px-2 focus:-mx-2 rounded transition-colors"
      >
        {task.title}
      </h1>
    </div>
  );
}
