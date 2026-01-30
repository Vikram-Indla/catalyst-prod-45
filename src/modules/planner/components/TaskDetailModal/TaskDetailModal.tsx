/**
 * TASK DETAIL MODAL - V3 REBUILD
 * Clean implementation following specification exactly
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TaskModalHeader } from './components/TaskModalHeader';
import { TaskMetadataBar } from './components/TaskMetadataBar';
import { TaskModalTabs } from './components/TaskModalTabs';
import { DescriptionTab } from './tabs/DescriptionTab';
import { NotesTab } from './tabs/NotesTab';
import { ChecklistTab } from './tabs/ChecklistTab';
import { LinksTab } from './tabs/LinksTab';
import { FilesTab } from './tabs/FilesTab';
import { ActivityTab } from './tabs/ActivityTab';
import { TaskModalFooter } from './components/TaskModalFooter';
import { useUpdatePlannerTaskField } from '../../hooks/useUpdatePlannerTaskField';
import { usePlannerTaskRealtime } from '../../hooks/usePlannerTaskRealtime';
import { useTaskActivity } from '../../hooks/useTaskDetails';
import './TaskDetailModal.css';

export interface TaskDetailModalProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TaskData {
  id: string;
  task_key: string;
  title: string;
  description: string | null;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  created_at: string;
  updated_at: string;
  status_id: string | null;
  workstream_id: string | null;
  assignee_id: string | null;
  status?: { id: string; name: string; slug: string; color?: string };
  workstream?: { id: string; name: string; color?: string; key_prefix?: string };
  assignee?: { id: string; full_name: string | null; email?: string; avatar_url?: string | null };
}

export function TaskDetailModal({ taskId, open, onOpenChange }: TaskDetailModalProps) {
  const [activeTab, setActiveTab] = useState('description');
  const queryClient = useQueryClient();
  const { updateNow, updateDebounced, flushPending, isPending } = useUpdatePlannerTaskField();

  // Fetch task data
  const { data: task, isLoading } = useQuery({
    queryKey: ['task-detail', taskId],
    queryFn: async (): Promise<TaskData | null> => {
      if (!taskId) return null;

      const { data, error } = await supabase
        .from('planner_tasks')
        .select(`
          *,
          status:planner_statuses(*),
          workstream:planner_workstreams(id, name, color, key_prefix),
          assignee:profiles!planner_tasks_assignee_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq('id', taskId)
        .single();

      if (error) throw error;
      return data as TaskData;
    },
    enabled: !!taskId && open,
  });

  // Fetch activity count for badge
  const { data: activities = [] } = useTaskActivity(taskId);

  // Realtime subscription
  usePlannerTaskRealtime({
    taskId: open ? taskId : null,
    onDelete: () => onOpenChange(false),
  });

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (taskId) flushPending(taskId);
        onOpenChange(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange, taskId, flushPending]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  const handleClose = useCallback(() => {
    if (taskId) flushPending(taskId);
    onOpenChange(false);
  }, [taskId, flushPending, onOpenChange]);

  const handleFieldChange = useCallback((field: string, value: any, debounce = false) => {
    if (!taskId) return;
    if (debounce) {
      updateDebounced(taskId, field, value);
    } else {
      updateNow(taskId, field, value);
    }
  }, [taskId, updateNow, updateDebounced]);

  if (!open) return null;

  const tabs = [
    { id: 'description', label: 'Description' },
    { id: 'notes', label: 'Notes' },
    { id: 'checklist', label: 'Checklist' },
    { id: 'links', label: 'Links' },
    { id: 'files', label: 'Files' },
    { id: 'activity', label: 'Activity', badge: activities.length || undefined },
  ];

  const renderTabContent = () => {
    if (!task) return null;

    switch (activeTab) {
      case 'description':
        return <DescriptionTab task={task} onChange={handleFieldChange} />;
      case 'notes':
        return <NotesTab taskId={task.id} workstreamId={task.workstream_id} />;
      case 'checklist':
        return <ChecklistTab taskId={task.id} />;
      case 'links':
        return <LinksTab taskId={task.id} />;
      case 'files':
        return <FilesTab taskId={task.id} />;
      case 'activity':
        return <ActivityTab taskId={task.id} />;
      default:
        return null;
    }
  };

  return (
    <div className="task-modal-overlay" onClick={handleClose}>
      <div className="task-modal" onClick={(e) => e.stopPropagation()}>
        {isLoading ? (
          <div className="task-modal-loading">
            <div className="loading-spinner" />
          </div>
        ) : task ? (
          <>
            <TaskModalHeader 
              task={task} 
              onClose={handleClose}
              onTitleChange={(value) => handleFieldChange('title', value, true)}
            />
            <TaskMetadataBar 
              task={task} 
              onChange={handleFieldChange}
            />
            <TaskModalTabs 
              tabs={tabs} 
              activeTab={activeTab} 
              onTabChange={setActiveTab}
            />
            <div className="task-modal-content">
              {renderTabContent()}
            </div>
            <TaskModalFooter task={task} isSaving={isPending} />
          </>
        ) : (
          <div className="task-modal-error">Task not found</div>
        )}
      </div>
    </div>
  );
}
