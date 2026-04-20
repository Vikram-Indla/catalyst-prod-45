// ============================================================
// SIDEBAR FIELDS - V3 Layout (Right-side panel)
// STATUS, PRIORITY, WORKSTREAM, ASSIGNEE, LABELS with keyboard shortcuts
// ============================================================

import { useState, useMemo, useRef, useEffect } from 'react';
import { Check, ChevronDown, Star, User, Plus, Loader2, X, Tag } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Lozenge } from '@/components/ads';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getWorkstreamColor } from '@/lib/workstream-colors';
import { useAuth } from '@/lib/auth';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

interface SidebarFieldsProps {
  task: any;
  onFieldChange: (field: string, value: any) => void;
}

// Label colors
const LABEL_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  red: { bg: 'bg-red-500', text: 'text-white', hex: '#ef4444' },
  orange: { bg: 'bg-orange-500', text: 'text-white', hex: '#f97316' },
  yellow: { bg: 'bg-yellow-500', text: 'text-black', hex: '#eab308' },
  green: { bg: 'bg-green-500', text: 'text-white', hex: '#22c55e' },
  blue: { bg: 'bg-blue-500', text: 'text-white', hex: '#3b82f6' },
  purple: { bg: 'bg-purple-500', text: 'text-white', hex: '#a855f7' },
  pink: { bg: 'bg-pink-500', text: 'text-white', hex: '#ec4899' },
  gray: { bg: 'bg-gray-500', text: 'text-white', hex: '#6b7280' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  backlog: { label: 'Backlog', color: '#94a3b8' },
  planned: { label: 'Planned', color: '#3b82f6' },
  'in-progress': { label: 'In Progress', color: '#0284c7' },
  in_progress: { label: 'In Progress', color: '#0284c7' },
  review: { label: 'Review', color: '#8b5cf6' },
  done: { label: 'Done', color: '#16a34a' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon?: boolean }> = {
  critical: { label: 'Critical', color: '#dc2626', icon: true },
  high: { label: 'High', color: '#ca8a04' },
  medium: { label: 'Medium', color: '#2563eb' },
  low: { label: 'Low', color: '#94a3b8' },
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
  });
}

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
        const { data, error } = await supabase
          .from('planner_workstreams')
          .select('id, name')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        return data || [];
      }

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
  });
}

function getAvatarColor(name: string): string {
  // CLAUDE.md §L38 — hex literals only (no HSL).
  // Catalyst avatar palette — bold, visually distinct.
  const colors = [
    '#2A6DF4',  // Blue
    '#7C3BED',  // Purple
    '#25A777',  // Teal
    '#E92063',  // Magenta
    '#F97015',  // Orange
    '#21C45D',  // Green
    '#0DA2E7',  // Sky Blue
    '#FAC814',  // Yellow
    '#BB36D3',  // Violet
    '#1DAFA1',  // Cyan
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string | null) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export function SidebarFields({ task, onFieldChange }: SidebarFieldsProps) {
  const { data: statuses = [] } = useStatuses();
  const { data: profiles = [] } = useProfiles();
  const { data: workstreams = [] } = useWorkstreams();

  const currentStatus = statuses.find((s: any) => s.id === task.status_id) || task.status;
  const statusSlug = currentStatus?.slug || 'backlog';
  const statusConfig = STATUS_CONFIG[statusSlug] || STATUS_CONFIG.backlog;

  const priorityConfig = PRIORITY_CONFIG[task.priority || 'medium'] || PRIORITY_CONFIG.medium;
  
  const displayWorkstream = workstreams.find((w) => w.id === task.workstream_id) || task.workstream || null;
  const wsColors = getWorkstreamColor(displayWorkstream?.name || '');

  const displayAssignee = profiles.find((p) => p.id === task.assignee_id) || task.assignee || null;

  return (
    <div className="task-modal-v3__fields">
      {/* STATUS */}
      <SidebarField 
        label="STATUS" 
        shortcut="S"
      >
        <StatusSelector
          statuses={statuses}
          currentStatus={currentStatus}
          statusConfig={statusConfig}
          onChange={(id) => onFieldChange('status_id', id)}
        />
      </SidebarField>

      {/* PRIORITY */}
      <SidebarField 
        label="PRIORITY" 
        shortcut="P"
      >
        <PrioritySelector
          value={task.priority || 'medium'}
          config={priorityConfig}
          onChange={(val) => onFieldChange('priority', val)}
        />
      </SidebarField>

      {/* WORKSTREAM */}
      <SidebarField 
        label="WORKSTREAM" 
        shortcut="W"
      >
        <WorkstreamSelector
          workstreams={workstreams}
          value={task.workstream_id || null}
          displayWorkstream={displayWorkstream}
          wsColors={wsColors}
          onChange={(id) => onFieldChange('workstream_id', id)}
        />
      </SidebarField>

      {/* ASSIGNEE */}
      <SidebarField 
        label="ASSIGNEE" 
        shortcut="A"
      >
        <AssigneeSelector
          profiles={profiles}
          value={task.assignee_id || null}
          displayAssignee={displayAssignee}
          onChange={(id) => onFieldChange('assignee_id', id)}
        />
      </SidebarField>

      {/* LABELS */}
      <SidebarField 
        label="LABELS" 
        shortcut="L"
      >
        <LabelsField taskId={task.id} />
      </SidebarField>
    </div>
  );
}

// Field wrapper with label and keyboard shortcut badge
function SidebarField({ 
  label, 
  shortcut, 
  children 
}: { 
  label: string; 
  shortcut: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="task-modal-v3__field">
      <div className="task-modal-v3__field-header">
        <span className="task-modal-v3__field-label">{label}</span>
        <span className="task-modal-v3__field-shortcut">{shortcut}</span>
      </div>
      {children}
    </div>
  );
}

// Status Selector
function StatusSelector({
  statuses,
  currentStatus,
  statusConfig,
  onChange,
}: {
  statuses: any[];
  currentStatus: any;
  statusConfig: { label: string; color: string };
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="task-modal-v3__field-value">
          <span className="task-modal-v3__status-dot" style={{ backgroundColor: statusConfig.color }} />
          <span>{currentStatus?.name || statusConfig.label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1.5 z-[100001] bg-popover" align="start" sideOffset={4}>
        {statuses.map((status: any) => {
          const slug = status.slug || 'backlog';
          const cfg = STATUS_CONFIG[slug] || STATUS_CONFIG.backlog;
          const isSelected = currentStatus?.id === status.id;

          return (
            <button
              key={status.id}
              onClick={() => { onChange(status.id); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
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

// Priority Selector
function PrioritySelector({
  value,
  config,
  onChange,
}: {
  value: string;
  config: { label: string; color: string; icon?: boolean };
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="task-modal-v3__field-value">
          {config.icon && <Star className="w-4 h-4" style={{ color: config.color, fill: config.color }} />}
          {!config.icon && <span className="task-modal-v3__status-dot" style={{ backgroundColor: config.color }} />}
          <span>{config.label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1.5 z-[100001] bg-popover" align="start" sideOffset={4}>
        {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => { onChange(key); setOpen(false); }}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
              value === key ? 'bg-muted font-semibold' : 'hover:bg-muted/50'
            )}
          >
            {cfg.icon ? (
              <Star className="w-4 h-4" style={{ color: cfg.color, fill: cfg.color }} />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
            )}
            <span>{cfg.label}</span>
            {value === key && <Check className="w-4 h-4 ml-auto text-primary" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// Workstream Selector
function WorkstreamSelector({
  workstreams,
  value,
  displayWorkstream,
  wsColors,
  onChange,
}: {
  workstreams: any[];
  value: string | null;
  displayWorkstream: any;
  wsColors: { hex: string };
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="task-modal-v3__field-value">
          <span className="task-modal-v3__status-dot" style={{ backgroundColor: wsColors.hex }} />
          <span>{displayWorkstream?.name || 'None'}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1.5 z-[100001] bg-popover max-h-[280px] overflow-y-auto" align="start" sideOffset={4}>
        <button
          onClick={() => { onChange(null); setOpen(false); }}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
            !value ? "bg-muted font-semibold" : "hover:bg-muted/50"
          )}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/60" />
          <span className="text-muted-foreground">None</span>
          {!value && <Check className="w-4 h-4 ml-auto text-primary" />}
        </button>
        {workstreams.map((ws) => {
          const colors = getWorkstreamColor(ws.name);
          return (
            <button
              key={ws.id}
              onClick={() => { onChange(ws.id); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                value === ws.id ? "bg-muted font-semibold" : "hover:bg-muted/50"
              )}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.hex }} />
              <span>{ws.name}</span>
              {value === ws.id && <Check className="w-4 h-4 ml-auto text-primary" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

// Assignee Selector
function AssigneeSelector({
  profiles,
  value,
  displayAssignee,
  onChange,
}: {
  profiles: any[];
  value: string | null;
  displayAssignee: any;
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
        <button className="task-modal-v3__field-value task-modal-v3__assignee-value">
          {displayAssignee ? (
            <>
              {displayAssignee.avatar_url ? (
                <img
                  src={displayAssignee.avatar_url}
                  alt={displayAssignee.full_name}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-white"
                  style={{ backgroundColor: getAvatarColor(displayAssignee.full_name || '') }}
                >
                  {getInitials(displayAssignee.full_name)}
                </div>
              )}
              <span>{displayAssignee.full_name}</span>
            </>
          ) : (
            <>
              <div className="w-5 h-5 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
                <span className="text-[9px] text-muted-foreground">+</span>
              </div>
              <span className="text-muted-foreground">Unassigned</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 p-0 z-[100001] bg-popover shadow-xl border border-border/60" 
        align="start"
        sideOffset={4}
      >
        <div className="p-3 border-b border-border/60">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search people..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="max-h-[280px] overflow-y-auto p-2">
          <button
            onMouseDown={(e) => { e.preventDefault(); onChange(null); setOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
              !value ? "bg-primary/10 font-medium" : "hover:bg-muted/60"
            )}
          >
            <div className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-muted-foreground">+</span>
            </div>
            <span className="text-muted-foreground">Unassigned</span>
            {!value && <Check className="w-4 h-4 ml-auto text-primary" />}
          </button>
          {filteredProfiles.map((profile) => {
            const avatarColor = getAvatarColor(profile.full_name || profile.email || '');
            return (
              <button
                key={profile.id}
                onMouseDown={(e) => { e.preventDefault(); onChange(profile.id); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  value === profile.id ? "bg-primary/10 font-medium" : "hover:bg-muted/60"
                )}
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 shadow-sm"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {getInitials(profile.full_name)}
                  </div>
                )}
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium truncate">{profile.full_name || 'Unnamed'}</div>
                  {profile.email && (
                    <div className="text-xs text-muted-foreground truncate">{profile.email}</div>
                  )}
                </div>
                {value === profile.id && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Labels Field - matching sidebar field styling
function LabelsField({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const queryClient = useQueryClient();
  
  const { isProgramManager, isSuperAdmin } = useUserRole();
  const canDeleteLabels = isProgramManager || isSuperAdmin;

  // Fetch all available labels
  const { data: allLabels = [] } = useQuery({
    queryKey: ['task-labels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_labels')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string; color: string }[];
    },
  });

  // Fetch assigned labels for this task
  const { data: assignedLabelIds = [] } = useQuery({
    queryKey: ['task-label-assignments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_label_assignments')
        .select('label_id')
        .eq('task_id', taskId);
      if (error) throw error;
      return data.map(d => d.label_id);
    },
    enabled: !!taskId,
  });

  // Toggle label assignment
  const toggleLabel = useMutation({
    mutationFn: async (labelId: string) => {
      const isAssigned = assignedLabelIds.includes(labelId);
      
      if (isAssigned) {
        const { error } = await supabase
          .from('task_label_assignments')
          .delete()
          .eq('task_id', taskId)
          .eq('label_id', labelId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('task_label_assignments')
          .insert({ task_id: taskId, label_id: labelId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-label-assignments', taskId] });
    },
    onError: () => {
      toast.error('Failed to update label');
    },
  });

  // Create new label
  const createLabel = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('task_labels')
        .insert({ name, color: 'blue' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-labels'] });
      toggleLabel.mutate(data.id);
      setNewLabelName('');
      setIsCreating(false);
      toast.success('Label created');
    },
    onError: (err: any) => {
      if (err.message?.includes('duplicate')) {
        toast.error('Label already exists');
      } else {
        toast.error('Failed to create label');
      }
    },
  });

  // Delete label
  const deleteLabel = useMutation({
    mutationFn: async (labelId: string) => {
      const { error: assignError } = await supabase
        .from('task_label_assignments')
        .delete()
        .eq('label_id', labelId);
      if (assignError) throw assignError;
      
      const { error } = await supabase
        .from('task_labels')
        .delete()
        .eq('id', labelId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-labels'] });
      queryClient.invalidateQueries({ queryKey: ['task-label-assignments'] });
      toast.success('Label deleted');
    },
    onError: () => {
      toast.error('Failed to delete label');
    },
  });

  const getColorClasses = (color: string) => {
    return LABEL_COLORS[color] || LABEL_COLORS.gray;
  };

  const assignedLabels = allLabels.filter(l => assignedLabelIds.includes(l.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="task-modal-v3__field-value">
          {assignedLabels.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {assignedLabels.slice(0, 3).map(label => {
                return (
                  <Lozenge key={label.id} appearance="default">
                    {label.name}
                  </Lozenge>
                );
              })}
              {assignedLabels.length > 3 && (
                <span className="text-xs text-muted-foreground">+{assignedLabels.length - 3}</span>
              )}
            </div>
          ) : (
            <>
              <Tag className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Add labels...</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 z-[100001] bg-popover" align="start" sideOffset={4}>
        <div className="p-2 border-b border-border">
          <p className="text-sm font-medium text-foreground">Select Labels</p>
        </div>
        <div className="max-h-[280px] overflow-y-auto p-1">
          {allLabels.map(label => {
            const colors = getColorClasses(label.color);
            const isSelected = assignedLabelIds.includes(label.id);
            
            return (
              <div
                key={label.id}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2 py-2 rounded transition-colors group",
                  isSelected ? "bg-muted" : "hover:bg-muted/50"
                )}
              >
                <button
                  onClick={() => toggleLabel.mutate(label.id)}
                  disabled={toggleLabel.isPending}
                  className="flex-1 flex items-center gap-2.5"
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.hex }} />
                  <span className="text-sm flex-1 text-left">{label.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary" />}
                </button>
                
                {canDeleteLabels && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteLabel.mutate(label.id);
                    }}
                    disabled={deleteLabel.isPending}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-opacity"
                    title="Delete label"
                  >
                    {deleteLabel.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    ) : (
                      <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="p-2 border-t border-border">
          {isCreating ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newLabelName.trim()) {
                    createLabel.mutate(newLabelName.trim());
                  }
                  if (e.key === 'Escape') {
                    setIsCreating(false);
                    setNewLabelName('');
                  }
                }}
                placeholder="Label name..."
                className="flex-1 px-2 py-1 text-sm bg-muted rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => newLabelName.trim() && createLabel.mutate(newLabelName.trim())}
                disabled={!newLabelName.trim() || createLabel.isPending}
                className="p-1 hover:bg-muted rounded"
              >
                {createLabel.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
              Create new label
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
