// ============================================================================
// ORGANISM: ModalHeader — Task modal header with actions (FIX 6: Kebab menu)
// ============================================================================

import React, { useState } from 'react';
import { X, Link2, MoreHorizontal, Edit2, Trash2, Copy, Archive, Star } from 'lucide-react';
import { COLORS } from '../colors';
import { IconButton } from '../atoms';
import { Task } from '../types';
import { useTaskActions } from '../hooks/useTaskActions';
import { useToast } from '@/hooks/use-toast';

interface ModalHeaderProps {
  task: Task;
  onClose: () => void;
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
  onCopyLink,
  onEdit,
  onDelete,
  onArchive,
  onTaskUpdated,
  onTaskDeleted
}) => {
  const [showKebabMenu, setShowKebabMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { duplicateTask, archiveTask, deleteTask, isLoading } = useTaskActions();
  const { toast } = useToast();

  const handleCopyLink = () => {
    const url = `${window.location.origin}/task/${task.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied', description: 'Task link copied to clipboard' });
    if (onCopyLink) onCopyLink();
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
          {/* TASK ID — Monospace */}
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
          
          {/* SEPARATOR */}
          <span style={{ color: COLORS.textLight }}>·</span>
          
          {/* WORKSTREAM LINK */}
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
          {/* COPY LINK */}
          <IconButton
            icon={<Link2 size={18} />}
            onClick={handleCopyLink}
            title="Copy link"
          />

          {/* KEBAB MENU */}
          <div style={{ position: 'relative' }}>
            <IconButton
              icon={<MoreHorizontal size={18} />}
              onClick={() => setShowKebabMenu(!showKebabMenu)}
              title="More options"
            />
            
            {/* KEBAB DROPDOWN - FIX 6: Wired to Supabase */}
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

          {/* CLOSE */}
          <IconButton
            icon={<X size={18} />}
            onClick={onClose}
            title="Close"
          />
        </div>
      </div>

      {/* TASK TITLE — h1, NOT INPUT */}
      <h1
        style={{
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

      {/* DELETE CONFIRMATION DIALOG - FIX 6 */}
      {showDeleteConfirm && (
        <>
          {/* Backdrop */}
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
          {/* Dialog */}
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
      {/* BACKDROP */}
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
      
      {/* MENU */}
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
          onClick={() => {
            // Favorites functionality can be added
            onClose();
          }}
        />
        <MenuItem 
          icon={<Archive size={16} />} 
          label="Archive" 
          onClick={onArchive}
          disabled={isLoading}
        />
        <div style={{ 
          height: '1px', 
          backgroundColor: COLORS.borderLight, 
          margin: '6px 0' 
        }} />
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
