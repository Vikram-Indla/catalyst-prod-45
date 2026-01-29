// ============================================================
// TASK FIELDS - MATCHES REFERENCE SCREENSHOT EXACTLY
// Row-based layout with label left, value right, dividers
// ============================================================

import { useMemo, useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useUserRole } from '@/hooks/useUserRole';
import { 
  User, 
  Calendar, 
  Clock,
  Flag,
  Layers,
  Check,
  AlertTriangle,
  Info,
  Tag,
  HelpCircle,
  ChevronDown
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { getWorkstreamColor } from '@/lib/workstream-colors';
import { LabelsSelector } from './LabelsSelector';

interface TaskFieldsGridProps {
  task: any;
  onFieldChange: (field: string, value: any) => void;
}

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: 'text-red-600', dot: 'bg-red-500' },
  high: { label: 'High', color: 'text-amber-600', dot: 'bg-amber-500' },
  medium: { label: 'Medium', color: 'text-blue-600', dot: 'bg-blue-500' },
  low: { label: 'Low', color: 'text-gray-500', dot: 'bg-gray-400' },
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
  });
}

function useWorkstreams() {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const canAccessAll = isAdmin || isSuperAdmin;

  return useQuery({
    queryKey: ['drawer-workstreams', user?.id, canAccessAll],
    queryFn: async () => {
      if (!user) return [];

      if (canAccessAll) {
        // Admin/super_admin: fetch all workstreams
        const { data, error } = await supabase
          .from('planner_workstreams')
          .select('id, name')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        return data || [];
      }

      // Regular user: fetch only workstreams they are members of
      const { data: memberships, error } = await supabase
        .from('workstream_members')
        .select(`
          workstream_id,
          workstream:planner_workstreams(id, name, is_active)
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;

      return (memberships || [])
        .filter(m => (m.workstream as any)?.is_active)
        .map(m => m.workstream as { id: string; name: string });
    },
    enabled: !!user && !roleLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function TaskFieldsGrid({ task, onFieldChange }: TaskFieldsGridProps) {
  const { data: profiles = [] } = useProfiles();

  return (
    <div className="task-modal__section">
      {/* Inline Fields Row - 3 columns per V2 spec */}
      <div className="task-modal__fields-row">
        {/* Priority */}
        <div className="task-modal__inline-field">
          <span className="task-modal__inline-label">Priority</span>
          <PrioritySelect
            value={task.priority}
            onChange={(priority) => onFieldChange('priority', priority)}
          />
        </div>

        {/* Due Date */}
        <div className="task-modal__inline-field">
          <span className="task-modal__inline-label">Due Date</span>
          <DueDatePicker
            value={task.due_date}
            onChange={(date) => onFieldChange('due_date', date)}
          />
        </div>

        {/* Start Date */}
        <div className="task-modal__inline-field">
          <span className="task-modal__inline-label">Start Date</span>
          <DatePicker
            value={task.start_date}
            onChange={(date) => onFieldChange('start_date', date)}
            placeholder="Set start date..."
          />
        </div>
      </div>

      {/* Labels Row */}
      <div className="task-modal__labels-row mt-4">
        <LabelsSelector taskId={task.id} />
      </div>
    </div>
  );
}

// Field Row Component - REMOVED, using inline fields instead

// Priority Select - V2 Inline Style
function PrioritySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const config = PRIORITY_CONFIG[value as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="task-modal__inline-value">
          <span className="task-modal__priority-dot" style={{ backgroundColor: config.dot.includes('red') ? '#dc2626' : config.dot.includes('amber') ? '#ca8a04' : config.dot.includes('blue') ? '#2563eb' : '#94a3b8' }} />
          <span>{config.label}</span>
          <ChevronDown className="w-3 h-3 ml-auto text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-40 p-1.5 z-[500] bg-popover"
        align="start"
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
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.dot.includes('red') ? '#dc2626' : cfg.dot.includes('amber') ? '#ca8a04' : cfg.dot.includes('blue') ? '#2563eb' : '#94a3b8' }} />
            <span className={cfg.color}>{cfg.label}</span>
            {value === key && <Check className="w-4 h-4 ml-auto text-primary" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// Assignee Select
function AssigneeSelect({ 
  value, 
  currentAssignee, 
  profiles, 
  onChange 
}: { 
  value: string | null; 
  currentAssignee: any; 
  profiles: any[]; 
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

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

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 hover:bg-muted/50 px-2 py-1 rounded transition-colors">
          {displayAssignee ? (
            <>
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[9px] font-bold text-white">
                {displayAssignee.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
              </div>
              <span className="text-sm text-foreground">{displayAssignee.full_name}</span>
            </>
          ) : (
            <>
              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                <HelpCircle className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Add assignee...</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 z-[500] bg-popover" align="end">
        <div className="p-2 border-b border-border">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="max-h-[240px] overflow-y-auto p-1">
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded hover:bg-muted/50"
          >
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">Unassigned</span>
          </button>
          {filteredProfiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => { onChange(profile.id); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2.5 px-2 py-2 rounded transition-colors",
                value === profile.id ? "bg-muted" : "hover:bg-muted/50"
              )}
            >
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[9px] font-bold text-white">
                {profile.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
              </div>
              <span className="text-sm">{profile.full_name || 'Unnamed'}</span>
              {value === profile.id && <Check className="w-4 h-4 ml-auto text-primary" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Date Picker - V2 Inline Style
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
        <button className="task-modal__inline-value task-modal__inline-value--readonly">
          <span>{value ? format(new Date(value), 'MMM d, yyyy') : placeholder || 'Not set'}</span>
          <ChevronDown className="w-3 h-3 ml-auto text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[500] bg-popover" align="start">
        <CalendarComponent
          mode="single"
          selected={value ? new Date(value) : undefined}
          onSelect={(date) => {
            onChange(date?.toISOString().split('T')[0] || null);
            setOpen(false);
          }}
          className="p-3"
        />
      </PopoverContent>
    </Popover>
  );
}

// Due Date Picker with overdue indicator - V2 Inline Style
function DueDatePicker({ value, onChange }: { value: string | null; onChange: (date: string | null) => void }) {
  const [open, setOpen] = useState(false);
  
  const overdueDays = useMemo(() => {
    if (!value) return null;
    const diff = differenceInDays(new Date(), new Date(value));
    return diff > 0 ? diff : null;
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn("task-modal__inline-value", overdueDays && "task-modal__overdue")}>
          {value ? (
            <>
              {overdueDays && <AlertTriangle className="w-4 h-4" />}
              <span>{format(new Date(value), 'MMM d, yyyy')}</span>
              {overdueDays && (
                <span className="text-xs">({overdueDays}d overdue)</span>
              )}
            </>
          ) : (
            <span className="text-gray-400">Set due date...</span>
          )}
          <ChevronDown className="w-3 h-3 ml-auto text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[500] bg-popover" align="start">
        <CalendarComponent
          mode="single"
          selected={value ? new Date(value) : undefined}
          onSelect={(date) => {
            onChange(date?.toISOString().split('T')[0] || null);
            setOpen(false);
          }}
          className="p-3"
        />
      </PopoverContent>
    </Popover>
  );
}

// Workstream Select
function WorkstreamSelect({ 
  value, 
  currentWorkstream,
  onChange 
}: { 
  value: string | null; 
  currentWorkstream: any; 
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: workstreams = [] } = useWorkstreams();

  const displayWorkstream = useMemo(() => {
    if (!value) return null;
    return workstreams.find((w) => w.id === value) || currentWorkstream || null;
  }, [workstreams, value, currentWorkstream]);

  const wsColors = getWorkstreamColor(displayWorkstream?.name || '');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 hover:bg-muted/50 px-2 py-1 rounded transition-colors">
          <span 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: wsColors.hex }}
          />
          <span className="text-sm text-foreground">
            {displayWorkstream?.name || 'None'}
          </span>
          <span className="text-muted-foreground">›</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0 z-[500] bg-popover" align="end">
        <div className="max-h-[240px] overflow-y-auto p-1">
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className={cn(
              "w-full flex items-center gap-2.5 px-2 py-2 rounded transition-colors",
              !value ? "bg-muted" : "hover:bg-muted/50"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-sm text-muted-foreground">None</span>
            {!value && <Check className="w-4 h-4 ml-auto text-primary" />}
          </button>
          {workstreams.map((ws) => {
            const colors = getWorkstreamColor(ws.name);
            return (
              <button
                key={ws.id}
                onClick={() => { onChange(ws.id); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2 py-2 rounded transition-colors",
                  value === ws.id ? "bg-muted" : "hover:bg-muted/50"
                )}
              >
                <span 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: colors.hex }}
                />
                <span className="text-sm">{ws.name}</span>
                {value === ws.id && <Check className="w-4 h-4 ml-auto text-primary" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
