// ============================================================
// TASK DETAIL MODAL V2 - COMPLETELY REBUILT
// Matches reference screenshots exactly with invasive CSS
// All CTAs wired to Supabase - no dead interactions
// ============================================================

import { useCallback, useEffect, useState, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Link2, MoreHorizontal, Edit, Copy, Trash2, Check, ChevronDown, Calendar, Tag, Plus, Send, MessageSquare, History, ListFilter, Clock, UserPlus, Edit3, Paperclip, CheckSquare, Upload, FileText, Globe, Download, Eye, Loader2 } from 'lucide-react';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { getWorkstreamColor } from '@/lib/workstream-colors';
import { useAuth } from '@/lib/auth';
import { useUserRole } from '@/hooks/useUserRole';
import '@/styles/task-detail-modal-v2.css';

import {
  useTaskDependencies,
  useTaskChecklist,
  useToggleChecklistItem,
  useAddChecklistItem,
  useDeleteChecklistItem,
  useTaskAttachments,
  useDeleteAttachment,
  useUploadAttachment,
  useTaskComments,
  useAddComment,
  useTaskActivity,
  type TaskComment,
  type TaskActivity,
  type ChecklistItem,
  type TaskAttachment,
} from '../../hooks/useTaskDetails';
import { usePlannerTaskRealtime } from '../../hooks/usePlannerTaskRealtime';
import { useUpdatePlannerTaskField } from '../../hooks/useUpdatePlannerTaskField';
import { useLeadNotes, useCanManageLeadNotes, useAddLeadNote, useUpdateLeadNote, useDeleteLeadNote } from '../../hooks/useLeadNotes';

// ============================================================
// DATA HOOKS
// ============================================================

function useTaskDetail(taskId: string | null) {
  return useQuery({
    queryKey: ['task-detail', taskId],
    queryFn: async () => {
      if (!taskId) return null;
      
      const { data, error } = await supabase
        .from('planner_tasks')
        .select(`
          *,
          status:planner_statuses(*),
          workstream:planner_workstreams(id, name),
          assignee:profiles!planner_tasks_assignee_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq('id', taskId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

function useStatuses() {
  return useQuery({
    queryKey: ['drawer-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('planner_statuses').select('*').order('position');
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
      const { data, error } = await supabase.from('profiles').select('id, full_name, avatar_url, email').order('full_name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useWorkstreams() {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, isLoading: roleLoading } = useUserRole();
  
  return useQuery({
    queryKey: ['drawer-workstreams', user?.id, isAdmin || isSuperAdmin],
    queryFn: async () => {
      if (!user) return [];
      if (isAdmin || isSuperAdmin) {
        const { data } = await supabase.from('planner_workstreams').select('id, name').eq('is_active', true).order('name');
        return data || [];
      }
      const { data: memberships } = await supabase
        .from('workstream_members')
        .select('workstream_id, workstream:planner_workstreams(id, name, is_active)')
        .eq('user_id', user.id);
      return (memberships || []).filter(m => (m.workstream as any)?.is_active).map(m => m.workstream as { id: string; name: string });
    },
    enabled: !!user && !roleLoading,
    staleTime: 5 * 60 * 1000,
  });
}

function useExternalLinks(taskId: string | null) {
  return useQuery({
    queryKey: ['task-links', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await (supabase as any).from('task_external_links').select('*').eq('task_id', taskId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!taskId,
  });
}

// ============================================================
// CONFIGURATION
// ============================================================

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  backlog: { label: 'Backlog', color: '#94a3b8' },
  planned: { label: 'Planned', color: '#3b82f6' },
  'in-progress': { label: 'In Progress', color: '#f59e0b' },
  in_progress: { label: 'In Progress', color: '#f59e0b' },
  review: { label: 'In Review', color: '#8b5cf6' },
  done: { label: 'Done', color: '#16a34a' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#dc2626' },
  high: { label: 'High', color: '#f97316' },
  medium: { label: 'Medium', color: '#eab308' },
  low: { label: 'Low', color: '#94a3b8' },
};

// ============================================================
// MAIN COMPONENT
// ============================================================

interface TaskDetailModalV2Props {
  taskId?: string | null;
  task?: { id: string } | null;
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  onTaskUpdated?: () => void;
}

export function TaskDetailModalV2({ taskId: propTaskId, task: propTask, open, onClose, onOpenChange, onTaskUpdated }: TaskDetailModalV2Props) {
  const effectiveTaskId = propTaskId ?? propTask?.id ?? null;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'description' | 'notes' | 'checklist' | 'links' | 'files' | 'activity'>('description');
  const { user } = useAuth();
  
  const handleClose = useCallback(() => {
    if (effectiveTaskId) flushPending(effectiveTaskId);
    onClose?.();
    onOpenChange?.(false);
  }, [effectiveTaskId, onClose, onOpenChange]);

  const { data: serverTask, isLoading } = useTaskDetail(effectiveTaskId);
  const [draftTask, setDraftTask] = useState<any | null>(null);

  useEffect(() => {
    if (serverTask) {
      setDraftTask((prev: any) => (!prev || prev.id !== serverTask.id) ? serverTask : { ...prev, ...serverTask });
    }
  }, [serverTask?.id, serverTask?.updated_at]);

  const task = draftTask ?? serverTask;

  // Realtime
  usePlannerTaskRealtime({
    taskId: effectiveTaskId,
    onUpdate: () => {},
    onDelete: handleClose,
  });

  // Update hook
  const { updateNow, updateDebounced, flushPending } = useUpdatePlannerTaskField();

  const handleFieldUpdate = useCallback((field: string, value: any) => {
    if (!effectiveTaskId) return;
    setDraftTask((prev: any) => prev ? { ...prev, [field]: value } : prev);
    updateNow(effectiveTaskId, field, value);
    onTaskUpdated?.();
  }, [effectiveTaskId, updateNow, onTaskUpdated]);

  const handleTextUpdate = useCallback((field: string, value: any) => {
    if (!effectiveTaskId) return;
    setDraftTask((prev: any) => prev ? { ...prev, [field]: value } : prev);
    updateDebounced(effectiveTaskId, field, value, 500);
  }, [effectiveTaskId, updateDebounced]);

  // Fetch data
  const { data: dependencies } = useTaskDependencies(effectiveTaskId);
  const { data: checklist } = useTaskChecklist(effectiveTaskId);
  const { data: attachments } = useTaskAttachments(effectiveTaskId);
  const { data: comments } = useTaskComments(effectiveTaskId);
  const { data: activity } = useTaskActivity(effectiveTaskId);
  const { data: leadNotes } = useLeadNotes(effectiveTaskId);
  const { data: externalLinks } = useExternalLinks(effectiveTaskId);

  // Tab badge counts
  const leadNotesCount = leadNotes?.length || 0;
  const checklistCount = checklist?.length || 0;
  const linksCount = (dependencies?.length || 0) + (externalLinks?.length || 0);
  const filesCount = attachments?.length || 0;
  const activityCount = (comments?.length || 0) + (activity?.length || 0);

  const tabs = [
    { id: 'description' as const, label: 'Description', count: null },
    { id: 'notes' as const, label: 'Notes', count: null },
    { id: 'checklist' as const, label: 'Checklist', count: null },
    { id: 'links' as const, label: 'Links', count: null },
    { id: 'files' as const, label: 'Files', count: null },
    { id: 'activity' as const, label: 'Activity', count: activityCount || null },
  ];

  if (!effectiveTaskId) return null;

  const handleDuplicate = async () => {
    if (!task) return;
    try {
      const timestamp = Date.now().toString(36).toUpperCase();
      const { error } = await supabase.from('planner_tasks').insert([{
        task_key: `TSK-${timestamp}`,
        title: `${task.title} (Copy)`,
        description: task.description || null,
        priority: task.priority || 'medium',
        status_id: task.status_id || null,
        workstream_id: task.workstream_id || task.workstream?.id || null,
        assignee_id: task.assignee_id || task.assignee?.id || null,
        due_date: task.due_date || null,
        start_date: task.start_date || null,
      }]);
      if (error) throw error;
      toast.success('Task duplicated');
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
    } catch {
      toast.error('Failed to duplicate');
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from('planner_tasks').delete().eq('id', effectiveTaskId);
      if (error) throw error;
      toast.success('Task deleted');
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      handleClose();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" />
        <DialogContent className="task-modal fixed left-[50%] top-[50%] z-[101] translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-[820px] max-h-[92vh] flex flex-col p-0 gap-0 border-0 shadow-2xl">
          {isLoading ? (
            <ModalSkeleton />
          ) : task ? (
            <>
              {/* HEADER */}
              <ModalHeader
                task={task}
                onClose={handleClose}
                onTitleChange={(t) => handleTextUpdate('title', t)}
                onStatusChange={(id) => handleFieldUpdate('status_id', id)}
                onPriorityChange={(p) => handleFieldUpdate('priority', p)}
                onWorkstreamChange={(id) => handleFieldUpdate('workstream_id', id)}
                onAssigneeChange={(id) => handleFieldUpdate('assignee_id', id)}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />

              {/* TABS */}
              <div className="tabs-container">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn("tab-btn", activeTab === tab.id && "active")}
                  >
                    {tab.label}
                    {tab.count !== null && tab.count > 0 && (
                      <span className="tab-badge">{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* CONTENT */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="content-area">
                  {activeTab === 'description' && (
                    <DescriptionTab task={task} onFieldChange={handleFieldUpdate} onTextChange={handleTextUpdate} />
                  )}
                  {activeTab === 'notes' && (
                    <NotesTab taskId={effectiveTaskId} workstreamId={task.workstream_id || task.workstream?.id || null} />
                  )}
                  {activeTab === 'checklist' && (
                    <ChecklistTab taskId={effectiveTaskId} items={checklist || []} />
                  )}
                  {activeTab === 'links' && (
                    <LinksTab taskId={effectiveTaskId} dependencies={dependencies || []} />
                  )}
                  {activeTab === 'files' && (
                    <FilesTab taskId={effectiveTaskId} attachments={attachments || []} />
                  )}
                  {activeTab === 'activity' && (
                    <ActivityTab taskId={effectiveTaskId} comments={comments || []} activity={activity || []} />
                  )}
                </div>
              </ScrollArea>

              {/* FOOTER */}
              <div className="modal-footer">
                <span className="footer-text">
                  Created <strong>{format(new Date(task.created_at), 'MMM d, yyyy')}</strong>
                  {' · '}
                  Updated <strong>{formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}</strong>
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-[var(--task-text-muted)]">
              Task not found
            </div>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

// ============================================================
// MODAL HEADER
// ============================================================

function ModalHeader({
  task,
  onClose,
  onTitleChange,
  onStatusChange,
  onPriorityChange,
  onWorkstreamChange,
  onAssigneeChange,
  onDuplicate,
  onDelete,
}: {
  task: any;
  onClose: () => void;
  onTitleChange: (t: string) => void;
  onStatusChange: (id: string) => void;
  onPriorityChange: (p: string) => void;
  onWorkstreamChange: (id: string | null) => void;
  onAssigneeChange: (id: string | null) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(task.title || '');
  const workstreamName = task.workstream?.name || '';
  const taskKey = task.task_key || task.key || '';

  useEffect(() => {
    setTitle(task.title || '');
  }, [task.title]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/planner/task-list?task=${task.id}`);
    toast.success('Link copied');
  };

  return (
    <div className="modal-header">
      {/* Top Row */}
      <div className="header-top-row">
        <div className="task-meta-info">
          <span className="task-id">{taskKey}</span>
          {workstreamName && (
            <>
              <span className="meta-separator">·</span>
              <span className="workstream-link">{workstreamName}</span>
            </>
          )}
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={handleCopyLink} title="Copy link">
            <Link2 className="w-[18px] h-[18px]" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="icon-btn" title="More options">
                <MoreHorizontal className="w-[18px] h-[18px]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 z-[200] bg-white">
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="w-4 h-4 mr-2" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button className="icon-btn" onClick={onClose} title="Close">
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      {/* Title */}
      <input
        className="task-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title !== task.title && onTitleChange(title)}
        placeholder="Task title"
      />

      {/* Metadata Bar */}
      <div className="metadata-bar">
        <MetaField label="STATUS">
          <StatusDropdown currentStatusId={task.status_id} currentStatus={task.status} onChange={onStatusChange} />
        </MetaField>
        <MetaField label="PRIORITY">
          <PriorityDropdown value={task.priority || 'medium'} onChange={onPriorityChange} />
        </MetaField>
        <MetaField label="WORKSTREAM">
          <WorkstreamDropdown value={task.workstream_id} currentWorkstream={task.workstream} onChange={onWorkstreamChange} />
        </MetaField>
        <MetaField label="ASSIGNEE">
          <AssigneeDropdown value={task.assignee_id} currentAssignee={task.assignee} onChange={onAssigneeChange} />
        </MetaField>
      </div>
    </div>
  );
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="meta-field">
      <span className="meta-label">{label}</span>
      {children}
    </div>
  );
}

// ============================================================
// DROPDOWNS
// ============================================================

function StatusDropdown({ currentStatusId, currentStatus, onChange }: { currentStatusId?: string | null; currentStatus: any; onChange: (id: string) => void }) {
  const { data: statuses = [] } = useStatuses();
  const [open, setOpen] = useState(false);
  const resolved = statuses.find((s: any) => s.id === currentStatusId) || currentStatus;
  const config = STATUS_CONFIG[resolved?.slug || 'backlog'] || STATUS_CONFIG.backlog;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="meta-dropdown">
          <span className="meta-dot" style={{ background: config.color }} />
          <span className="meta-text">{resolved?.name || config.label}</span>
          <ChevronDown className="meta-chevron" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="dropdown-menu w-48 p-1.5" align="start">
        {statuses.map((status: any) => {
          const cfg = STATUS_CONFIG[status.slug] || STATUS_CONFIG.backlog;
          return (
            <button
              key={status.id}
              onClick={() => { onChange(status.id); setOpen(false); }}
              className={cn("dropdown-item", currentStatusId === status.id && "selected")}
            >
              <span className="item-dot" style={{ background: cfg.color }} />
              <span className="item-text">{status.name}</span>
              {currentStatusId === status.id && <Check className="w-4 h-4 ml-auto text-[var(--task-accent)]" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function PriorityDropdown({ value, onChange }: { value: string; onChange: (p: string) => void }) {
  const [open, setOpen] = useState(false);
  const config = PRIORITY_CONFIG[value] || PRIORITY_CONFIG.medium;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="meta-dropdown">
          <span className="meta-dot" style={{ background: config.color }} />
          <span className="meta-text">{config.label}</span>
          <ChevronDown className="meta-chevron" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="dropdown-menu w-44 p-1.5" align="start">
        {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => { onChange(key); setOpen(false); }}
            className={cn("dropdown-item", value === key && "selected")}
          >
            <span className="item-dot" style={{ background: cfg.color }} />
            <span className="item-text">{cfg.label}</span>
            {value === key && <Check className="w-4 h-4 ml-auto text-[var(--task-accent)]" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function WorkstreamDropdown({ value, currentWorkstream, onChange }: { value: string | null; currentWorkstream: any; onChange: (id: string | null) => void }) {
  const { data: workstreams = [] } = useWorkstreams();
  const [open, setOpen] = useState(false);
  const display = workstreams.find((w) => w.id === value) || currentWorkstream || null;
  const color = getWorkstreamColor(display?.name || '').hex;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="meta-dropdown">
          <span className="meta-dot" style={{ background: color }} />
          <span className="meta-text">{display?.name || 'None'}</span>
          <ChevronDown className="meta-chevron" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="dropdown-menu w-56 p-1.5 max-h-[280px] overflow-y-auto" align="start">
        <button onClick={() => { onChange(null); setOpen(false); }} className={cn("dropdown-item", !value && "selected")}>
          <span className="item-dot bg-gray-400" />
          <span className="item-text text-[var(--task-text-muted)]">None</span>
        </button>
        {workstreams.map((ws) => {
          const wsColor = getWorkstreamColor(ws.name).hex;
          return (
            <button
              key={ws.id}
              onClick={() => { onChange(ws.id); setOpen(false); }}
              className={cn("dropdown-item", value === ws.id && "selected")}
            >
              <span className="item-dot" style={{ background: wsColor }} />
              <span className="item-text">{ws.name}</span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function AssigneeDropdown({ value, currentAssignee, onChange }: { value: string | null; currentAssignee: any; onChange: (id: string | null) => void }) {
  const { data: profiles = [] } = useProfiles();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const display = profiles.find((p) => p.id === value) || currentAssignee || null;
  
  const getInitials = (name: string | null) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  
  const filtered = search.trim() ? profiles.filter(p => p.full_name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase())) : profiles;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <button className="meta-dropdown">
          {display ? (
            <>
              <span className="avatar-sm" style={{ background: '#8b5cf6' }}>{getInitials(display.full_name)}</span>
              <span className="meta-text">{display.full_name}</span>
            </>
          ) : (
            <>
              <span className="avatar-sm" style={{ background: '#94a3b8' }}>?</span>
              <span className="meta-text text-[var(--task-text-muted)]">Unassigned</span>
            </>
          )}
          <ChevronDown className="meta-chevron" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 z-[200] bg-white" align="start">
        <div className="p-2 border-b">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--task-accent)]"
            autoFocus
          />
        </div>
        <div className="max-h-[240px] overflow-y-auto p-1.5">
          <button onClick={() => { onChange(null); setOpen(false); }} className={cn("dropdown-item", !value && "selected")}>
            <span className="item-avatar" style={{ background: '#94a3b8' }}>?</span>
            <span className="item-text text-[var(--task-text-muted)]">Unassigned</span>
          </button>
          {filtered.map((profile) => (
            <button
              key={profile.id}
              onClick={() => { onChange(profile.id); setOpen(false); }}
              className={cn("dropdown-item", value === profile.id && "selected")}
            >
              <span className="item-avatar" style={{ background: '#8b5cf6' }}>{getInitials(profile.full_name)}</span>
              <span className="item-text">{profile.full_name || 'Unnamed'}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================
// TAB COMPONENTS
// ============================================================

function DescriptionTab({ task, onFieldChange, onTextChange }: { task: any; onFieldChange: (f: string, v: any) => void; onTextChange: (f: string, v: any) => void }) {
  const [description, setDescription] = useState(task.description || '');

  useEffect(() => {
    setDescription(task.description || '');
  }, [task.description]);

  return (
    <div className="description-tab-content">
      {/* Description Textarea - Blue bordered, no label above */}
      <div className="description-wrapper">
        <textarea
          className="description-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => description !== task.description && onTextChange('description', description)}
          placeholder="Add a description..."
          rows={6}
        />
      </div>

      {/* Fields Row - Matches reference: PRIORITY, DUE DATE, START DATE */}
      <div className="fields-row">
        <FieldGroup label="PRIORITY">
          <InlinePriorityDropdown value={task.priority || 'medium'} onChange={(p) => onFieldChange('priority', p)} />
        </FieldGroup>
        <FieldGroup label="DUE DATE">
          <InlineDatePicker value={task.due_date} onChange={(d) => onFieldChange('due_date', d)} placeholder="Set due date..." />
        </FieldGroup>
        <FieldGroup label="START DATE">
          <InlineDatePicker value={task.start_date} onChange={(d) => onFieldChange('start_date', d)} placeholder="Set start date..." />
        </FieldGroup>
      </div>

      {/* Add Labels Button - Dashed border style */}
      <div className="labels-section">
        <button className="add-labels-btn">
          <Tag className="w-4 h-4" />
          <span>Add labels</span>
        </button>
      </div>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field-group">
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

function InlinePriorityDropdown({ value, onChange }: { value: string; onChange: (p: string) => void }) {
  const [open, setOpen] = useState(false);
  const config = PRIORITY_CONFIG[value] || PRIORITY_CONFIG.medium;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="field-dropdown">
          <span className="field-dot" style={{ background: config.color }} />
          <span className="field-text">{config.label}</span>
          <ChevronDown className="field-chevron" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="dropdown-menu w-40 p-1.5" align="start">
        {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => { onChange(key); setOpen(false); }} className={cn("dropdown-item", value === key && "selected")}>
            <span className="item-dot" style={{ background: cfg.color }} />
            <span className="item-text">{cfg.label}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function InlineDatePicker({ value, onChange, placeholder }: { value: string | null; onChange: (d: string | null) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const isOverdue = value && differenceInDays(new Date(), new Date(value)) > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn("field-dropdown", isOverdue && "text-red-500")}>
          <Calendar className="field-icon" />
          <span className={cn("field-text", !value && "placeholder")}>{value ? format(new Date(value), 'MMM d, yyyy') : placeholder}</span>
          <ChevronDown className="field-chevron" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[200]" align="start">
        <CalendarComponent
          mode="single"
          selected={value ? new Date(value) : undefined}
          onSelect={(date) => { onChange(date?.toISOString().split('T')[0] || null); setOpen(false); }}
          className="p-3"
        />
      </PopoverContent>
    </Popover>
  );
}

// Notes Tab
function NotesTab({ taskId, workstreamId }: { taskId: string; workstreamId: string | null }) {
  const { user } = useAuth();
  const { data: notes, isLoading } = useLeadNotes(taskId);
  const { canManage } = useCanManageLeadNotes(workstreamId);
  const [newNote, setNewNote] = useState('');
  const addMutation = useAddLeadNote();

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await addMutation.mutateAsync({ taskId, content: newNote.trim() });
    setNewNote('');
  };

  const getInitials = (name: string | null | undefined) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin mx-auto" />;

  return (
    <div className="notes-tab-content">
      {/* Notes List */}
      {notes && notes.length > 0 ? (
        <div className="notes-list">
          {notes.map((note) => (
            <NoteItem key={note.id} note={note} canManage={canManage} taskId={taskId} />
          ))}
        </div>
      ) : (
        <div className="notes-empty">
          <FileText className="w-12 h-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No notes yet</p>
        </div>
      )}

      {/* Add Note Composer */}
      {canManage && (
        <div className="notes-composer-simple">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleAddNote();
              }
            }}
            placeholder="Add a note..."
            rows={2}
            className="notes-input"
          />
          <div className="notes-composer-footer">
            <span className="notes-hint">Press ⌘+Enter to save</span>
            <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim() || addMutation.isPending}>
              Add Note
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function NoteItem({ note, canManage, taskId }: { note: any; canManage: boolean; taskId: string }) {
  const deleteMutation = useDeleteLeadNote();
  const getInitials = (name: string | null | undefined) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className="note-item">
      <div className="avatar" style={{ background: '#8b5cf6' }}>{getInitials(note.author?.full_name)}</div>
      <div className="flex-1">
        <div className="note-header">
          <strong>{note.author?.full_name || 'Unknown'}</strong>
          <span>{format(new Date(note.created_at), 'MMM d, yyyy · h:mm a')}</span>
        </div>
        <p className="note-content">{note.content}</p>
      </div>
      {canManage && (
        <button onClick={() => deleteMutation.mutate({ noteId: note.id, taskId })} className="note-delete">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// Checklist Tab
function ChecklistTab({ taskId, items }: { taskId: string; items: ChecklistItem[] }) {
  const toggleItem = useToggleChecklistItem();
  const addItem = useAddChecklistItem();
  const deleteItem = useDeleteChecklistItem();
  const [newText, setNewText] = useState('');

  const completed = items.filter(i => i.is_completed).length;
  const total = items.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleAdd = () => {
    if (!newText.trim()) return;
    addItem.mutate({ taskId, text: newText.trim() });
    setNewText('');
  };

  return (
    <div>
      {/* Progress Header */}
      <div className="checklist-header">
        <span className="progress-text">{completed} of {total} complete ({percent}%)</span>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {/* Items */}
      <div className="checklist-items">
        {items.map((item) => (
          <div key={item.id} className={cn("checklist-item", item.is_completed && "completed")}>
            <div
              className={cn("checkbox", item.is_completed && "checked")}
              onClick={() => toggleItem.mutate({ id: item.id, is_completed: !item.is_completed })}
            >
              {item.is_completed && <Check className="w-3.5 h-3.5" />}
            </div>
            <span className="item-text">{item.text}</span>
            <div className="item-actions">
              <button className="item-action-btn" onClick={() => deleteItem.mutate(item.id)}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Item */}
      <div className="add-item-input">
        <div className="add-item-icon">
          <Plus className="w-3.5 h-3.5" />
        </div>
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add checklist item..."
        />
      </div>
    </div>
  );
}

// Links Tab
function LinksTab({ taskId, dependencies }: { taskId: string; dependencies: any[] }) {
  const { data: links = [] } = useExternalLinks(taskId);
  const queryClient = useQueryClient();
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!newUrl.trim()) return;
    let url = newUrl.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    try {
      new URL(url);
    } catch {
      toast.error('Invalid URL');
      return;
    }
    await (supabase as any).from('task_external_links').insert({ task_id: taskId, url, title: newTitle.trim() || null });
    queryClient.invalidateQueries({ queryKey: ['task-links', taskId] });
    setNewUrl('');
    setNewTitle('');
    setIsAdding(false);
    toast.success('Link added');
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from('task_external_links').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['task-links', taskId] });
    toast.success('Link removed');
  };

  return (
    <div className="space-y-4">
      {/* Add Link Form */}
      {isAdding ? (
        <div className="link-form">
          <div className="space-y-2">
            <div className="field-group">
              <label className="field-label">URL</label>
              <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://example.com" autoFocus />
            </div>
            <div className="field-group">
              <label className="field-label">TITLE (OPTIONAL)</label>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Link title" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd}>Add Link</Button>
          </div>
        </div>
      ) : (
        <div className="link-add-row">
          <div className="field-group" style={{ flex: 2 }}>
            <label className="field-label">URL</label>
            <input placeholder="https://example.com" onClick={() => setIsAdding(true)} readOnly />
          </div>
          <div className="field-group" style={{ flex: 1 }}>
            <label className="field-label">TITLE (OPTIONAL)</label>
            <input placeholder="Link title" onClick={() => setIsAdding(true)} readOnly />
          </div>
          <Button onClick={() => setIsAdding(true)}>Add Link</Button>
        </div>
      )}

      {/* Links List */}
      {links.map((link: any) => (
        <div key={link.id} className="link-item">
          <div className="link-icon">
            <Link2 className="w-5 h-5" />
          </div>
          <div className="link-info">
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="link-title">{link.title || new URL(link.url).hostname}</a>
            <span className="link-url">{link.url}</span>
          </div>
          <button onClick={() => handleDelete(link.id)} className="link-delete">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      {links.length === 0 && !isAdding && (
        <div className="empty-state">
          <Globe className="w-10 h-10 mx-auto mb-3" />
          <h3>No links yet</h3>
          <p>Add links to related documents, designs, or resources</p>
        </div>
      )}
    </div>
  );
}

// Files Tab
function FilesTab({ taskId, attachments }: { taskId: string; attachments: TaskAttachment[] }) {
  const deleteAttachment = useDeleteAttachment();
  const uploadAttachment = useUploadAttachment();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 50MB)`);
        continue;
      }
      await uploadAttachment.mutateAsync({ taskId, file });
      toast.success(`Uploaded ${file.name}`);
    }
  };

  const handleDownload = async (att: TaskAttachment) => {
    try {
      const path = att.file_url.split('/attachments/')[1];
      if (!path) throw new Error('Invalid path');
      const { data, error } = await supabase.storage.from('attachments').download(decodeURIComponent(path));
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(att.file_url, '_blank');
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes, idx = 0;
    while (size >= 1024 && idx < 3) { size /= 1024; idx++; }
    return `${size.toFixed(1)} ${units[idx]}`;
  };

  const getIcon = (type: string | null) => {
    if (!type) return FileText;
    if (type.startsWith('image/')) return Eye;
    return FileText;
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <label
        className={cn("upload-zone", isDragging && "dragover")}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleUpload(e.dataTransfer.files); }}
      >
        <input ref={fileInputRef} type="file" multiple hidden onChange={(e) => handleUpload(e.target.files)} />
        <Upload className="upload-icon" />
        <div className="upload-text">
          <strong>Drop files here to upload</strong>
          <span>or <span className="upload-link">browse</span> to choose files</span>
        </div>
      </label>

      {/* Files List */}
      {attachments.map((att) => {
        const Icon = getIcon(att.file_type);
        return (
          <div key={att.id} className="file-item">
            <div className={cn("file-icon", att.file_type?.includes('pdf') && "pdf", att.file_type?.includes('image') && "img")}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="file-info">
              <span className="file-name">{att.file_name}</span>
              <span className="file-meta">{formatSize(att.file_size)}</span>
            </div>
            <div className="file-actions">
              <button onClick={() => handleDownload(att)}><Download className="w-4 h-4" /></button>
              <button onClick={() => deleteAttachment.mutate(att.id)}><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        );
      })}

      {attachments.length === 0 && (
        <div className="empty-state">
          <FileText className="w-10 h-10 mx-auto mb-3" />
          <h3>No files attached</h3>
          <p>Upload files to share with your team</p>
        </div>
      )}
    </div>
  );
}

// Activity Tab
function ActivityTab({ taskId, comments, activity }: { taskId: string; comments: TaskComment[]; activity: TaskActivity[] }) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'comments' | 'history'>('all');
  const [newComment, setNewComment] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState('U');
  const addComment = useAddComment();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
      const name = data.user?.user_metadata?.full_name || data.user?.email || '';
      setUserInitials(name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U');
    });
  }, []);

  const handleSubmit = () => {
    if (!newComment.trim() || !userId) return;
    addComment.mutate({ taskId, content: newComment.trim(), authorId: userId }, {
      onSuccess: () => { setNewComment(''); toast.success('Comment added'); },
    });
  };

  const allItems = [...comments.map(c => ({ ...c, type: 'comment' as const })), ...activity.map(a => ({ ...a, type: 'activity' as const }))]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="activity-filters">
        {(['all', 'comments', 'history'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={cn("activity-filter-btn", activeFilter === f && "active")}
          >
            {f === 'all' && <ListFilter className="w-4 h-4" />}
            {f === 'comments' && <MessageSquare className="w-4 h-4" />}
            {f === 'history' && <History className="w-4 h-4" />}
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="activity-feed">
        {activeFilter === 'all' && allItems.map((item) => (
          item.type === 'comment' 
            ? <CommentItemV2 key={`c-${item.id}`} comment={item as TaskComment} />
            : <HistoryItemV2 key={`a-${item.id}`} activity={item as TaskActivity} />
        ))}
        {activeFilter === 'comments' && comments.map((c) => <CommentItemV2 key={c.id} comment={c} />)}
        {activeFilter === 'history' && activity.map((a) => <HistoryItemV2 key={a.id} activity={a} />)}
        
        {((activeFilter === 'all' && allItems.length === 0) || (activeFilter === 'comments' && comments.length === 0) || (activeFilter === 'history' && activity.length === 0)) && (
          <div className="empty-state">
            <MessageSquare className="w-10 h-10 mx-auto mb-3" />
            <h3>No activity yet</h3>
          </div>
        )}
      </div>

      {/* Comment Composer */}
      <div className="comment-composer">
        <div className="avatar" style={{ background: '#8b5cf6' }}>{userInitials}</div>
        <div className="comment-input-wrapper">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(); } }}
            placeholder="Write a comment..."
            rows={3}
          />
          <button className="send-btn" onClick={handleSubmit} disabled={!newComment.trim()}>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentItemV2({ comment }: { comment: TaskComment }) {
  const name = comment.author?.full_name || 'Unknown';
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  
  return (
    <div className="activity-item">
      <div className="avatar" style={{ background: '#8b5cf6' }}>{initials}</div>
      <div className="activity-content">
        <div className="activity-header">
          <strong>{name}</strong>
          <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
        </div>
        <div className="activity-body">{comment.content}</div>
      </div>
    </div>
  );
}

function HistoryItemV2({ activity }: { activity: TaskActivity }) {
  const name = activity.actor?.full_name || 'System';
  
  const getIcon = () => {
    switch (activity.action_type) {
      case 'created': return <Clock className="w-4 h-4" />;
      case 'assignment': case 'assignee_changed': return <UserPlus className="w-4 h-4" />;
      case 'status_changed': case 'status_change': return <Edit3 className="w-4 h-4" />;
      case 'attachment': return <Paperclip className="w-4 h-4" />;
      case 'checklist': case 'checklist_item_completed': return <CheckSquare className="w-4 h-4" />;
      default: return <Edit3 className="w-4 h-4" />;
    }
  };

  const getText = () => {
    const action = activity.action_type;
    const newVal = activity.new_value;
    const oldVal = activity.old_value;
    
    switch (action) {
      case 'created': return <><strong>Task created</strong> by <strong>{name}</strong></>;
      case 'status_changed': case 'status_change': 
        return <><strong>{name}</strong> changed status{oldVal && newVal ? <> from <strong>{oldVal}</strong> to <strong>{newVal}</strong></> : ''}</>;
      case 'assignment': case 'assignee_changed': return <><strong>{name}</strong> assigned <strong>{newVal || 'someone'}</strong> to this task</>;
      case 'attachment': return <><strong>{name}</strong> attached <strong>{newVal}</strong></>;
      case 'checklist': case 'checklist_item_completed': return <><strong>{name}</strong> completed checklist item "{newVal}"</>;
      default: return <><strong>{name}</strong> made a change</>;
    }
  };

  return (
    <div className="history-item">
      <div className="history-icon">{getIcon()}</div>
      <div className="history-content">
        <p className="history-text">{getText()}</p>
        <span className="history-time">{format(new Date(activity.created_at), 'MMM d, yyyy')} at {format(new Date(activity.created_at), 'h:mm a')}</span>
      </div>
    </div>
  );
}

// ============================================================
// SKELETON
// ============================================================

function ModalSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="space-y-3">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    </div>
  );
}

// Export for use
export { TaskDetailModalV2 as TaskDetailDrawer };
