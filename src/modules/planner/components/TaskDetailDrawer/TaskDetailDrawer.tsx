// ============================================================
// TASK DETAIL DRAWER - LINEAR-INSPIRED REDESIGN
// Clean single-column layout with real-time sync & saving indicator
// ============================================================

import { useCallback, useEffect, useState, useRef } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CheckSquare, Paperclip, GitBranch } from 'lucide-react';
import { toast } from 'sonner';

import { DrawerHeader } from './DrawerHeader';
import { TaskDescription } from './TaskDescription';
import { TaskFieldsGrid } from './TaskFieldsGrid';
import { ProgressSection } from './ProgressSection';
import { CollapsibleSection } from './CollapsibleSection';
import { ChecklistSection } from './ChecklistSection';
import { AttachmentsSection } from './AttachmentsSection';
import { DependenciesSection } from './DependenciesSection';
import { ActivitySection } from './ActivitySection';
import { DrawerFooter } from './DrawerFooter';
import { SavingIndicator, SaveStatus } from './SavingIndicator';

import {
  useTaskDependencies,
  useTaskChecklist,
  useTaskAttachments,
  useTaskComments,
  useTaskActivity,
} from '../../hooks/useTaskDetails';
import { usePlannerTaskRealtime } from '../../hooks/usePlannerTaskRealtime';
import { useUpdatePlannerTaskField } from '../../hooks/useUpdatePlannerTaskField';

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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveStatusTimerRef = useRef<NodeJS.Timeout | null>(null);
  
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
      // Only show toast if drawer is open and it wasn't our update
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
    onUpdate: (updatedTask) => {
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') handleClose();
    };
    
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleClose]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveStatusTimerRef.current) {
        clearTimeout(saveStatusTimerRef.current);
      }
    };
  }, []);

  if (!effectiveTaskId) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-[540px] p-0 gap-0 overflow-hidden"
      >
        {isLoading ? (
          <DrawerSkeleton />
        ) : task ? (
          <div className="flex flex-col h-full relative">
            {/* Header - with save status */}
            <DrawerHeader
              task={task}
              onClose={handleClose}
              onTitleChange={(title) => handleTextFieldUpdate('title', title)}
              onStatusChange={(statusId) => handleFieldUpdate('status_id', statusId)}
              saveStatus={saveStatus}
            />
            
            {/* Scrollable Content */}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Description */}
                <TaskDescription
                  value={task.description || ''}
                  onChange={(desc) => handleTextFieldUpdate('description', desc)}
                />
                
                {/* Details - Single Column */}
                <TaskFieldsGrid
                  task={task}
                  onFieldChange={handleFieldUpdate}
                />
                
                {/* Progress Bar */}
                <ProgressSection
                  task={task}
                  onUpdate={(updates) => handleFieldUpdate('progress', updates.progress)}
                />
                
                {/* Collapsible Sections */}
                <div className="space-y-2 pt-2 border-t border-border">
                  {/* Checklist */}
                  <CollapsibleSection
                    title="Checklist"
                    count={checklist?.length || 0}
                    icon={<CheckSquare className="w-4 h-4" />}
                  >
                    <ChecklistSection
                      taskId={effectiveTaskId!}
                      items={checklist || []}
                    />
                  </CollapsibleSection>

                  {/* Relations */}
                  <CollapsibleSection
                    title="Relations"
                    count={dependencies?.length || 0}
                    icon={<GitBranch className="w-4 h-4" />}
                  >
                    <DependenciesSection
                      taskId={effectiveTaskId!}
                      dependencies={dependencies || []}
                    />
                  </CollapsibleSection>

                  {/* Attachments */}
                  <CollapsibleSection
                    title="Attachments"
                    count={attachments?.length || 0}
                    icon={<Paperclip className="w-4 h-4" />}
                  >
                    <AttachmentsSection
                      taskId={effectiveTaskId!}
                      attachments={attachments || []}
                    />
                  </CollapsibleSection>
                </div>
                
                {/* Activity */}
                <div className="pt-4 border-t border-border">
                  <ActivitySection
                    taskId={effectiveTaskId!}
                    comments={comments || []}
                    activity={activity || []}
                  />
                </div>
              </div>
            </ScrollArea>
            
            {/* Footer */}
            <DrawerFooter
              task={task}
              onDelete={handleClose}
              onDuplicate={() => {}}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Task not found
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DrawerSkeleton() {
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
