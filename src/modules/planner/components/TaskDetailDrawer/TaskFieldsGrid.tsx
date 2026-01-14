// ============================================================
// TASK FIELDS GRID - POLISHED
// Field cards with hover states, priority icons, assignee avatar
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  UserCheck,
  Users, 
  Calendar, 
  Clock,
  Flag,
  Layers,
  Check
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface TaskFieldsGridProps {
  task: any;
  onFieldChange: (field: string, value: any) => void;
}

const PRIORITY_CONFIG = {
  critical: { icon: '⚠️', label: 'Critical', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
  high: { icon: '🔥', label: 'High', bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' },
  medium: { icon: '●', label: 'Medium', bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
  low: { icon: '○', label: 'Low', bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
} as const;

function useProfiles() {
  return useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });
}

function useTeams() {
  return useQuery({
    queryKey: ['all-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

function useCurrentUser() {
  const [user, setUser] = useState<{ id: string; full_name: string | null } | null>(null);
  
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', authUser.id)
          .maybeSingle();
        setUser(profile);
      }
    };
    fetchUser();
  }, []);
  
  return user;
}

export function TaskFieldsGrid({ task, onFieldChange }: TaskFieldsGridProps) {
  const { data: profiles = [] } = useProfiles();
  const { data: teams = [] } = useTeams();
  const currentUser = useCurrentUser();

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Priority */}
      <FieldCard label="Priority" icon={<Flag className="w-3.5 h-3.5" />}>
        <PrioritySelect
          value={task.priority}
          onChange={(priority) => onFieldChange('priority', priority)}
        />
      </FieldCard>

      {/* Assignee */}
      <FieldCard label="Assignee" icon={<User className="w-3.5 h-3.5" />}>
        <AssigneeSelect
          value={task.assignee_id}
          currentAssignee={task.assignee}
          profiles={profiles}
          onChange={(id) => onFieldChange('assignee_id', id)}
        />
      </FieldCard>

      {/* Reported By - Read Only */}
      <FieldCard label="Reported By" icon={<UserCheck className="w-3.5 h-3.5" />}>
        <div className="flex items-center gap-2">
          {currentUser ? (
            <>
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-semibold text-white">
                {currentUser.full_name?.charAt(0) || '?'}
              </div>
              <span className="text-sm font-medium text-gray-600 truncate">
                {currentUser.full_name || 'Unknown'}
              </span>
            </>
          ) : (
            <span className="text-sm text-gray-400">Loading...</span>
          )}
        </div>
      </FieldCard>

      {/* Workstream */}
      <FieldCard label="Workstream" icon={<Layers className="w-3.5 h-3.5" />}>
        <WorkstreamSelect
          value={task.workstream_id}
          currentWorkstream={task.workstream}
          teams={teams}
          onChange={(id) => onFieldChange('workstream_id', id)}
        />
      </FieldCard>

      {/* Start Date */}
      <FieldCard label="Start Date" icon={<Calendar className="w-3.5 h-3.5" />}>
        <DatePicker
          value={task.start_date}
          onChange={(date) => onFieldChange('start_date', date)}
          placeholder="Set start date"
        />
      </FieldCard>

      {/* Due Date - WITH URGENCY */}
      <FieldCard label="Due Date" icon={<Clock className="w-3.5 h-3.5" />}>
        <DueDatePicker
          value={task.due_date}
          onChange={(date) => onFieldChange('due_date', date)}
        />
      </FieldCard>
    </div>
  );
}

// Field Card Wrapper with hover states
function FieldCard({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="group p-3 bg-gray-50 rounded-lg border border-transparent hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-gray-400">{icon}</span>
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  );
}

// Priority Select with icons
function PrioritySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const config = PRIORITY_CONFIG[value as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full text-left">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold",
            config.bg, config.text
          )}>
            <span>{config.icon}</span>
            {config.label}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="start">
        {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => { onChange(key); setOpen(false); }}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors",
              value === key ? "bg-gray-100" : "hover:bg-gray-50"
            )}
          >
            <span className={cn("px-2 py-0.5 rounded text-xs font-semibold", cfg.bg, cfg.text)}>
              {cfg.icon} {cfg.label}
            </span>
            {value === key && <Check className="w-4 h-4 ml-auto text-primary" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// Assignee Select with avatar
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full flex items-center gap-2.5 text-left">
          {currentAssignee ? (
            <>
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-semibold text-primary-foreground">
                {currentAssignee.full_name?.charAt(0) || '?'}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-700 truncate">{currentAssignee.full_name}</div>
              </div>
            </>
          ) : (
            <>
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-3 h-3 text-gray-400" />
              </div>
              <span className="text-sm text-gray-400">Unassigned</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        <button
          onClick={() => { onChange(null); setOpen(false); }}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded hover:bg-gray-50"
        >
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <span className="text-sm text-gray-400">Unassigned</span>
        </button>
        {profiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => { onChange(profile.id); setOpen(false); }}
            className={cn(
              "w-full flex items-center gap-2.5 px-2 py-2 rounded transition-colors",
              value === profile.id ? "bg-gray-100" : "hover:bg-gray-50"
            )}
          >
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[10px] font-semibold text-primary-foreground">
              {profile.full_name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-medium text-gray-700 truncate">{profile.full_name || 'Unnamed'}</div>
              <div className="text-[11px] text-gray-400 truncate">{profile.email}</div>
            </div>
            {value === profile.id && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// Workstream Select
function WorkstreamSelect({ 
  value, 
  currentWorkstream, 
  teams, 
  onChange 
}: { 
  value: string | null; 
  currentWorkstream: any; 
  teams: any[]; 
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full flex items-center gap-2 text-left">
          <Users className="w-4 h-4 text-gray-400" />
          <span className={cn("text-sm font-medium truncate", currentWorkstream ? "text-gray-700" : "text-gray-400")}>
            {currentWorkstream?.name || 'Select workstream'}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1 max-h-64 overflow-auto" align="start">
        <button
          onClick={() => { onChange(null); setOpen(false); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-50"
        >
          <span className="text-sm text-gray-400">No workstream</span>
        </button>
        {teams.map((team) => (
          <button
            key={team.id}
            onClick={() => { onChange(team.id); setOpen(false); }}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded transition-colors",
              value === team.id ? "bg-gray-100" : "hover:bg-gray-50"
            )}
          >
            <span className="text-sm text-gray-700">{team.name}</span>
            {value === team.id && <Check className="w-4 h-4 text-primary" />}
          </button>
        ))}
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
        <button className="w-full flex items-center gap-2 text-left">
          <span className={cn("text-sm font-medium", value ? "text-gray-700" : "text-gray-400")}>
            {value ? format(new Date(value), 'MMM d, yyyy') : placeholder || 'Select date'}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="single"
          selected={value ? new Date(value) : undefined}
          onSelect={(date) => {
            onChange(date?.toISOString().split('T')[0] || null);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

// Due Date Picker with urgency indicator
function DueDatePicker({ value, onChange }: { value: string | null; onChange: (date: string | null) => void }) {
  const [open, setOpen] = useState(false);
  
  const urgency = useMemo(() => {
    if (!value) return null;
    const diff = differenceInDays(new Date(value), new Date());
    if (diff < 0) return { label: 'Overdue', variant: 'danger' as const };
    if (diff === 0) return { label: 'Due today', variant: 'danger' as const };
    if (diff <= 3) return { label: `${diff}d left`, variant: 'warning' as const };
    if (diff <= 7) return { label: `${diff} days`, variant: 'safe' as const };
    return null;
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full flex items-center gap-2 text-left">
          <span className={cn("text-sm font-medium", value ? "text-gray-700" : "text-gray-400")}>
            {value ? format(new Date(value), 'MMM d, yyyy') : 'Set due date'}
          </span>
          {urgency && (
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide",
              urgency.variant === 'safe' && "bg-emerald-50 text-emerald-600",
              urgency.variant === 'warning' && "bg-amber-50 text-amber-600",
              urgency.variant === 'danger' && "bg-red-50 text-red-600 animate-pulse"
            )}>
              {urgency.label}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="single"
          selected={value ? new Date(value) : undefined}
          onSelect={(date) => {
            onChange(date?.toISOString().split('T')[0] || null);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
