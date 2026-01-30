// ============================================================================
// MOLECULE: PortalDatePicker — Portal-based date picker with collision avoidance
// Renders calendar to document.body to avoid stacking context issues
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import { COLORS } from '../colors';
import { Label } from '../atoms';
import { useOverlayPosition } from '../utils/useOverlayPosition';

interface PortalDatePickerProps {
  label: string;
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const PortalDatePicker: React.FC<PortalDatePickerProps> = ({
  label,
  value,
  placeholder = 'Set date...',
  onChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value);
    return new Date();
  });
  
  const triggerRef = useRef<HTMLDivElement>(null);
  const selectedDate = value ? new Date(value) : null;
  
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
        // Check if click is inside the portal content
        const portalContent = document.querySelector('[data-portal-date-picker]');
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

  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number): number => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  }, [viewDate]);

  const handleNextMonth = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  }, [viewDate]);

  const handleSelectDate = useCallback((day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(newDate.toISOString());
    setIsOpen(false);
  }, [viewDate, onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  }, [onChange]);

  const handleQuickDate = useCallback((daysToAdd: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    onChange(date.toISOString());
    setIsOpen(false);
  }, [onChange]);

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();
    
    const days: React.ReactNode[] = [];
    
    // Empty cells for days before first of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} style={{ width: '36px', height: '36px' }} />);
    }
    
    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = selectedDate && 
        selectedDate.getDate() === day && 
        selectedDate.getMonth() === month && 
        selectedDate.getFullYear() === year;
      const isToday = today.getDate() === day && 
        today.getMonth() === month && 
        today.getFullYear() === year;
      
      days.push(
        <button
          key={day}
          onClick={() => handleSelectDate(day)}
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            border: isToday && !isSelected ? `1px solid ${COLORS.accent}` : 'none',
            backgroundColor: isSelected ? COLORS.accent : 'transparent',
            color: isSelected ? '#ffffff' : COLORS.textPrimary,
            fontSize: '14px',
            fontWeight: isSelected || isToday ? 600 : 400,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background-color 0.1s ease'
          }}
          onMouseEnter={(e) => {
            if (!isSelected) e.currentTarget.style.backgroundColor = COLORS.surfaceHover;
          }}
          onMouseLeave={(e) => {
            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {day}
        </button>
      );
    }
    
    return days;
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '8px', 
        position: 'relative' 
      }}
    >
      {/* LABEL */}
      <Label size="md">{label}</Label>

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
          padding: '12px 14px',
          backgroundColor: COLORS.surfaceCard,
          border: `1px solid ${isOpen ? COLORS.borderFocus : (isHovered ? COLORS.borderFocus : COLORS.borderDefault)}`,
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none'
        }}
      >
        <Calendar size={18} style={{ color: COLORS.textLight, flexShrink: 0 }} />
        <span 
          style={{ 
            flex: 1, 
            fontSize: '14px', 
            color: selectedDate ? COLORS.textPrimary : COLORS.textLight 
          }}
        >
          {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
        </span>
        {selectedDate && (
          <X 
            size={16} 
            style={{ color: COLORS.textLight, cursor: 'pointer' }} 
            onClick={handleClear}
          />
        )}
        <ChevronDown 
          size={16} 
          style={{ 
            color: COLORS.textLight,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }} 
        />
      </div>

      {/* PORTAL CALENDAR POPUP */}
      {isOpen && position && createPortal(
        <div
          data-portal-date-picker
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            backgroundColor: COLORS.surfaceCard,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
            zIndex: 'var(--z-modal-popover, 500)',
            padding: '16px',
            width: '300px',
            maxHeight: position.maxHeight,
            overflowY: 'auto'
          }}
        >
          {/* MONTH NAVIGATION */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}
          >
            <button
              onClick={handlePrevMonth}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                border: `1px solid ${COLORS.borderLight}`,
                borderRadius: '8px',
                cursor: 'pointer',
                color: COLORS.textMuted
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontSize: '15px', fontWeight: 600, color: COLORS.textPrimary }}>
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button
              onClick={handleNextMonth}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                border: `1px solid ${COLORS.borderLight}`,
                borderRadius: '8px',
                cursor: 'pointer',
                color: COLORS.textMuted
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* DAY HEADERS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px',
              marginBottom: '8px'
            }}
          >
            {DAYS.map(day => (
              <div
                key={day}
                style={{
                  width: '36px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: COLORS.textMuted
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* CALENDAR GRID */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px'
            }}
          >
            {renderCalendar()}
          </div>

          {/* QUICK ACTIONS */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: `1px solid ${COLORS.borderLight}`
            }}
          >
            <button
              onClick={() => handleQuickDate(0)}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: COLORS.surfaceHover,
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: COLORS.textSecondary,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              Today
            </button>
            <button
              onClick={() => handleQuickDate(1)}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: COLORS.surfaceHover,
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: COLORS.textSecondary,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              Tomorrow
            </button>
            <button
              onClick={() => handleQuickDate(7)}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: COLORS.surfaceHover,
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: COLORS.textSecondary,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              Next Week
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PortalDatePicker;
