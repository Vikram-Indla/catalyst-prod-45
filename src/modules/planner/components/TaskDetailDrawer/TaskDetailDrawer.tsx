// ============================================================
// TASK DETAIL MODAL V2 - ENTERPRISE CLEAN DESIGN
// CRITICAL: This is a MODAL, not a drawer!
// 18px title, status bar, tabs, inline fields
// ============================================================

import { useCallback, useEffect, useState, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Link2, MoreHorizontal } from 'lucide-react';
import {
  Modal,
  ModalContent,
} from '@/components/overlays/AtlassianModal';
import '@/styles/task-detail-modal-enterprise.css';

import { DrawerHeader } from './DrawerHeader';
import { TaskDescription } from './TaskDescription';
import { TaskFieldsGrid } from './TaskFieldsGrid';
import { ProgressSection } from './ProgressSection';
import { LeadNotesTab } from './LeadNotesTab';
import { ChecklistSection } from './ChecklistSection';
import { AttachmentsSection } from './AttachmentsSection';
import { DependenciesSection } from './DependenciesSection';
import { ActivitySection } from './ActivitySection';
import { DrawerFooter } from './DrawerFooter';
import { cn } from '@/lib/utils';

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
  const lastUpdatedAtRef = useRef<string | null>(null);
  
  // Save status for indicator
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveStatusTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Tab state for V2 tabbed interface
  const [activeTab, setActiveTab] = useState<'description' | 'lead-notes' | 'checklist' | 'links' | 'files' | 'activity'>('description');
  
  const handleClose = useCallback(() => {
    // Flush any pending debounced updates before closing
    if (effectiveTaskId) {
      flushPending(effectiveTaskId);
    }
    onClose?.();
    onOpenChange?.(false);
  }, [effectiveTaskId, onClose, onOpenChange]);

  const { data: serverTask, isLoading } = useTaskDetail(effectiveTaskId);
  const [draftTask, setDraftTask] = useState<any | null>(null);

  // Track the server's updated_at to detect external changes
  useEffect(() => {
    if (!serverTask) return;
    
    // Detect if update came from another source
    if (lastUpdatedAtRef.current && lastUpdatedAtRef.current !== serverTask.updated_at) {
      // Only show toast if modal is open and it wasn't our update
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

  // Real-time subscription for this specific task
  usePlannerTaskRealtime({
    taskId: effectiveTaskId,
    onUpdate: () => {
      // Cache will be updated by the hook, draft will sync via the useEffect above
    },
    onDelete: () => {
      handleClose();
    },
  });

  // Enhanced update hook with debouncing
  const { updateNow, updateDebounced, flushPending, isPending } = useUpdatePlannerTaskField();

  // Show saving indicator
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

  // Handle immediate field updates (dropdowns, checkboxes)
  const handleFieldUpdate = useCallback(async (field: string, value: any) => {
    if (!effectiveTaskId) return;

    // Optimistically update local draft
    setDraftTask((prev: any) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });

    showSaving();
    updateNow(effectiveTaskId, field, value);
    
    // Show saved after a brief delay
    setTimeout(() => {
      showSaved();
    }, 300);
    
    onTaskUpdated?.();
  }, [effectiveTaskId, updateNow, showSaving, showSaved, onTaskUpdated]);

  // Handle debounced text field updates (title, description)
  const handleTextFieldUpdate = useCallback((field: string, value: any) => {
    if (!effectiveTaskId) return;

    // Optimistically update local draft immediately
    setDraftTask((prev: any) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });

    showSaving();
    updateDebounced(effectiveTaskId, field, value, 500);
    
    // Show saved after debounce completes
    setTimeout(() => {
      showSaved();
    }, 600);
  }, [effectiveTaskId, updateDebounced, showSaving, showSaved]);

  // Fetch related data
  const { data: dependencies } = useTaskDependencies(effectiveTaskId);
  const { data: checklist } = useTaskChecklist(effectiveTaskId);
  const { data: attachments } = useTaskAttachments(effectiveTaskId);
  const { data: comments } = useTaskComments(effectiveTaskId);
  const { data: activity } = useTaskActivity(effectiveTaskId);
  const { data: leadNotes } = useLeadNotes(effectiveTaskId);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveStatusTimerRef.current) {
        clearTimeout(saveStatusTimerRef.current);
      }
    };
  }, []);

  if (!effectiveTaskId) return null;

  // Tab badge counts
  const leadNotesCount = leadNotes?.length || 0;
  const checklistCount = checklist?.length || 0;
  const linksCount = dependencies?.length || 0;
  const filesCount = attachments?.length || 0;
  const activityCount = (comments?.length || 0) + (activity?.length || 0);

  const tabs = [
    { id: 'description' as const, label: 'Description', badge: null },
    { id: 'lead-notes' as const, label: 'Lead Notes', badge: leadNotesCount || null },
    { id: 'checklist' as const, label: 'Checklist', badge: checklistCount || null },
    { id: 'links' as const, label: 'Links', badge: linksCount || null },
    { id: 'files' as const, label: 'Files', badge: filesCount || null },
    { id: 'activity' as const, label: 'Activity', badge: activityCount || null },
  ];

  return (
    <Modal open={open} onOpenChange={(o) => !o && handleClose()}>
      <ModalContent 
        size="lg"
        hideClose
        className="task-modal task-modal-enterprise p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col"
        style={{ maxWidth: '900px', width: '90vw' }}
      >
        {isLoading ? (
          <ModalSkeleton />
        ) : task ? (
          <>
            {/* Header - V2 with status bar */}
            <DrawerHeader
              task={task}
              onClose={handleClose}
              onTitleChange={(title) => handleTextFieldUpdate('title', title)}
              onStatusChange={(statusId) => handleFieldUpdate('status_id', statusId)}
              onAssigneeChange={(assigneeId) => handleFieldUpdate('assignee_id', assigneeId)}
              onWorkstreamChange={(workstreamId) => handleFieldUpdate('workstream_id', workstreamId)}
              onPriorityChange={(priority) => handleFieldUpdate('priority', priority)}
              onEdit={() => {
                toast.info('Edit mode - changes save automatically');
              }}
              onDuplicate={async () => {
                try {
                  // Generate a new task_key
                  const timestamp = Date.now().toString(36).toUpperCase();
                  const newTaskKey = `TSK-${timestamp}`;
                  
                  const { error } = await supabase
                    .from('planner_tasks')
                    .insert([{
                      task_key: newTaskKey,
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
                  toast.success('Task duplicated successfully');
                  queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
                  onTaskUpdated?.();
                } catch (err) {
                  console.error('Duplicate error:', err);
                  toast.error('Failed to duplicate task');
                }
              }}
              onDelete={async () => {
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
              }}
              saveStatus={saveStatus}
            />
            
            {/* Tab Navigation - V2 */}
            <nav className="task-modal__tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "task-modal__tab",
                    activeTab === tab.id && "task-modal__tab--active"
                  )}
                >
                  {tab.label}
                  {tab.badge !== null && tab.badge > 0 && (
                    <span className="task-modal__tab-badge">{tab.badge}</span>
                  )}
                </button>
              ))}
            </nav>
            
            {/* Tab Content - Scrollable */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="task-modal__content">
                {/* Description Tab */}
                {activeTab === 'description' && (
                  <div className="space-y-5">
                    {/* Description - Single label only */}
                    <TaskDescription
                      value={task.description || ''}
                      onChange={(desc) => handleTextFieldUpdate('description', desc)}
                    />
                    
                    {/* Inline Fields Row - V2 style */}
                    <TaskFieldsGrid
                      task={task}
                      onFieldChange={handleFieldUpdate}
                    />
                  </div>
                )}

                {/* Lead Notes Tab */}
                {activeTab === 'lead-notes' && (
                  <LeadNotesTab
                    taskId={effectiveTaskId!}
                    workstreamId={task.workstream_id || task.workstream?.id || null}
                  />
                )}

                {/* Checklist Tab */}
                {activeTab === 'checklist' && (
                  <ChecklistSection
                    taskId={effectiveTaskId!}
                    items={checklist || []}
                  />
                )}

                {/* Links Tab */}
                {activeTab === 'links' && (
                  <DependenciesSection
                    taskId={effectiveTaskId!}
                    dependencies={dependencies || []}
                  />
                )}

                {/* Files Tab */}
                {activeTab === 'files' && (
                  <AttachmentsSection
                    taskId={effectiveTaskId!}
                    attachments={attachments || []}
                  />
                )}

                {/* Activity Tab */}
                {activeTab === 'activity' && (
                  <ActivitySection
                    taskId={effectiveTaskId!}
                    comments={comments || []}
                    activity={activity || []}
                  />
                )}
              </div>
            </ScrollArea>
            
            {/* Footer - With save indicator */}
            <div className="task-modal__footer">
              <DrawerFooter
                task={task}
                onDelete={handleClose}
                onDuplicate={() => {}}
                saveStatus={saveStatus}
              />
            </div>
          </>
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
    <div className="p-6 space-y-6">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="space-y-3">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
      <Skeleton className="h-24" />
    </div>
  );
}
