// ============================================================================
// MOLECULE: DateDropdown — Functional date picker (FIX 3)
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import { COLORS } from '../colors';
import { Label } from '../atoms';

interface DateDropdownProps {
  label: string;
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DateDropdown: React.FC<DateDropdownProps> = ({
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
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selectedDate = value ? new Date(value) : null;
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDate = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(newDate.toISOString());
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();
    
    const days: React.ReactNode[] = [];
    
    // Empty cells for days before first of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} style={{ width: '36px', height: '50px' }} />);
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
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            border: isToday && !isSelected ? `1px solid ${COLORS.accent}` : 'none',
            backgroundColor: isSelected ? COLORS.accent : 'transparent',
            color: isSelected ? 'var(--ds-surface, var(--ds-surface, #ffffff))' : COLORS.textPrimary,
            fontSize: '14px',
            fontWeight: isSelected || isToday ? 600 : 400,
            cursor: 'pointer',
            fontFamily: 'inherit'
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
      ref={dropdownRef}
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
          borderRadius: '12px',
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

      {/* CALENDAR POPUP - z-index 99999 */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            backgroundColor: COLORS.surfaceCard,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            zIndex: 99999,
            padding: '16px',
            width: '300px'
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
              onClick={() => {
                onChange(new Date().toISOString());
                setIsOpen(false);
              }}
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
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                onChange(tomorrow.toISOString());
                setIsOpen(false);
              }}
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
              onClick={() => {
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                onChange(nextWeek.toISOString());
                setIsOpen(false);
              }}
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
        </div>
      )}
    </div>
  );
};

export default DateDropdown;
