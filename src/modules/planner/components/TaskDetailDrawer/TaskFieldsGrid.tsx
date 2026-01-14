// ============================================================
// TASK FIELDS GRID COMPONENT
// 2-column grid of editable task fields
// ============================================================

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  Users, 
  Calendar, 
  Flag,
  ChevronDown,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CATALYST_COLORS } from '../../types/kanban';

interface TaskFieldsGridProps {
  task: any;
  onFieldChange: (field: string, value: any) => void;
}

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: CATALYST_COLORS.gray700 },
  high: { label: 'High', color: CATALYST_COLORS.gray600 },
  medium: { label: 'Medium', color: CATALYST_COLORS.gray500 },
  low: { label: 'Low', color: CATALYST_COLORS.gray400 },
} as const;

function useProfiles() {
  return useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
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

export function TaskFieldsGrid({ task, onFieldChange }: TaskFieldsGridProps) {
  const { data: profiles = [] } = useProfiles();
  const { data: teams = [] } = useTeams();

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Priority */}
      <FieldRow icon={Flag} label="Priority">
        <PriorityDropdown
          value={task.priority}
          onChange={(priority) => onFieldChange('priority', priority)}
        />
      </FieldRow>

      {/* Assignee */}
      <FieldRow icon={User} label="Assignee">
        <AssigneeDropdown
          value={task.assignee_id}
          currentAssignee={task.assignee}
          profiles={profiles}
          onChange={(id) => onFieldChange('assignee_id', id)}
        />
      </FieldRow>

      {/* Workstream */}
      <FieldRow icon={Users} label="Workstream">
        <WorkstreamDropdown
          value={task.workstream_id}
          currentWorkstream={task.workstream}
          teams={teams}
          onChange={(id) => onFieldChange('workstream_id', id)}
        />
      </FieldRow>

      {/* Start Date */}
      <FieldRow icon={Calendar} label="Start Date">
        <DatePicker
          value={task.start_date}
          onChange={(date) => onFieldChange('start_date', date)}
          placeholder="Set start date"
        />
      </FieldRow>

      {/* Due Date */}
      <FieldRow icon={Calendar} label="Due Date">
        <DueDatePicker
          value={task.due_date}
          onChange={(date) => onFieldChange('due_date', date)}
        />
      </FieldRow>

      {/* Progress */}
      <FieldRow icon={Flag} label="Progress">
        <ProgressInput
          value={task.progress || 0}
          onChange={(progress) => onFieldChange('progress', progress)}
        />
      </FieldRow>
    </div>
  );
}

// Field Row wrapper
function FieldRow({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </label>
      {children}
    </div>
  );
}

// Priority Dropdown
function PriorityDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const config = PRIORITY_CONFIG[value as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm font-medium hover:bg-muted transition-colors w-full">
          <span 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: config.color }}
          />
          {config.label}
          <ChevronDown className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => onChange(key)}
            className="flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
              {cfg.label}
            </span>
            {value === key && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Assignee Dropdown
function AssigneeDropdown({ 
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm hover:bg-muted transition-colors w-full">
          {currentAssignee ? (
            <>
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-semibold text-primary-foreground">
                {currentAssignee.full_name?.charAt(0) || '?'}
              </div>
              <span className="font-medium truncate">{currentAssignee.full_name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          )}
          <ChevronDown className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 max-h-64 overflow-auto">
        <DropdownMenuItem onClick={() => onChange(null)}>
          <span className="text-muted-foreground">Unassigned</span>
        </DropdownMenuItem>
        {profiles.map((profile) => (
          <DropdownMenuItem
            key={profile.id}
            onClick={() => onChange(profile.id)}
            className="flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-semibold text-primary-foreground">
                {profile.full_name?.charAt(0) || '?'}
              </div>
              <span className="truncate">{profile.full_name || 'Unnamed'}</span>
            </span>
            {value === profile.id && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Workstream Dropdown
function WorkstreamDropdown({ 
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm hover:bg-muted transition-colors w-full">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className={cn("font-medium truncate", !currentWorkstream && "text-muted-foreground")}>
            {currentWorkstream?.name || 'Select workstream'}
          </span>
          <ChevronDown className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 max-h-64 overflow-auto">
        <DropdownMenuItem onClick={() => onChange(null)}>
          <span className="text-muted-foreground">No workstream</span>
        </DropdownMenuItem>
        {teams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onClick={() => onChange(team.id)}
            className="flex items-center justify-between"
          >
            {team.name}
            {value === team.id && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
        <button className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm hover:bg-muted transition-colors w-full">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className={cn("font-medium", !value && "text-muted-foreground")}>
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

// Due Date Picker with urgency
function DueDatePicker({ value, onChange }: { value: string | null; onChange: (date: string | null) => void }) {
  const [open, setOpen] = useState(false);
  
  const getUrgency = () => {
    if (!value) return null;
    const due = new Date(value);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: 'Overdue', color: CATALYST_COLORS.danger };
    if (diffDays === 0) return { label: 'Due today', color: CATALYST_COLORS.danger };
    if (diffDays <= 3) return { label: `${diffDays}d left`, color: CATALYST_COLORS.warning };
    return null;
  };
  
  const urgency = getUrgency();
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm hover:bg-muted transition-colors w-full">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className={cn("font-medium", !value && "text-muted-foreground")}>
            {value ? format(new Date(value), 'MMM d, yyyy') : 'Set due date'}
          </span>
          {urgency && (
            <span 
              className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-semibold"
              style={{ 
                backgroundColor: `${urgency.color}15`,
                color: urgency.color 
              }}
            >
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

// Progress Input
function ProgressInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-lg">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
      <input
        type="number"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
        className="w-12 text-sm font-medium text-center bg-transparent border-none outline-none"
      />
      <span className="text-xs text-muted-foreground">%</span>
    </div>
  );
}
