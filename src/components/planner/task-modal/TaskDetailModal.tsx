// ============================================================================
// TASK BOARD MODAL V10 — FINAL ASSEMBLY WITH AUTO-SAVE
// ============================================================================

import React, { useState, useEffect } from 'react';
import { COLORS } from './colors';
import { 
  ModalHeader, 
  MetadataBar, 
  TabsBar, 
  ModalFooter,
  DescriptionTab,
  NotesTab,
  ChecklistTab,
  LinksTab,
  FilesTab,
  ActivityTab
} from './organisms';
import { useAutoSave } from './hooks/useAutoSave';
import { 
  Task, 
  TabId, 
  Tab, 
  TaskStatus, 
  TaskPriority, 
  TaskWorkstream, 
  Assignee,
  ChecklistItem,
  TaskLink,
  TaskFile,
  Comment
} from './types';

// ============================================================================
// PROPS INTERFACE
// ============================================================================

interface TaskBoardModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (task: Task) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const TaskBoardModal: React.FC<TaskBoardModalProps> = ({
  task,
  isOpen,
  onClose,
  onSave
}) => {
  // ==================== STATE ====================
  const [activeTab, setActiveTab] = useState<TabId>('description');
  const [editedTask, setEditedTask] = useState<Task>(task);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // ==================== AUTO-SAVE HOOK ====================
  const { saveChanges, flush } = useAutoSave({
    debounceMs: 800,
    onSaveStart: () => setIsSaving(true),
    onSaveComplete: () => {
      setIsSaving(false);
      setLastSaved(new Date());
    },
    onSaveError: () => setIsSaving(false)
  });

  // ==================== EFFECTS ====================
  
  // Reset when task changes
  useEffect(() => {
    setEditedTask(task);
    setActiveTab('description');
    setLastSaved(null);
  }, [task]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Flush pending saves on unmount
  useEffect(() => {
    return () => {
      flush();
    };
  }, [flush]);

  // ==================== HANDLERS ====================

  const handleClose = () => {
    flush();
    onClose();
  };

  const handleFieldChange = <K extends keyof Task>(field: K, value: Task[K]) => {
    const updated = { ...editedTask, [field]: value, updatedAt: new Date().toISOString() };
    setEditedTask(updated);
    
    // Trigger auto-save
    saveChanges(task.id, { [field]: value });
    
    // Also call parent onSave for optimistic updates
    if (onSave) onSave(updated);
  };

  // Title change handler
  const handleTitleChange = (title: string) => {
    handleFieldChange('title', title);
  };

  // Status/Priority/Workstream/Assignee
  const handleStatusChange = (status: TaskStatus) => handleFieldChange('status', status);
  const handlePriorityChange = (priority: TaskPriority) => handleFieldChange('priority', priority);
  const handleWorkstreamChange = (workstream: TaskWorkstream) => handleFieldChange('workstream', workstream);
  const handleAssigneeChange = (assignee: Assignee | undefined) => handleFieldChange('assignee', assignee);

  // Description tab
  const handleDescriptionChange = (description: string) => handleFieldChange('description', description);
  const handleDueDateChange = (dueDate: string) => handleFieldChange('dueDate', dueDate);
  const handleStartDateChange = (startDate: string) => handleFieldChange('startDate', startDate);

  // Checklist
  const handleChecklistToggle = (id: string) => {
    const checklist = editedTask.checklist || [];
    const updated = checklist.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    handleFieldChange('checklist', updated);
  };

  const handleChecklistDelete = (id: string) => {
    const checklist = editedTask.checklist || [];
    handleFieldChange('checklist', checklist.filter(item => item.id !== id));
  };

  const handleChecklistAdd = (text: string) => {
    const checklist = editedTask.checklist || [];
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      text,
      completed: false
    };
    handleFieldChange('checklist', [...checklist, newItem]);
  };

  // Links
  const handleLinkAdd = (url: string, title: string) => {
    const links = editedTask.links || [];
    const newLink: TaskLink = {
      id: Date.now().toString(),
      url,
      title
    };
    handleFieldChange('links', [...links, newLink]);
  };

  const handleLinkDelete = (id: string) => {
    const links = editedTask.links || [];
    handleFieldChange('links', links.filter(link => link.id !== id));
  };

  // Files
  const handleFileUpload = (fileList: FileList) => {
    const files = editedTask.files || [];
    const newFiles: TaskFile[] = Array.from(fileList).map(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let type: TaskFile['type'] = 'other';
      if (ext === 'pdf') type = 'pdf';
      else if (['doc', 'docx'].includes(ext)) type = 'doc';
      else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) type = 'img';
      
      return {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        size: file.size < 1024 * 1024 
          ? `${Math.round(file.size / 1024)} KB` 
          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        type,
        uploadedAt: 'Just now'
      };
    });
    handleFieldChange('files', [...files, ...newFiles]);
  };

  const handleFileDelete = (id: string) => {
    const files = editedTask.files || [];
    handleFieldChange('files', files.filter(file => file.id !== id));
  };

  // Notes
  const handleNoteAdd = (content: string) => {
    console.log('Add note:', content);
  };

  // Comments
  const handleCommentAdd = (content: string) => {
    const comments = editedTask.comments || [];
    const newComment: Comment = {
      id: Date.now().toString(),
      content,
      author: 'Current User',
      authorInitials: 'CU',
      authorColor: COLORS.accent,
      createdAt: 'Just now'
    };
    handleFieldChange('comments', [...comments, newComment]);
  };

  // ==================== TAB CONFIG ====================

  const tabs: Tab[] = [
    { id: 'description', label: 'Description' },
    { id: 'notes', label: 'Notes' },
    { id: 'checklist', label: 'Checklist' },
    { id: 'links', label: 'Links' },
    { id: 'files', label: 'Files' },
    { id: 'activity', label: 'Activity', badge: (editedTask.comments?.length || 0) + (editedTask.history?.length || 1) }
  ];

  const history = editedTask.history || [
    { id: '1', action: 'Task created', author: 'System', timestamp: editedTask.createdAt || 'Unknown' }
  ];

  // ==================== RENDER TAB CONTENT ====================

  const renderTabContent = () => {
    switch (activeTab) {
      case 'description':
        return (
          <DescriptionTab
            task={editedTask}
            onDescriptionChange={handleDescriptionChange}
            onPriorityChange={handlePriorityChange}
            onDueDateChange={handleDueDateChange}
            onStartDateChange={handleStartDateChange}
          />
        );
      case 'notes':
        return <NotesTab onAddNote={handleNoteAdd} />;
      case 'checklist':
        return (
          <ChecklistTab
            items={editedTask.checklist || []}
            onToggle={handleChecklistToggle}
            onDelete={handleChecklistDelete}
            onAdd={handleChecklistAdd}
          />
        );
      case 'links':
        return (
          <LinksTab
            links={editedTask.links || []}
            onAdd={handleLinkAdd}
            onDelete={handleLinkDelete}
          />
        );
      case 'files':
        return (
          <FilesTab
            files={editedTask.files || []}
            onUpload={handleFileUpload}
            onDelete={handleFileDelete}
          />
        );
      case 'activity':
        return (
          <ActivityTab
            comments={editedTask.comments || []}
            history={history}
            onAddComment={handleCommentAdd}
          />
        );
      default:
        return null;
    }
  };

  // ==================== RENDER ====================

  if (!isOpen) return null;

  return (
    <>
      {/* OVERLAY */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}
      >
        {/* MODAL CONTAINER */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: COLORS.surfaceCard,
            borderRadius: '16px',
            width: '100%',
            maxWidth: '820px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden'
          }}
        >
          {/* HEADER */}
          <ModalHeader
            task={editedTask}
            onClose={handleClose}
            onTitleChange={handleTitleChange}
          />

          {/* METADATA BAR */}
          <MetadataBar
            task={editedTask}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
            onWorkstreamChange={handleWorkstreamChange}
            onAssigneeChange={handleAssigneeChange}
          />

          {/* TABS BAR */}
          <TabsBar
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* CONTENT AREA */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '28px'
            }}
          >
            {renderTabContent()}
          </div>

          {/* FOOTER WITH SAVE INDICATOR */}
          <ModalFooter 
            task={editedTask} 
            isSaving={isSaving}
            lastSaved={lastSaved}
          />
        </div>
      </div>
    </>
  );
};

export default TaskBoardModal;
