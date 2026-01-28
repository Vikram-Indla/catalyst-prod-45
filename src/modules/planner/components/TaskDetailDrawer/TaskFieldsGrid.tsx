// ============================================================
// TASK FIELDS - LINEAR-INSPIRED SINGLE COLUMN LAYOUT
// Clean rows with workstream-colored avatars
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  Calendar, 
  Clock,
  Flag,
  Layers,
  Check,
  AlertTriangle
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

import { cn } from '@/lib/utils';
import { getWorkstreamColor } from '@/lib/workstream-colors';

interface TaskFieldsGridProps {
  task: any;
  onFieldChange: (field: string, value: any) => void;
}

const PRIORITY_CONFIG = {
  critical: { icon: AlertTriangle, label: 'Critical', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
  high: { icon: Flag, label: 'High', bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' },
  medium: { icon: Flag, label: 'Medium', bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
  low: { icon: Flag, label: 'Low', bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
} as const;

function useProfiles() {
  return useQuery({
    queryKey: ['drawer-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function TaskFieldsGrid({ task, onFieldChange }: TaskFieldsGridProps) {
  const { data: profiles = [] } = useProfiles();
  const workstreamName = task.workstream?.name || '';
  const wsColors = getWorkstreamColor(workstreamName);

  return (
    <div className="space-y-1">
      {/* Section Header - Sentence case */}
      <div className="px-1 py-2">
        <span className="text-xs font-medium text-muted-foreground">
          Details
        </span>
      </div>

      {/* Priority */}
      <FieldRow label="Priority" icon={<Flag className="w-4 h-4" />}>
        <PrioritySelect
          value={task.priority}
          onChange={(priority) => onFieldChange('priority', priority)}
        />
      </FieldRow>

      {/* Assignee */}
      <FieldRow label="Assignee" icon={<User className="w-4 h-4" />}>
        <AssigneeSelect
          value={task.assignee_id}
          currentAssignee={task.assignee}
          profiles={profiles}
          workstreamColor={wsColors.hex}
          onChange={(id) => onFieldChange('assignee_id', id)}
        />
      </FieldRow>

      {/* Workstream - Display only */}
      <FieldRow label="Workstream" icon={<Layers className="w-4 h-4" />}>
        <div className="flex items-center gap-2">
          <span 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: wsColors.hex }}
          />
          <span className="text-sm font-medium text-foreground">
            {workstreamName || 'No workstream'}
          </span>
        </div>
      </FieldRow>

      {/* Start Date */}
      <FieldRow label="Start Date" icon={<Calendar className="w-4 h-4" />}>
        <DatePicker
          value={task.start_date}
          onChange={(date) => onFieldChange('start_date', date)}
          placeholder="Set start date"
        />
      </FieldRow>

      {/* Due Date */}
      <FieldRow label="Due Date" icon={<Clock className="w-4 h-4" />}>
        <DueDatePicker
          value={task.due_date}
          onChange={(date) => onFieldChange('due_date', date)}
        />
      </FieldRow>
    </div>
  );
}

// Field Row - Single column, full-width clickable
function FieldRow({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2.5 text-muted-foreground">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex-shrink-0">
        {children}
      </div>
    </div>
  );
}

// Priority Select
function PrioritySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const config = PRIORITY_CONFIG[value as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
  const Icon = config.icon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold",
            config.bg, config.text
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
            {config.label}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-40 p-1.5 z-[500] bg-popover max-h-[min(320px,var(--radix-popover-content-available-height))] scrollable-overlay"
        align="end"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onWheelCapture={(e) => e.stopPropagation()}
      >
        {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => { onChange(key); setOpen(false); }}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
              value === key ? "bg-muted" : "hover:bg-muted/50"
            )}
          >
            <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
            <span className={cfg.text}>{cfg.label}</span>
            {value === key && <Check className="w-4 h-4 ml-auto text-primary" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// Assignee Select with workstream-colored avatar
function AssigneeSelect({ 
  value, 
  currentAssignee, 
  profiles, 
  workstreamColor,
  onChange 
}: { 
  value: string | null; 
  currentAssignee: any; 
  profiles: any[]; 
  workstreamColor: string;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const getFocusableItems = () => {
    const el = listRef.current;
    if (!el) return [] as HTMLButtonElement[];
    return Array.from(el.querySelectorAll<HTMLButtonElement>('button[data-assignee-option="true"]'));
  };

  const moveFocus = (delta: number) => {
    const items = getFocusableItems();
    if (items.length === 0) return;

    const active = document.activeElement as HTMLButtonElement | null;
    const idx = items.findIndex((b) => b === active);
    const next =
      idx === -1
        ? delta > 0
          ? 0
          : items.length - 1
        : Math.min(items.length - 1, Math.max(0, idx + delta));

    items[next]?.focus();
    items[next]?.scrollIntoView({ block: 'nearest' });
  };

  const scrollByPage = (direction: 1 | -1) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollBy({ top: direction * el.clientHeight * 0.9 });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveFocus(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveFocus(-1);
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      scrollByPage(1);
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      scrollByPage(-1);
    }
  };

  const handleListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveFocus(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveFocus(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      const items = getFocusableItems();
      items[0]?.focus();
      items[0]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'End') {
      e.preventDefault();
      const items = getFocusableItems();
      const last = items[items.length - 1];
      last?.focus();
      last?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      scrollByPage(1);
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      scrollByPage(-1);
    }
  };

  const displayAssignee = useMemo(() => {
    if (!value) return null;
    return profiles.find((p) => p.id === value) || currentAssignee || null;
  }, [profiles, value, currentAssignee]);

  const filteredProfiles = useMemo(() => {
    if (!search.trim()) return profiles;
    const lower = search.toLowerCase();
    return profiles.filter(p => 
      p.full_name?.toLowerCase().includes(lower) || 
      p.email?.toLowerCase().includes(lower)
    );
  }, [profiles, search]);

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch('');
      }}
    >
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2" type="button">
          {displayAssignee ? (
            <>
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: workstreamColor }}
              >
                {getInitials(displayAssignee.full_name)}
              </div>
              <span className="text-sm font-medium text-foreground">{displayAssignee.full_name}</span>
            </>
          ) : (
            <>
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                <User className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Unassigned</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0 z-[500] bg-popover h-[min(350px,70vh)] flex flex-col overflow-hidden"
        align="end"
      >
        <div className="p-2 border-b border-border flex-shrink-0">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        </div>
        <div
          ref={listRef}
          role="listbox"
          tabIndex={0}
          onKeyDown={handleListKeyDown}
          className="flex-1 min-h-0 overflow-y-auto p-1 overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] focus:outline-none"
        >
          <button
            type="button"
            data-assignee-option="true"
            onClick={() => { onChange(null); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded hover:bg-muted/50"
          >
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">Unassigned</span>
          </button>
          {filteredProfiles.map((profile) => (
            <button
              type="button"
              data-assignee-option="true"
              key={profile.id}
              onClick={() => { onChange(profile.id); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2.5 px-2 py-2 rounded transition-colors",
                value === profile.id ? "bg-muted" : "hover:bg-muted/50"
              )}
            >
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: workstreamColor }}
              >
                {getInitials(profile.full_name)}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium truncate">{profile.full_name || 'Unnamed'}</div>
              </div>
              {value === profile.id && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Date Picker
function DatePicker({ 
  value, 
  onChange, 
  placeholder 
}: { 
  value: string | null; 
  onChange: (date: string | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center">
          <span className={cn("text-sm font-medium", value ? "text-foreground" : "text-muted-foreground")}>
            {value ? format(new Date(value), 'MMM d, yyyy') : placeholder || 'Not set'}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[500] bg-popover pointer-events-auto" align="end">
        <CalendarComponent
          mode="single"
          selected={value ? new Date(value) : undefined}
          onSelect={(date) => {
            onChange(date?.toISOString().split('T')[0] || null);
            setOpen(false);
          }}
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

// Due Date Picker with urgency - WCAG AA compliant badges
function DueDatePicker({ value, onChange }: { value: string | null; onChange: (date: string | null) => void }) {
  const [open, setOpen] = useState(false);
  
  const urgency = useMemo(() => {
    if (!value) return null;
    const diff = differenceInDays(new Date(value), new Date());
    if (diff < 0) return { label: 'Overdue', variant: 'danger' as const };
    if (diff === 0) return { label: 'Today', variant: 'danger' as const };
    if (diff === 1) return { label: 'Tomorrow', variant: 'warning' as const };
    if (diff <= 3) return { label: `${diff}d left`, variant: 'warning' as const };
    return null;
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2">
          <span className={cn("text-sm font-medium", value ? "text-foreground" : "text-muted-foreground")}>
            {value ? format(new Date(value), 'MMM d, yyyy') : 'Not set'}
          </span>
          {urgency && (
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
              // WCAG AA compliant: darker text colors for proper contrast
              urgency.variant === 'warning' && "bg-amber-100 text-amber-800",
              urgency.variant === 'danger' && "bg-red-100 text-red-800"
            )}>
              {urgency.label}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[500] bg-popover pointer-events-auto" align="end">
        <CalendarComponent
          mode="single"
          selected={value ? new Date(value) : undefined}
          onSelect={(date) => {
            onChange(date?.toISOString().split('T')[0] || null);
            setOpen(false);
          }}
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
