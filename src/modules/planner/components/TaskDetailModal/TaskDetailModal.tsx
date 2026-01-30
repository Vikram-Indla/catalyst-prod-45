// ============================================================
// TASK DETAIL MODAL - V3
// Complete rebuild with 6 tabs, colored dropdowns, real-time sync
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { TaskModalHeader } from './TaskModalHeader';
import { TaskMetadataBar } from './TaskMetadataBar';
import { TaskModalTabs } from './TaskModalTabs';
import { TaskModalFooter } from './TaskModalFooter';
import {
  DescriptionTab,
  NotesTab,
  ChecklistTab,
  LinksTab,
  FilesTab,
  ActivityTab,
} from './tabs';
import { useTaskDetailData, useTaskDetailMutations } from './hooks';
import { usePlannerUsers } from '../../hooks/usePlannerUsers';
import type { TaskTab, ChecklistItem, TaskFile } from './types';
import '@/styles/task-detail-modal.css';

interface TaskDetailModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

// Default options
const STATUSES = ['Backlog', 'Planned', 'In Progress', 'In Review', 'Done'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const WORKSTREAMS = ['Catalyst', 'Data & AI', 'Delivery', 'MIM', 'Senaei'];

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  taskId,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState('description');
  const [localChecklist, setLocalChecklist] = useState<ChecklistItem[]>([]);
  const [localFiles, setLocalFiles] = useState<TaskFile[]>([]);

  // Fetch task data with real-time subscription
  const { task, notes, links, isLoading, isError } = useTaskDetailData(taskId);
  const mutations = useTaskDetailMutations(taskId);
  const { data: users = [] } = usePlannerUsers();

  // Map users to assignee format
  const assignees = users.map((u) => ({
    id: u.id,
    name: u.name || 'Unknown',
    initials: u.initials || 'U',
    color: '#8b5cf6',
  }));

  // Reset tab when task changes
  useEffect(() => {
    if (taskId) {
      setActiveTab('description');
    }
  }, [taskId]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handlers
  const handleFieldChange = useCallback(
    (field: string, value: any) => {
      mutations.updateField.mutate({ field, value });
    },
    [mutations.updateField]
  );

  const handleStatusChange = useCallback(
    (status: string) => {
      // Find status ID - for now just update the name
      handleFieldChange('status_id', status);
    },
    [handleFieldChange]
  );

  const handlePriorityChange = useCallback(
    (priority: string) => {
      handleFieldChange('priority', priority.toLowerCase());
    },
    [handleFieldChange]
  );

  const handleAssigneeChange = useCallback(
    (assignee: { id: string } | null) => {
      handleFieldChange('assignee_id', assignee?.id || null);
    },
    [handleFieldChange]
  );

  const handleAddNote = useCallback(
    (content: string) => {
      mutations.addNote.mutate(content);
    },
    [mutations.addNote]
  );

  const handleAddLink = useCallback(
    (url: string, title: string) => {
      mutations.addLink.mutate({ url, title });
    },
    [mutations.addLink]
  );

  const handleDeleteLink = useCallback(
    (linkId: string) => {
      mutations.deleteLink.mutate(linkId);
    },
    [mutations.deleteLink]
  );

  // Checklist handlers (local state for now)
  const handleToggleChecklistItem = useCallback((itemId: string) => {
    setLocalChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    );
  }, []);

  const handleDeleteChecklistItem = useCallback((itemId: string) => {
    setLocalChecklist((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const handleAddChecklistItem = useCallback((text: string) => {
    setLocalChecklist((prev) => [
      ...prev,
      { id: Date.now().toString(), text, completed: false },
    ]);
  }, []);

  // File handlers (local state for now)
  const handleUploadFile = useCallback((file: File) => {
    const newFile: TaskFile = {
      id: Date.now().toString(),
      name: file.name,
      size: file.size < 1024 * 1024 
        ? `${Math.round(file.size / 1024)} KB` 
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      type: file.name.endsWith('.pdf') ? 'pdf' : 
            file.name.match(/\.(doc|docx)$/) ? 'doc' : 
            file.name.match(/\.(png|jpg|jpeg|gif)$/) ? 'img' : 'other',
      uploaded_at: new Date().toISOString(),
    };
    setLocalFiles((prev) => [...prev, newFile]);
  }, []);

  const handleDeleteFile = useCallback((fileId: string) => {
    setLocalFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const handleAddComment = useCallback((content: string) => {
    // TODO: Implement comments via activity_logs
    console.log('Add comment:', content);
  }, []);

  if (!isOpen) return null;

  const tabs: TaskTab[] = [
    { id: 'description', label: 'Description' },
    { id: 'notes', label: 'Notes', badge: notes.length },
    { id: 'checklist', label: 'Checklist', badge: localChecklist.length },
    { id: 'links', label: 'Links', badge: links.length },
    { id: 'files', label: 'Files', badge: localFiles.length },
    { id: 'activity', label: 'Activity' },
  ];

  const currentAssignee = task?.assignee_id
    ? assignees.find((a) => a.id === task.assignee_id) || null
    : null;

  const renderTabContent = () => {
    if (!task) return null;

    switch (activeTab) {
      case 'description':
        return (
          <DescriptionTab
            description={task.description}
            priority={task.priority}
            dueDate={task.due_date}
            startDate={task.start_date}
            onDescriptionChange={(desc) => handleFieldChange('description', desc)}
            onPriorityChange={handlePriorityChange}
            onDueDateChange={(date) => handleFieldChange('due_date', date)}
            onStartDateChange={(date) => handleFieldChange('start_date', date)}
          />
        );
      case 'notes':
        return <NotesTab notes={notes} onAddNote={handleAddNote} />;
      case 'checklist':
        return (
          <ChecklistTab
            checklist={localChecklist}
            onToggleItem={handleToggleChecklistItem}
            onDeleteItem={handleDeleteChecklistItem}
            onAddItem={handleAddChecklistItem}
          />
        );
      case 'links':
        return (
          <LinksTab
            links={links}
            onAddLink={handleAddLink}
            onDeleteLink={handleDeleteLink}
          />
        );
      case 'files':
        return (
          <FilesTab
            files={localFiles}
            onUploadFile={handleUploadFile}
            onDeleteFile={handleDeleteFile}
          />
        );
      case 'activity':
        return <ActivityTab activities={[]} onAddComment={handleAddComment} />;
      default:
        return null;
    }
  };

  return (
    <div className="task-modal-overlay" onClick={onClose}>
      <div className="task-detail-modal" onClick={(e) => e.stopPropagation()}>
        {isLoading ? (
          <div className="task-modal-loading">
            <Loader2 className="animate-spin" size={32} />
            <span>Loading task...</span>
          </div>
        ) : isError || !task ? (
          <div className="task-modal-error">
            <span>Failed to load task</span>
            <button onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            {/* HEADER */}
            <TaskModalHeader
              taskKey={task.key}
              title={task.title}
              workstream={task.workstream}
              onClose={onClose}
            />

            {/* METADATA BAR */}
            <TaskMetadataBar
              status={task.status}
              priority={task.priority}
              workstream={task.workstream}
              assignee={currentAssignee}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
              onWorkstreamChange={(ws) => handleFieldChange('workstream_id', ws)}
              onAssigneeChange={handleAssigneeChange}
              statuses={STATUSES}
              priorities={PRIORITIES}
              workstreams={WORKSTREAMS}
              assignees={assignees}
            />

            {/* TABS */}
            <TaskModalTabs
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            {/* CONTENT AREA */}
            <div className="content-area">{renderTabContent()}</div>

            {/* FOOTER */}
            <TaskModalFooter
              createdAt={task.created_at}
              updatedAt={task.updated_at}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default TaskDetailModal;
