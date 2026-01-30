/**
 * TASK DETAIL MODAL
 * Main modal component following specification
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useUpdatePlannerTaskField } from '../../hooks/useUpdatePlannerTaskField';
import { usePlannerStatuses } from '../../hooks/usePlannerStatuses';
import { usePlannerWorkstreams } from '../../hooks/usePlannerWorkstreams';
import { usePlannerUsers } from '../../hooks/usePlannerUsers';
import { useTaskComments } from '../../hooks/useTaskDetails';
import { TaskModalHeader } from './TaskModalHeader';
import { TaskMetadataBar } from './TaskMetadataBar';
import { TaskModalTabs } from './TaskModalTabs';
import { TaskModalFooter } from './TaskModalFooter';
import { DescriptionTab } from './tabs/DescriptionTab';
import { NotesTab } from './tabs/NotesTab';
import { ChecklistTab } from './tabs/ChecklistTab';
import { LinksTab } from './tabs/LinksTab';
import { FilesTab } from './tabs/FilesTab';
import { ActivityTab } from './tabs/ActivityTab';
import { TaskModalTab, Assignee } from './types';
import '@/styles/task-detail-modal.css';

interface TaskDetailModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  taskId,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState('description');
  const { user } = useAuth();
  const { updateNow, updateDebounced, flushPending } = useUpdatePlannerTaskField();

  // Fetch task data
  const { data: task, isLoading } = useQuery({
    queryKey: ['task-detail', taskId],
    queryFn: async () => {
      if (!taskId) return null;

      const { data, error } = await supabase
        .from('planner_tasks')
        .select(`
          *,
          status:planner_statuses(*),
          workstream:planner_workstreams(id, name, color),
          assignee:profiles!planner_tasks_assignee_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq('id', taskId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!taskId && isOpen,
  });

  // Fetch reference data
  const { data: statuses = [] } = usePlannerStatuses();
  const { data: workstreams = [] } = usePlannerWorkstreams();
  const { data: users = [] } = usePlannerUsers();
  const { data: comments = [] } = useTaskComments(taskId);

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('description');
    }
  }, [isOpen, taskId]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (taskId) flushPending(taskId);
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose, taskId, flushPending]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  // Close handler with pending updates flush
  const handleClose = useCallback(() => {
    if (taskId) flushPending(taskId);
    onClose();
  }, [taskId, flushPending, onClose]);

  if (!isOpen || !taskId) return null;

  if (isLoading) {
    return (
      <div className="task-modal-overlay" onClick={handleClose}>
        <div className="task-modal" onClick={(e) => e.stopPropagation()}>
          <div className="task-modal-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!task) return null;

  // Transform assignees for dropdown
  const assigneeOptions: Assignee[] = [
    { id: 'unassigned', name: 'Unassigned', initials: '?', color: '#94a3b8' },
    ...users.map((u) => ({
      id: u.id,
      name: u.name || u.email || 'Unknown',
      initials: getInitials(u.name || u.email),
      color: getAvatarColor(u.name || u.email),
      avatar_url: u.avatarUrl,
    })),
  ];

  // Current assignee
  const currentAssignee = task.assignee_id
    ? assigneeOptions.find((a) => a.id === task.assignee_id) || null
    : null;

  // Current user info
  const currentUserName = user?.user_metadata?.full_name || user?.email || 'User';
  const currentUserInitials = getInitials(currentUserName);
  const currentUserColor = getAvatarColor(currentUserName);

  // Tabs with activity count
  const tabs: TaskModalTab[] = [
    { id: 'description', label: 'Description' },
    { id: 'notes', label: 'Notes' },
    { id: 'checklist', label: 'Checklist' },
    { id: 'links', label: 'Links' },
    { id: 'files', label: 'Files' },
    { id: 'activity', label: 'Activity', badge: comments.length },
  ];

  // Field change handlers
  const handleStatusChange = (statusId: string, statusName: string) => {
    updateNow(taskId, 'status_id', statusId);
  };

  const handlePriorityChange = (priority: string) => {
    updateNow(taskId, 'priority', priority);
  };

  const handleWorkstreamChange = (workstreamId: string, workstreamName: string) => {
    updateNow(taskId, 'workstream_id', workstreamId);
  };

  const handleAssigneeChange = (assignee: Assignee | null) => {
    updateNow(taskId, 'assignee_id', assignee?.id || null);
  };

  const handleDescriptionChange = (value: string) => {
    updateDebounced(taskId, 'description', value);
  };

  const handleDueDateChange = (value: string | null) => {
    updateNow(taskId, 'due_date', value);
  };

  const handleStartDateChange = (value: string | null) => {
    updateNow(taskId, 'start_date', value);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'description':
        return (
          <DescriptionTab
            description={task.description}
            priority={task.priority}
            dueDate={task.due_date}
            startDate={task.start_date}
            onDescriptionChange={handleDescriptionChange}
            onPriorityChange={handlePriorityChange}
            onDueDateChange={handleDueDateChange}
            onStartDateChange={handleStartDateChange}
          />
        );
      case 'notes':
        return (
          <NotesTab
            taskId={taskId}
            workstreamId={task.workstream_id}
            currentUserInitials={currentUserInitials}
            currentUserColor={currentUserColor}
          />
        );
      case 'checklist':
        return <ChecklistTab taskId={taskId} />;
      case 'links':
        return <LinksTab taskId={taskId} />;
      case 'files':
        return <FilesTab taskId={taskId} />;
      case 'activity':
        return (
          <ActivityTab
            taskId={taskId}
            currentUserInitials={currentUserInitials}
            currentUserColor={currentUserColor}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="task-modal-overlay" onClick={handleClose}>
      <div className="task-modal" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <TaskModalHeader
          taskKey={task.key}
          workstream={task.workstream?.name || null}
          title={task.title}
          onClose={handleClose}
        />

        {/* METADATA BAR */}
        <TaskMetadataBar
          status={task.status?.name || 'Backlog'}
          priority={task.priority}
          workstream={task.workstream?.name || null}
          workstreamColor={task.workstream?.color || null}
          assignee={currentAssignee}
          statuses={statuses.map((s) => ({ id: s.id, name: s.name, slug: s.slug }))}
          workstreams={workstreams.map((w) => ({ id: w.id, name: w.name, color: w.color || '#64748b' }))}
          assignees={assigneeOptions}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
          onWorkstreamChange={handleWorkstreamChange}
          onAssigneeChange={handleAssigneeChange}
        />

        {/* TABS */}
        <TaskModalTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* CONTENT AREA */}
        <div className="task-modal-content">{renderTabContent()}</div>

        {/* FOOTER */}
        <TaskModalFooter createdAt={task.created_at} updatedAt={task.updated_at} />
      </div>
    </div>
  );
};

// Helper functions
function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string | null | undefined): string {
  if (!name) return '#94a3b8';
  const colors = ['#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6', '#f59e0b'];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}
