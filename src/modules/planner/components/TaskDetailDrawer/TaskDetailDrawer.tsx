// ============================================================
// TASK DETAIL DRAWER - LINEAR-INSPIRED REDESIGN
// Clean single-column layout with prominent status, progress bar
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CheckSquare, Paperclip, GitBranch, MessageSquare } from 'lucide-react';

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

import {
  useTaskDependencies,
  useTaskChecklist,
  useTaskAttachments,
  useTaskComments,
  useTaskActivity,
} from '../../hooks/useTaskDetails';

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

function useUpdateTaskField() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, field, value }: { taskId: string; field: string; value: any }) => {
      const { error } = await supabase
        .from('planner_tasks')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
    },
  });
}

export function TaskDetailDrawer({ taskId: propTaskId, task: propTask, open, onClose, onOpenChange, onTaskUpdated }: TaskDetailDrawerProps) {
  const effectiveTaskId = propTaskId ?? propTask?.id ?? null;
  
  const handleClose = useCallback(() => {
    onClose?.();
    onOpenChange?.(false);
  }, [onClose, onOpenChange]);

  const { data: serverTask, isLoading } = useTaskDetail(effectiveTaskId);
  const [draftTask, setDraftTask] = useState<any | null>(null);

  useEffect(() => {
    if (!serverTask) return;
    setDraftTask((prev) => {
      if (!prev || prev.id !== serverTask.id) return serverTask;
      return { ...prev, ...serverTask };
    });
  }, [serverTask?.id, serverTask?.updated_at]);

  const task = draftTask ?? serverTask;

  const updateField = useUpdateTaskField();
  const { data: dependencies } = useTaskDependencies(effectiveTaskId);
  const { data: checklist } = useTaskChecklist(effectiveTaskId);
  const { data: attachments } = useTaskAttachments(effectiveTaskId);
  const { data: comments } = useTaskComments(effectiveTaskId);
  const { data: activity } = useTaskActivity(effectiveTaskId);

  const handleFieldUpdate = useCallback(async (field: string, value: any) => {
    if (!effectiveTaskId) return;

    setDraftTask((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });

    await updateField.mutateAsync({ taskId: effectiveTaskId, field, value });
    onTaskUpdated?.();
  }, [effectiveTaskId, updateField, onTaskUpdated]);

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
          <div className="flex flex-col h-full">
            {/* Header */}
            <DrawerHeader
              task={task}
              onClose={handleClose}
              onTitleChange={(title) => handleFieldUpdate('title', title)}
              onStatusChange={(statusId) => handleFieldUpdate('status_id', statusId)}
            />
            
            {/* Scrollable Content */}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Description */}
                <TaskDescription
                  value={task.description || ''}
                  onChange={(desc) => handleFieldUpdate('description', desc)}
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
                      taskDescription={task.description || ''}
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
