// ============================================================
// MODAL HEADER V2 - ENTERPRISE CLEAN DESIGN
// 18px title, status bar: Status, Priority, Workstream, Assignee
// ============================================================

import { useState, useMemo, useRef, useEffect } from 'react';
import { X, ChevronDown, Check, Link2, MoreHorizontal, Edit, Copy, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getWorkstreamColor } from '@/lib/workstream-colors';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useUserRole } from '@/hooks/useUserRole';

interface DrawerHeaderProps {
  task: any;
  onClose: () => void;
  onTitleChange: (title: string) => void;
  onStatusChange: (statusId: string) => void;
  onAssigneeChange?: (assigneeId: string | null) => void;
  onWorkstreamChange?: (workstreamId: string | null) => void;
  onPriorityChange?: (priority: string) => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
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

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#dc2626' },
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
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
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
    gcTime: 30 * 60 * 1000,
  });
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

// Priority Selector Dropdown
function PrioritySelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (priority: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const config = PRIORITY_CONFIG[value] || PRIORITY_CONFIG.medium;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="task-modal__status-value">
          <span
            className="task-modal__status-dot"
            style={{ backgroundColor: config.color }}
          />
          <span>{config.label}</span>
          <span className="task-modal__status-chevron">▾</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-44 p-1.5 z-[500] bg-popover"
        align="start"
      >
        {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => {
              onChange(key);
              setOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
              value === key ? 'bg-muted font-semibold' : 'hover:bg-muted/50'
            )}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
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
  value,
  currentWorkstream,
  onChange,
}: {
  value: string | null;
  currentWorkstream: any;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: workstreams = [] } = useWorkstreams();

  const displayWorkstream = workstreams.find((w) => w.id === value) || currentWorkstream || null;
  const wsColors = getWorkstreamColor(displayWorkstream?.name || '');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="task-modal__status-value">
          <span
            className="task-modal__status-dot"
            style={{ backgroundColor: wsColors.hex }}
          />
          <span>{displayWorkstream?.name || 'None'}</span>
          <span className="task-modal__status-chevron">▾</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-1.5 z-[500] bg-popover max-h-[280px] overflow-y-auto"
        align="start"
      >
        <button
          onClick={() => { onChange(null); setOpen(false); }}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
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
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
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

// Enterprise avatar color generator - consistent vibrant colors based on name
function getAvatarColor(name: string): string {
  const colors = [
    'hsl(220, 90%, 56%)',  // Blue
    'hsl(262, 83%, 58%)',  // Purple
    'hsl(158, 64%, 40%)',  // Teal
    'hsl(340, 82%, 52%)',  // Pink
    'hsl(24, 95%, 53%)',   // Orange
    'hsl(142, 71%, 45%)',  // Green
    'hsl(199, 89%, 48%)',  // Sky
    'hsl(47, 96%, 53%)',   // Amber
    'hsl(291, 64%, 52%)',  // Fuchsia
    'hsl(174, 72%, 40%)',  // Cyan
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Assignee Selector with enterprise-level avatars
function AssigneeSelector({
  value,
  currentAssignee,
  onChange,
}: {
  value: string | null;
  currentAssignee: any;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { data: profiles = [] } = useProfiles();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const displayAssignee = profiles.find((p) => p.id === value) || currentAssignee || null;

  const filteredProfiles = useMemo(() => {
    if (!search.trim()) return profiles;
    const lower = search.toLowerCase();
    return profiles.filter(p => 
      p.full_name?.toLowerCase().includes(lower) || 
      p.email?.toLowerCase().includes(lower)
    );
  }, [profiles, search]);

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <button className="task-modal__status-value task-modal__assignee-trigger">
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
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-white shadow-sm"
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
          <span className="task-modal__status-chevron">▾</span>
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

export function DrawerHeader({ 
  task, 
  onClose, 
  onTitleChange, 
  onStatusChange,
  onAssigneeChange,
  onWorkstreamChange,
  onPriorityChange,
  onEdit,
  onDuplicate,
  onDelete,
  saveStatus = 'idle' 
}: DrawerHeaderProps) {
  const workstreamName = task.workstream?.name || '';
  const taskKey = task.task_key || task.key || '';

  const handleCopyLink = () => {
    const url = `${window.location.origin}/taskhub/task-list?task=${task.id}`;
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
          
          {/* Kebab Menu - Functional */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="task-modal__action-btn" title="More options">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover z-[600]">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
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

      {/* Status Bar - 4 fields: Status, Priority, Workstream, Assignee */}
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
        
        {/* Priority (replaces Health) */}
        <div className="task-modal__status-field">
          <span className="task-modal__status-label">Priority</span>
          <PrioritySelector
            value={task.priority || 'medium'}
            onChange={(priority) => onPriorityChange?.(priority)}
          />
        </div>
        
        {/* Workstream - Now editable */}
        <div className="task-modal__status-field">
          <span className="task-modal__status-label">Workstream</span>
          <WorkstreamSelector
            value={task.workstream_id || task.workstream?.id || null}
            currentWorkstream={task.workstream}
            onChange={(id) => onWorkstreamChange?.(id)}
          />
        </div>
        
        {/* Assignee - Enterprise avatars with vibrant colors */}
        <div className="task-modal__status-field">
          <span className="task-modal__status-label">Assignee</span>
          <AssigneeSelector
            value={task.assignee_id || task.assignee?.id || null}
            currentAssignee={task.assignee}
            onChange={(id) => onAssigneeChange?.(id)}
          />
        </div>
      </div>
    </div>
  );
}
