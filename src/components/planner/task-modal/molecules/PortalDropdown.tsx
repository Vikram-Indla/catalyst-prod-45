// ============================================================================
// MOLECULE: PortalDropdown — Portal-based dropdown with collision avoidance
// Renders dropdown content to document.body to avoid stacking context issues
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { COLORS } from '../colors';
import { ColorDot, Label } from '../atoms';
import { useOverlayPosition } from '../utils/useOverlayPosition';

interface PortalDropdownOption {
  value: string;
  color: string;
}

interface PortalDropdownProps {
  label: string;
  value: string;
  options: PortalDropdownOption[];
  onChange: (value: string) => void;
  colorMap: Record<string, string>;
}

export const PortalDropdown: React.FC<PortalDropdownProps> = ({
  label,
  value,
  options,
  onChange,
  colorMap
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
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    // Use capture phase to catch clicks before other handlers
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

  const handleSelect = useCallback((optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  }, [onChange]);

  const currentColor = colorMap[value] || '#94a3b8';
  const triggerWidth = triggerRef.current?.offsetWidth || 180;

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
      <Label size="sm">{label}</Label>

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
        <ColorDot color={currentColor} size={10} />
        <span style={{ 
          flex: 1, 
          fontSize: '14px', 
          fontWeight: 500, 
          color: COLORS.textPrimary 
        }}>
          {value}
        </span>
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
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width: Math.max(triggerWidth, 180),
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
          {options.map((option) => (
            <DropdownItem
              key={option.value}
              value={option.value}
              color={option.color}
              isSelected={value === option.value}
              onClick={() => handleSelect(option.value)}
            />
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

// Sub-component: DropdownItem
const DropdownItem: React.FC<{
  value: string;
  color: string;
  isSelected: boolean;
  onClick: () => void;
}> = ({ value, color, isSelected, onClick }) => {
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
      <ColorDot color={color} size={10} />
      <span style={{ fontSize: '14px', color: COLORS.textPrimary }}>{value}</span>
    </div>
  );
};

export default PortalDropdown;
