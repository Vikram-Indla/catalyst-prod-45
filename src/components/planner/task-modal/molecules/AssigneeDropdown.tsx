// ============================================================================
// MOLECULE: AssigneeDropdown — Assignee selector with avatars
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { COLORS, DEFAULT_ASSIGNEES } from '../colors';
import { Avatar, Label } from '../atoms';
import { Assignee } from '../types';

interface AssigneeDropdownProps {
  value?: Assignee;
  onChange: (assignee: Assignee | undefined) => void;
  assignees?: Assignee[];
}

export const AssigneeDropdown: React.FC<AssigneeDropdownProps> = ({
  value,
  onChange,
  assignees = DEFAULT_ASSIGNEES
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = value?.name || 'Unassigned';
  const displayInitials = value?.initials || '?';
  const displayColor = value?.color || '#94a3b8';

  return (
    <div 
      ref={dropdownRef}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '6px', 
        position: 'relative' 
      }}
    >
      {/* LABEL */}
      <Label size="sm">Assignee</Label>

      {/* TRIGGER */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          backgroundColor: COLORS.surfaceCard,
          border: `1px solid ${isOpen ? COLORS.borderFocus : (isHovered ? COLORS.borderDefault : COLORS.borderLight)}`,
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none'
        }}
      >
        {/* AVATAR — 26px */}
        <Avatar initials={displayInitials} color={displayColor} size="sm" />
        
        {/* TEXT */}
        <span style={{ 
          flex: 1, 
          fontSize: '14px', 
          fontWeight: 500, 
          color: COLORS.textPrimary 
        }}>
          {displayName}
        </span>
        
        {/* CHEVRON */}
        <ChevronDown 
          size={16} 
          style={{ 
            color: COLORS.textLight,
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }} 
        />
      </div>

      {/* DROPDOWN MENU - FIX 1: z-index 99999 */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: COLORS.surfaceCard,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            zIndex: 99999,
            padding: '6px',
            maxHeight: '280px',
            overflowY: 'auto'
          }}
        >
          {assignees.map((assignee) => (
            <AssigneeItem
              key={assignee.id}
              assignee={assignee}
              isSelected={value?.id === assignee.id}
              onClick={() => {
                onChange(assignee.name === 'Unassigned' ? undefined : assignee);
                setIsOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Sub-component: AssigneeItem
const AssigneeItem: React.FC<{
  assignee: Assignee;
  isSelected: boolean;
  onClick: () => void;
}> = ({ assignee, isSelected, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        backgroundColor: isSelected 
          ? COLORS.accentLight 
          : (isHovered ? COLORS.surfaceHover : 'transparent'),
        transition: 'background-color 0.1s ease'
      }}
    >
      {/* AVATAR IN MENU — 28px */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          backgroundColor: assignee.color,
          color: '#ffffff',
          fontSize: '11px',
          fontWeight: 600
        }}
      >
        {assignee.initials}
      </span>
      <span style={{ fontSize: '14px', color: COLORS.textPrimary }}>{assignee.name}</span>
    </div>
  );
};

export default AssigneeDropdown;
