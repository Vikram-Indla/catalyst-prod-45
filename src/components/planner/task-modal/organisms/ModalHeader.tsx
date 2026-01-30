// ============================================================================
// ORGANISM: ModalHeader — With editable title + pencil button
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { X, Link2, MoreHorizontal, Edit2, Trash2, Copy, Archive, Star, Check } from 'lucide-react';
import { COLORS } from '../colors';
import { IconButton } from '../atoms';
import { Task } from '../types';
import { useTaskActions } from '../hooks/useTaskActions';
import { useToast } from '@/hooks/use-toast';

interface ModalHeaderProps {
  task: Task;
  onClose: () => void;
  onTitleChange?: (title: string) => void;
  onCopyLink?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  task,
  onClose,
  onTitleChange,
  onCopyLink,
  onEdit,
  onDelete,
  onArchive,
  onTaskUpdated,
  onTaskDeleted
}) => {
  const [showKebabMenu, setShowKebabMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  const { duplicateTask, archiveTask, deleteTask, isLoading } = useTaskActions();
  const { toast } = useToast();

  // Update title value when task changes
  useEffect(() => {
    setTitleValue(task.title);
  }, [task.title]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/planner/task/${task.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied', description: 'Task link copied to clipboard' });
    if (onCopyLink) onCopyLink();
  };

  const handleTitleSubmit = () => {
    const trimmedTitle = titleValue.trim();
    if (trimmedTitle && trimmedTitle !== task.title) {
      if (onTitleChange) onTitleChange(trimmedTitle);
    } else {
      setTitleValue(task.title); // Reset if empty
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setTitleValue(task.title);
      setIsEditingTitle(false);
    }
  };

  const handleDuplicate = async () => {
    const newTask = await duplicateTask(task);
    if (newTask && onTaskUpdated) {
      onTaskUpdated(newTask);
    }
    setShowKebabMenu(false);
  };

  const handleArchive = async () => {
    const success = await archiveTask(task.id);
    if (success) {
      if (onArchive) onArchive();
      onClose();
    }
    setShowKebabMenu(false);
  };

  const handleDelete = async () => {
    const success = await deleteTask(task.id);
    if (success) {
      if (onTaskDeleted) onTaskDeleted(task.id);
      if (onDelete) onDelete();
      onClose();
    }
    setShowDeleteConfirm(false);
    setShowKebabMenu(false);
  };

  return (
    <div
      style={{
        padding: '24px 28px 20px',
        borderBottom: `1px solid ${COLORS.borderLight}`,
        backgroundColor: COLORS.surfaceCard
      }}
    >
      {/* TOP ROW */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}
      >
        {/* TASK META INFO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", Consolas, monospace',
              fontSize: '14px',
              fontWeight: 600,
              color: COLORS.textMuted
            }}
          >
            {task.taskId}
          </span>
          <span style={{ color: COLORS.textLight }}>·</span>
          <span
            style={{
              fontSize: '14px',
              color: COLORS.textMuted,
              cursor: 'pointer',
              transition: 'color 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = COLORS.accent}
            onMouseLeave={(e) => e.currentTarget.style.color = COLORS.textMuted}
          >
            {task.workstream}
          </span>
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <IconButton
            icon={<Link2 size={18} />}
            onClick={handleCopyLink}
            title="Copy link"
          />
          <div style={{ position: 'relative' }}>
            <IconButton
              icon={<MoreHorizontal size={18} />}
              onClick={() => setShowKebabMenu(!showKebabMenu)}
              title="More options"
            />
            {showKebabMenu && (
              <KebabMenu
                onEdit={onEdit}
                onDuplicate={handleDuplicate}
                onArchive={handleArchive}
                onDeleteClick={() => setShowDeleteConfirm(true)}
                onClose={() => setShowKebabMenu(false)}
                isLoading={isLoading}
              />
            )}
          </div>
          <IconButton
            icon={<X size={18} />}
            onClick={onClose}
            title="Close"
          />
        </div>
      </div>

      {/* TASK TITLE ROW - WITH PENCIL BUTTON */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {isEditingTitle ? (
          /* EDIT MODE */
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <input
              ref={titleInputRef}
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={handleTitleKeyDown}
              style={{
                flex: 1,
                fontSize: '24px',
                fontWeight: 600,
                color: COLORS.textPrimary,
                lineHeight: 1.3,
                padding: '4px 8px',
                margin: '-4px -8px',
                border: `2px solid ${COLORS.borderFocus}`,
                borderRadius: '8px',
                outline: 'none',
                fontFamily: 'inherit',
                backgroundColor: COLORS.surfaceCard,
                boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.15)'
              }}
            />
            <button
              onClick={handleTitleSubmit}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: COLORS.accent,
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                cursor: 'pointer'
              }}
              title="Save title"
            >
              <Check size={18} />
            </button>
          </div>
        ) : (
          /* VIEW MODE */
          <>
            <h1
              style={{
                flex: 1,
                fontSize: '24px',
                fontWeight: 600,
                color: COLORS.textPrimary,
                lineHeight: 1.3,
                margin: 0,
                padding: 0
              }}
            >
              {task.title}
            </h1>
            
            {/* PENCIL BUTTON */}
            <button
              onClick={() => setIsEditingTitle(true)}
              title="Edit title"
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                border: `1px solid ${COLORS.borderLight}`,
                borderRadius: '8px',
                color: COLORS.textMuted,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.surfaceHover;
                e.currentTarget.style.borderColor = COLORS.borderDefault;
                e.currentTarget.style.color = COLORS.textSecondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = COLORS.borderLight;
                e.currentTarget.style.color = COLORS.textMuted;
              }}
            >
              <Edit2 size={16} />
            </button>
          </>
        )}
      </div>

      {/* DELETE CONFIRMATION DIALOG */}
      {showDeleteConfirm && (
        <>
          <div
            onClick={() => setShowDeleteConfirm(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              zIndex: 100000
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '400px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
              zIndex: 100001
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
              Delete Task
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc2626',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#ffffff',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Sub-component: KebabMenu
const KebabMenu: React.FC<{
  onEdit?: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDeleteClick: () => void;
  onClose: () => void;
  isLoading: boolean;
}> = ({ onEdit, onDuplicate, onArchive, onDeleteClick, onClose, isLoading }) => {
  const MenuItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    danger?: boolean;
    disabled?: boolean;
  }> = ({ icon, label, onClick, danger, disabled }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
      <div
        onClick={() => {
          if (disabled) return;
          if (onClick) onClick();
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          borderRadius: '8px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: isHovered && !disabled ? (danger ? '#fef2f2' : COLORS.surfaceHover) : 'transparent',
          color: danger ? '#dc2626' : COLORS.textPrimary,
          fontSize: '14px',
          transition: 'background-color 0.1s ease',
          opacity: disabled ? 0.5 : 1
        }}
      >
        {icon}
        {label}
      </div>
    );
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99998
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          width: '200px',
          backgroundColor: COLORS.surfaceCard,
          border: `1px solid ${COLORS.borderDefault}`,
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
          zIndex: 99999,
          padding: '6px'
        }}
      >
        <MenuItem 
          icon={<Edit2 size={16} />} 
          label="Edit task" 
          onClick={() => {
            if (onEdit) onEdit();
            onClose();
          }}
        />
        <MenuItem 
          icon={<Copy size={16} />} 
          label="Duplicate" 
          onClick={onDuplicate}
          disabled={isLoading}
        />
        <MenuItem 
          icon={<Star size={16} />} 
          label="Add to favorites" 
          onClick={() => onClose()}
        />
        <MenuItem 
          icon={<Archive size={16} />} 
          label="Archive" 
          onClick={onArchive}
          disabled={isLoading}
        />
        <div style={{ height: '1px', backgroundColor: COLORS.borderLight, margin: '6px 0' }} />
        <MenuItem 
          icon={<Trash2 size={16} />} 
          label="Delete task" 
          onClick={onDeleteClick}
          danger 
          disabled={isLoading}
        />
      </div>
    </>
  );
};

export default ModalHeader;
