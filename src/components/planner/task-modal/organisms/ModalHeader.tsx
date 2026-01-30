// ============================================================================
// ORGANISM: ModalHeader — Task modal header with title and actions
// ============================================================================

import React, { useState } from 'react';
import { X, Link2, MoreHorizontal, Edit2, Trash2, Copy, Archive, Star } from 'lucide-react';
import { COLORS } from '../colors';
import { IconButton } from '../atoms';
import { Task } from '../types';

interface ModalHeaderProps {
  task: Task;
  onClose: () => void;
  onCopyLink?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  task,
  onClose,
  onCopyLink,
  onEdit,
  onDelete,
  onArchive
}) => {
  const [showKebabMenu, setShowKebabMenu] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/task/${task.id}`;
    navigator.clipboard.writeText(url);
    if (onCopyLink) onCopyLink();
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
            
            {/* KEBAB DROPDOWN */}
            {showKebabMenu && (
              <KebabMenu
                onEdit={onEdit}
                onDelete={onDelete}
                onArchive={onArchive}
                onClose={() => setShowKebabMenu(false)}
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
    </div>
  );
};

// Sub-component: KebabMenu
const KebabMenu: React.FC<{
  onEdit?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onClose: () => void;
}> = ({ onEdit, onDelete, onArchive, onClose }) => {
  const MenuItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    danger?: boolean;
  }> = ({ icon, label, onClick, danger }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
      <div
        onClick={() => {
          if (onClick) onClick();
          onClose();
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          borderRadius: '8px',
          cursor: 'pointer',
          backgroundColor: isHovered ? (danger ? '#fef2f2' : COLORS.surfaceHover) : 'transparent',
          color: danger ? '#dc2626' : COLORS.textPrimary,
          fontSize: '14px',
          transition: 'background-color 0.1s ease'
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
          zIndex: 999
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
          zIndex: 1000,
          padding: '6px'
        }}
      >
        <MenuItem 
          icon={<Edit2 size={16} />} 
          label="Edit task" 
          onClick={onEdit}
        />
        <MenuItem 
          icon={<Copy size={16} />} 
          label="Duplicate" 
        />
        <MenuItem 
          icon={<Star size={16} />} 
          label="Add to favorites" 
        />
        <MenuItem 
          icon={<Archive size={16} />} 
          label="Archive" 
          onClick={onArchive}
        />
        <div style={{ 
          height: '1px', 
          backgroundColor: COLORS.borderLight, 
          margin: '6px 0' 
        }} />
        <MenuItem 
          icon={<Trash2 size={16} />} 
          label="Delete task" 
          onClick={onDelete}
          danger 
        />
      </div>
    </>
  );
};

export default ModalHeader;
