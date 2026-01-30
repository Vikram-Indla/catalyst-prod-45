// ============================================================================
// MOLECULE: PortalAssigneeDropdown — Portal-based assignee dropdown
// Renders to document.body for collision avoidance in modal contexts
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, User, X } from 'lucide-react';
import { COLORS, DEFAULT_ASSIGNEES } from '../colors';
import { Label, Avatar } from '../atoms';
import { Assignee } from '../types';
import { useOverlayPosition } from '../utils/useOverlayPosition';

interface PortalAssigneeDropdownProps {
  value?: Assignee;
  onChange: (assignee: Assignee | undefined) => void;
  assignees?: Assignee[];
}

export const PortalAssigneeDropdown: React.FC<PortalAssigneeDropdownProps> = ({
  value,
  onChange,
  assignees = DEFAULT_ASSIGNEES
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  
  // Get position with collision avoidance
  const position = useOverlayPosition({
    triggerRef,
    isOpen,
    preferredSide: 'bottom',
    sideOffset: 4,
    collisionPadding: { top: 8, bottom: 68, left: 8, right: 8 }
  });

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current && !triggerRef.current.contains(target)) {
        const portalContent = document.querySelector('[data-portal-assignee-dropdown]');
        if (portalContent && portalContent.contains(target)) return;
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleSelect = useCallback((assignee: Assignee) => {
    onChange(assignee);
    setIsOpen(false);
  }, [onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  }, [onChange]);

  const triggerWidth = triggerRef.current?.offsetWidth || 200;

  return (
    <div 
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
        ref={triggerRef}
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
        {value ? (
          <>
            <Avatar 
              initials={value.initials || value.name.split(' ').map(n => n[0]).join('')} 
              color={value.color || COLORS.accent} 
              size="sm" 
            />
            <span style={{ 
              flex: 1, 
              fontSize: '14px', 
              fontWeight: 500, 
              color: COLORS.textPrimary 
            }}>
              {value.name}
            </span>
            <X 
              size={16} 
              style={{ color: COLORS.textLight, cursor: 'pointer' }} 
              onClick={handleClear}
            />
          </>
        ) : (
          <>
            <User size={18} style={{ color: COLORS.textLight }} />
            <span style={{ 
              flex: 1, 
              fontSize: '14px', 
              color: COLORS.textLight 
            }}>
              Unassigned
            </span>
          </>
        )}
        <ChevronDown 
          size={16} 
          style={{ 
            color: COLORS.textLight,
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }} 
        />
      </div>

      {/* PORTAL DROPDOWN MENU */}
      {isOpen && position && createPortal(
        <div
          data-portal-assignee-dropdown
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width: Math.max(triggerWidth, 220),
            backgroundColor: COLORS.surfaceCard,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
            zIndex: 'var(--z-modal-popover, 500)',
            padding: '6px',
            maxHeight: position.maxHeight,
            overflowY: 'auto'
          }}
        >
          {assignees.map((assignee) => (
            <AssigneeItem
              key={assignee.id}
              assignee={assignee}
              isSelected={value?.id === assignee.id}
              onClick={() => handleSelect(assignee)}
            />
          ))}
        </div>,
        document.body
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
  const initials = assignee.initials || assignee.name.split(' ').map(n => n[0]).join('');

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
      <Avatar 
        initials={initials} 
        color={assignee.color || COLORS.accent} 
        size="sm" 
      />
      <span style={{ fontSize: '14px', color: COLORS.textPrimary }}>{assignee.name}</span>
    </div>
  );
};

export default PortalAssigneeDropdown;
