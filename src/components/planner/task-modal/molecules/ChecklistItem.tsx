// ============================================================================
// MOLECULE: ChecklistItem — Single checklist item with checkbox (FIX 5)
// ============================================================================

import React, { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { COLORS } from '../colors';
import { Checkbox } from '../atoms';

interface ChecklistItemProps {
  id: string;
  text: string;
  completed: boolean;
  onToggle: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ChecklistItem: React.FC<ChecklistItemProps> = ({
  id,
  text,
  completed,
  onToggle,
  onEdit,
  onDelete
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 16px',
        backgroundColor: completed ? COLORS.surfacePage : COLORS.surfaceCard,
        border: `1px solid ${isHovered ? 'var(--ds-text-disabled, #cbd5e1)' : 'var(--ds-border, #e2e8f0)'}`,
        borderRadius: '12px',
        transition: 'all 0.15s ease'
        // NO box-shadow on hover for checklist items - FIX 5
      }}
    >
      {/* CHECKBOX — 22px */}
      <Checkbox 
        checked={completed} 
        onChange={() => onToggle(id)} 
      />

      {/* TEXT */}
      <span
        style={{
          flex: 1,
          fontSize: '14px',
          color: completed ? COLORS.textMuted : COLORS.textPrimary,
          textDecoration: completed ? 'line-through' : 'none'
        }}
      >
        {text}
      </span>

      {/* ACTIONS — Only visible on hover */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.15s ease'
        }}
      >
        {onEdit && (
          <ActionButton icon={<Edit2 size={16} />} onClick={() => onEdit(id)} />
        )}
        <ActionButton icon={<Trash2 size={16} />} onClick={() => onDelete(id)} />
      </div>
    </div>
  );
};

// Sub-component: ActionButton
const ActionButton: React.FC<{
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ icon, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '30px',
        height: '30px',
        backgroundColor: isHovered ? COLORS.surfaceHover : 'transparent',
        border: 'none',
        borderRadius: '6px',
        color: isHovered ? COLORS.textMuted : COLORS.textLight,
        cursor: 'pointer',
        padding: 0
      }}
    >
      {icon}
    </button>
  );
};

export default ChecklistItem;
