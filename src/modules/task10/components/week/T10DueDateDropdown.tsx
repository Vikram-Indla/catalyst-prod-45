// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10DueDateDropdown
// Purpose: Inline due date picker for priority items - same style as label dropdown
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, X, Check } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, isToday, isTomorrow, isPast, isSameDay } from 'date-fns';
import { useT10UpdateItem } from '../../hooks/useT10Items';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface T10DueDateDropdownProps {
  itemId: string;
  currentDueDate: string | null;
  onDueDateChange?: () => void;
}

function formatDueDate(date: string | null): string {
  if (!date) return '';
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'MMM d');
}

function getDueDateStatus(date: string | null): 'overdue' | 'today' | 'upcoming' | 'normal' {
  if (!date) return 'normal';
  const d = new Date(date);
  if (isPast(d) && !isToday(d)) return 'overdue';
  if (isToday(d)) return 'today';
  if (isTomorrow(d)) return 'upcoming';
  return 'normal';
}

export function T10DueDateDropdown({ 
  itemId, 
  currentDueDate,
  onDueDateChange 
}: T10DueDateDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updateItem = useT10UpdateItem();

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectDate = async (date: Date | null) => {
    try {
      await updateItem.mutateAsync({
        id: itemId,
        due_date: date ? format(date, 'yyyy-MM-dd') : null,
      });
      onDueDateChange?.();
      setIsOpen(false);
    } catch (error) {
      console.error('[T10] Error updating due date:', error);
    }
  };

  const handleRemoveDate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await handleSelectDate(null);
  };

  const handleQuickSelect = async (date: Date) => {
    await handleSelectDate(date);
  };

  const status = getDueDateStatus(currentDueDate);

  const chipColorMap = {
    overdue: { bg: '#fef2f2', border: '#fca5a5', color: '#dc2626' },
    today: { bg: '#fefce8', border: '#fde047', color: '#ca8a04' },
    upcoming: { bg: '#eff6ff', border: '#93c5fd', color: '#2563eb' },
    normal: { bg: '#f8fafc', border: '#cbd5e1', color: '#64748b' },
  };

  const colors = chipColorMap[status];

  return (
    <div className="t10-duedate-dropdown" ref={dropdownRef}>
      {/* Current Date / Add button */}
      <div className="t10-duedate-dropdown-current">
        {currentDueDate ? (
          <span
            className="t10-duedate-chip"
            style={{ 
              backgroundColor: colors.bg,
              borderColor: colors.border,
              color: colors.color
            }}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
          >
            <Calendar size={12} />
            {formatDueDate(currentDueDate)}
            <button
              type="button"
              className="t10-duedate-chip-remove"
              onClick={handleRemoveDate}
              style={{ color: colors.color }}
            >
              <X size={10} />
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="t10-duedate-add-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
          >
            <Calendar size={12} />
            Due date
          </button>
        )}
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="t10-duedate-dropdown-panel">
          {/* Quick Actions */}
          <div className="t10-duedate-quick-actions">
            <button
              type="button"
              className={`t10-duedate-quick-btn ${currentDueDate && isToday(new Date(currentDueDate)) ? 'selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleQuickSelect(new Date());
              }}
            >
              Today
            </button>
            <button
              type="button"
              className={`t10-duedate-quick-btn ${currentDueDate && isTomorrow(new Date(currentDueDate)) ? 'selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleQuickSelect(addDays(new Date(), 1));
              }}
            >
              Tomorrow
            </button>
            <button
              type="button"
              className="t10-duedate-quick-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleQuickSelect(endOfWeek(new Date(), { weekStartsOn: 1 }));
              }}
            >
              End of week
            </button>
          </div>

          {/* Calendar */}
          <div className="t10-duedate-calendar">
            <CalendarComponent
              mode="single"
              selected={currentDueDate ? new Date(currentDueDate) : undefined}
              onSelect={(date) => {
                if (date) handleSelectDate(date);
              }}
              className="t10-calendar-component"
            />
          </div>

          {/* Clear Button */}
          {currentDueDate && (
            <div className="t10-duedate-footer">
              <button
                type="button"
                className="t10-duedate-clear-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectDate(null);
                }}
              >
                <X size={14} />
                Clear due date
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
