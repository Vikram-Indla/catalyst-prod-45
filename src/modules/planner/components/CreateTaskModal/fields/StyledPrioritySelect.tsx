/**
 * Styled Priority Select - TaskBoardModal Style
 * Portal-based dropdown with color indicators
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import type { TaskPriority } from '../../../types';

// Colors from TaskBoardModal
const COLORS = {
  textPrimary: '#0f172a',
  textLight: '#94a3b8',
  surfaceCard: '#ffffff',
  surfaceHover: '#f1f5f9',
  borderLight: '#e2e8f0',
  borderDefault: '#cbd5e1',
  borderFocus: '#3b82f6',
  accentLight: '#dbeafe'
};

// Priority colors - Medium is Yellow per spec
const PRIORITY_COLORS: Record<string, string> = {
  'critical': '#dc2626',
  'high': '#f97316',
  'medium': '#eab308',
  'low': '#94a3b8'
};

const PRIORITIES: Array<{ value: TaskPriority; label: string }> = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

interface StyledPrioritySelectProps {
  value: TaskPriority;
  onChange: (value: TaskPriority) => void;
}

export function StyledPrioritySelect({ value, onChange }: StyledPrioritySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  
  const selected = PRIORITIES.find(p => p.value === value);

  // Get trigger position for portal
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current && !triggerRef.current.contains(target)) {
        const portalContent = document.querySelector('[data-styled-priority-dropdown]');
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

  const handleSelect = useCallback((priority: TaskPriority) => {
    onChange(priority);
    setIsOpen(false);
  }, [onChange]);

  const currentColor = PRIORITY_COLORS[value] || COLORS.textLight;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* LABEL */}
      <span style={{
        fontSize: '11px',
        fontWeight: 600,
        color: COLORS.textLight,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        Priority
      </span>

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
        <span 
          style={{ 
            width: '10px', 
            height: '10px', 
            borderRadius: '50%', 
            backgroundColor: currentColor,
            flexShrink: 0
          }} 
        />
        <span style={{ flex: 1, fontSize: '14px', fontWeight: 500, color: COLORS.textPrimary }}>
          {selected?.label || 'Medium'}
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

      {/* PORTAL DROPDOWN */}
      {isOpen && position && createPortal(
        <div
          data-styled-priority-dropdown
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width: Math.max(position.width, 180),
            backgroundColor: COLORS.surfaceCard,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
            zIndex: 500,
            padding: '6px'
          }}
        >
          {PRIORITIES.map((p) => (
            <PriorityItem
              key={p.value}
              label={p.label}
              color={PRIORITY_COLORS[p.value]}
              isSelected={p.value === value}
              onClick={() => handleSelect(p.value)}
            />
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// Sub-component
function PriorityItem({ label, color, isSelected, onClick }: {
  label: string;
  color: string;
  isSelected: boolean;
  onClick: () => void;
}) {
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
      <span 
        style={{ 
          width: '10px', 
          height: '10px', 
          borderRadius: '50%', 
          backgroundColor: color,
          flexShrink: 0
        }} 
      />
      <span style={{ flex: 1, fontSize: '14px', color: COLORS.textPrimary }}>{label}</span>
      {isSelected && <Check size={16} style={{ color: '#2563eb' }} />}
    </div>
  );
}
