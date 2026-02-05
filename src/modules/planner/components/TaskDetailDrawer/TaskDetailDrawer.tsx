// ============================================================
// TASK DETAIL MODAL V3 - TWO-COLUMN SIDEBAR LAYOUT
// Left: Breadcrumb, Title, Tabs, Content
// Right: Sidebar with Status, Priority, Workstream, Assignee
// ============================================================

import { useCallback, useEffect, useState, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { catalystToast } from '@/lib/catalystToast';
import { X, Link2, Maximize2, MoreHorizontal, Copy, Trash2, Loader2, Check } from 'lucide-react';
import {
  Modal,
  ModalContent,
} from '@/components/overlays/AtlassianModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import '@/styles/task-detail-modal-enterprise.css';

import { TaskDescription } from './TaskDescription';
import { LeadNotesTab } from './LeadNotesTab';
import { ChecklistSection } from './ChecklistSection';
import { AttachmentsSection } from './AttachmentsSection';
import { ActivitySection } from './ActivitySection';
import { SidebarFields } from './SidebarFields';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

import {
  useTaskDependencies,
  useTaskChecklist,
  useTaskAttachments,
  useTaskComments,
  useTaskActivity,
} from '../../hooks/useTaskDetails';
import { usePlannerTaskRealtime } from '../../hooks/usePlannerTaskRealtime';
import { useUpdatePlannerTaskField } from '../../hooks/useUpdatePlannerTaskField';
import { useLeadNotes } from '../../hooks/useLeadNotes';

interface TaskDetailDrawerProps {
  taskId?: string | null;
  task?: { id: string } | null;
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  onTaskUpdated?: () => void;
}

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
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function TaskDetailDrawer({ taskId: propTaskId, task: propTask, open, onClose, onOpenChange, onTaskUpdated }: TaskDetailDrawerProps) {
  const effectiveTaskId = propTaskId ?? propTask?.id ?? null;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const lastUpdatedAtRef = useRef<string | null>(null);
  
  // Save status for indicator
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveStatusTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Expanded mode state
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'description' | 'checklist' | 'files' | 'activity'>('description');
  
  const handleClose = useCallback(() => {
    if (effectiveTaskId) {
      flushPending(effectiveTaskId);
    }
    onClose?.();
    onOpenChange?.(false);
  }, [effectiveTaskId, onClose, onOpenChange]);

  const { data: serverTask, isLoading } = useTaskDetail(effectiveTaskId);
  const [draftTask, setDraftTask] = useState<any | null>(null);

  useEffect(() => {
    if (!serverTask) return;
    
    if (lastUpdatedAtRef.current && lastUpdatedAtRef.current !== serverTask.updated_at) {
      if (open && saveStatus === 'idle') {
        toast.info('Task updated by another user', { duration: 2000 });
      }
    }
    lastUpdatedAtRef.current = serverTask.updated_at;
    
    setDraftTask((prev: any) => {
      if (!prev || prev.id !== serverTask.id) return serverTask;
      return { ...prev, ...serverTask };
    });
  }, [serverTask?.id, serverTask?.updated_at, open, saveStatus]);

  const task = draftTask ?? serverTask;

  usePlannerTaskRealtime({
    taskId: effectiveTaskId,
    onUpdate: () => {},
    onDelete: () => {
      handleClose();
    },
  });

  const { updateNow, updateDebounced, flushPending, isPending } = useUpdatePlannerTaskField();

  const showSaving = useCallback(() => {
    if (saveStatusTimerRef.current) {
      clearTimeout(saveStatusTimerRef.current);
    }
    setSaveStatus('saving');
  }, []);

  const showSaved = useCallback(() => {
    setSaveStatus('saved');
    saveStatusTimerRef.current = setTimeout(() => {
      setSaveStatus('idle');
    }, 1500);
  }, []);

  const handleFieldUpdate = useCallback(async (field: string, value: any) => {
    if (!effectiveTaskId) return;

    setDraftTask((prev: any) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });

    showSaving();
    updateNow(effectiveTaskId, field, value);
    
    setTimeout(() => {
      showSaved();
    }, 300);
    
    onTaskUpdated?.();
  }, [effectiveTaskId, updateNow, showSaving, showSaved, onTaskUpdated]);

  const handleTextFieldUpdate = useCallback((field: string, value: any) => {
    if (!effectiveTaskId) return;

    setDraftTask((prev: any) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });

    showSaving();
    updateDebounced(effectiveTaskId, field, value, 500);
    
    setTimeout(() => {
      showSaved();
    }, 600);
  }, [effectiveTaskId, updateDebounced, showSaving, showSaved]);

  // Fetch related data
  const { data: checklist } = useTaskChecklist(effectiveTaskId);
  const { data: attachments } = useTaskAttachments(effectiveTaskId);
  const { data: comments } = useTaskComments(effectiveTaskId);
  const { data: activity } = useTaskActivity(effectiveTaskId);

  useEffect(() => {
    return () => {
      if (saveStatusTimerRef.current) {
        clearTimeout(saveStatusTimerRef.current);
      }
    };
  }, []);

  if (!effectiveTaskId) return null;

  const checklistCount = checklist?.length || 0;
  const filesCount = attachments?.length || 0;
  const activityCount = (comments?.length || 0) + (activity?.length || 0);

  const tabs = [
    { id: 'description' as const, label: 'Description', badge: null },
    { id: 'checklist' as const, label: 'Checklist', badge: checklistCount || null },
    { id: 'files' as const, label: 'Files', badge: filesCount || null },
    { id: 'activity' as const, label: 'Activity', badge: activityCount || null },
  ];

  const handleCopyLink = () => {
    const url = `${window.location.origin}/taskhub/task-list?task=${task?.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const handleDuplicate = async () => {
    if (!task) return;
    try {
      const workstreamId = task.workstream_id || task.workstream?.id;
      
      // 1. Get workstream key_prefix
      let keyPrefix = 'TSK';
      if (workstreamId) {
        const { data: wsData } = await supabase
          .from('planner_workstreams')
          .select('key_prefix')
          .eq('id', workstreamId)
          .maybeSingle();
        
        if (wsData?.key_prefix) {
          keyPrefix = wsData.key_prefix;
        }
      }
      
      // 2. Get max sequence number for this workstream
      const { data: existingTasks } = await supabase
        .from('planner_tasks')
        .select('task_key')
        .eq('workstream_id', workstreamId || '')
        .like('task_key', `${keyPrefix}-%`);
      
      let maxSequence = 0;
      if (existingTasks && existingTasks.length > 0) {
        existingTasks.forEach((t) => {
          const match = t.task_key?.match(new RegExp(`^${keyPrefix}-(\\d+)$`));
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxSequence) maxSequence = num;
          }
        });
      }
      
      const newSequence = maxSequence + 1;
      const newTaskKey = `${keyPrefix}-${newSequence}`;
      
      // 3. Insert duplicated task
      const { data: newTask, error } = await supabase
        .from('planner_tasks')
        .insert([{
          task_key: newTaskKey,
          title: task.title, // No "(Copy)" suffix per requirement
          description: task.description || null,
          priority: task.priority || 'medium',
          status_id: task.status_id || null,
          workstream_id: workstreamId || null,
          assignee_id: task.assignee_id || task.assignee?.id || null,
          due_date: task.due_date || null,
          start_date: task.start_date || null,
        }])
        .select('id')
        .single();
      
      if (error) throw error;
      
      // 4. Show Catalyst toast with action to open new task
      catalystToast.success(
        'Task Duplicated',
        `Created as ${newTaskKey}`,
        {
          label: 'View Task',
          onClick: () => {
            handleClose();
            navigate(`/taskhub/tasks?taskId=${newTask.id}`);
          }
        }
      );
      
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      onTaskUpdated?.();
    } catch (err) {
      console.error('Duplicate error:', err);
      catalystToast.error('Duplication Failed', 'Could not duplicate task');
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('planner_tasks')
        .delete()
        .eq('id', effectiveTaskId);
      
      if (error) throw error;
      toast.success('Task deleted');
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      handleClose();
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  // Handle expand to full page - uses query param pattern per workItemRoutes.ts
  const handleExpand = () => {
    handleClose();
    navigate(`/taskhub/tasks?taskId=${effectiveTaskId}`);
  };

  return (
    <Modal open={open} onOpenChange={(o) => !o && handleClose()}>
      <ModalContent 
        size="lg"
        hideClose
        className={cn(
          "task-modal-v3 p-0 gap-0 overflow-hidden flex flex-col",
          isExpanded ? "max-h-[95vh]" : "max-h-[85vh]"
        )}
        style={{ 
          maxWidth: isExpanded ? '1200px' : '900px', 
          width: isExpanded ? '95vw' : '90vw' 
        }}
      >
        {isLoading ? (
          <ModalSkeleton />
        ) : task ? (
          <div className="task-modal-v3__layout">
            {/* ===== LEFT COLUMN: Main content ===== */}
            <div className="task-modal-v3__main">
              {/* Breadcrumb Header */}
              <header className="task-modal-v3__header">
                <div className="task-modal-v3__breadcrumb">
                  <span className="task-modal-v3__breadcrumb-ws">{task.workstream?.name || 'No Workstream'}</span>
                  <span className="task-modal-v3__breadcrumb-sep">›</span>
                  <span className="task-modal-v3__breadcrumb-item">Board</span>
                  <span className="task-modal-v3__breadcrumb-sep">›</span>
                  <span className="task-modal-v3__breadcrumb-key">{task.task_key || 'TSK-000'}</span>
                </div>
                
                <div className="task-modal-v3__header-actions">
                  <button onClick={handleCopyLink} className="task-modal-v3__icon-btn" title="Copy link">
                    <Link2 className="w-4 h-4" />
                  </button>
                  <button onClick={handleExpand} className="task-modal-v3__icon-btn" title="Open in full page">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="task-modal-v3__icon-btn" title="More options">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-popover z-[600]">
                      <DropdownMenuItem onClick={handleDuplicate}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={handleDelete}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <button onClick={handleClose} className="task-modal-v3__icon-btn task-modal-v3__icon-btn--close" title="Close">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </header>

              {/* Title */}
              <div className="task-modal-v3__title-wrap">
                <div 
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleTextFieldUpdate('title', e.currentTarget.textContent || '')}
                  className="task-modal-v3__title"
                >
                  {task.title}
                </div>
              </div>
              
              {/* Tab Navigation */}
              <nav className="task-modal-v3__tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "task-modal-v3__tab",
                      activeTab === tab.id && "task-modal-v3__tab--active"
                    )}
                  >
                    {tab.label}
                    {tab.badge !== null && tab.badge > 0 && (
                      <span className="task-modal-v3__tab-badge">{tab.badge}</span>
                    )}
                  </button>
                ))}
              </nav>
              
              {/* Tab Content */}
              <ScrollArea className="task-modal-v3__content-scroll">
                <div className="task-modal-v3__content">
                  {activeTab === 'description' && (
                    <TaskDescription
                      value={task.description || ''}
                      onChange={(desc) => handleTextFieldUpdate('description', desc)}
                    />
                  )}

                  {activeTab === 'checklist' && (
                    <ChecklistSection
                      taskId={effectiveTaskId!}
                      items={checklist || []}
                    />
                  )}

                  {activeTab === 'files' && (
                    <AttachmentsSection
                      taskId={effectiveTaskId!}
                      attachments={attachments || []}
                    />
                  )}

                  {activeTab === 'activity' && (
                    <ActivitySection
                      taskId={effectiveTaskId!}
                      comments={comments || []}
                      activity={activity || []}
                    />
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* ===== RIGHT COLUMN: Sidebar ===== */}
            <aside className="task-modal-v3__sidebar">
              <SidebarFields
                task={task}
                onFieldChange={handleFieldUpdate}
              />
              
              {/* Footer: Created/Updated + Save Status + Actions */}
              <div className="task-modal-v3__sidebar-footer">
                {/* Save Status Indicator */}
                {saveStatus !== 'idle' && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium mb-4 transition-all duration-200",
                    saveStatus === 'saving' && "bg-muted text-muted-foreground",
                    saveStatus === 'saved' && "bg-emerald-50 text-emerald-600",
                    saveStatus === 'error' && "bg-red-50 text-red-600"
                  )}>
                    {saveStatus === 'saving' && (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Saving...</span>
                      </>
                    )}
                    {saveStatus === 'saved' && (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Saved</span>
                      </>
                    )}
                    {saveStatus === 'error' && <span>Failed to save</span>}
                  </div>
                )}

                <div className="task-modal-v3__timestamps">
                  <div className="task-modal-v3__timestamp-row">
                    <span className="task-modal-v3__timestamp-label">Created</span>
                    <span className="task-modal-v3__timestamp-value">{format(new Date(task.created_at), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="task-modal-v3__timestamp-row">
                    <span className="task-modal-v3__timestamp-label">Updated</span>
                    <span className="task-modal-v3__timestamp-value">{formatDistanceToNow(new Date(task.updated_at), { addSuffix: false })}</span>
                  </div>
                </div>
                
                <div className="task-modal-v3__footer-actions">
                  <button onClick={handleDuplicate} className="task-modal-v3__footer-btn">
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <button onClick={handleDelete} className="task-modal-v3__footer-btn task-modal-v3__footer-btn--danger">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </aside>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Task not found
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}

function ModalSkeleton() {
  return (
    <div className="task-modal-v3__layout">
      <div className="task-modal-v3__main p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="task-modal-v3__sidebar p-4 space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}
