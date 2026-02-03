import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar, Check, Plus, Loader2 } from 'lucide-react';
import type { T10Week } from '../../types';
import { formatWeekRange, getWeekStartDate } from '../../utils';

interface T10WeekNavigationProps {
  weeks: T10Week[];
  currentWeek: T10Week | null;
  currentWeekIndex: number;
  onNavigate: (index: number) => void;
  onCreateWeek: () => Promise<void>;
  isCreating?: boolean;
}

export function T10WeekNavigation({
  weeks,
  currentWeek,
  currentWeekIndex,
  onNavigate,
  onCreateWeek,
  isCreating = false,
}: T10WeekNavigationProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const canNavigatePrev = currentWeekIndex > 0;
  const canNavigateNext = currentWeekIndex < weeks.length - 1;

  // Check if current calendar week has a week entry
  const todayWeekStart = getWeekStartDate(new Date()).split('T')[0];
  const hasCurrentCalendarWeek = weeks.some(w => w.week_start_date === todayWeekStart);
  const isViewingCurrentWeek = currentWeek?.week_start_date === todayWeekStart;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatWeekDisplay = () => {
    if (currentWeek) {
      const start = new Date(currentWeek.week_start_date);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return formatWeekRange(start, end);
    }
    return 'Select Week';
  };

  const getWeekLabel = (week: T10Week, index: number) => {
    const start = new Date(week.week_start_date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const range = formatWeekRange(start, end);
    
    if (week.week_start_date === todayWeekStart) {
      return { range, label: 'Current Week' };
    }
    if (index === 0 && !week.is_checked_out) {
      return { range, label: 'Active' };
    }
    return { range, label: week.is_checked_out ? 'Closed' : null };
  };

  const handleSelectWeek = (index: number) => {
    onNavigate(index);
    setDropdownOpen(false);
  };

  const handleCreateWeek = async () => {
    setDropdownOpen(false);
    await onCreateWeek();
  };

  return (
    <div className="t10-week-nav" ref={dropdownRef}>
      <button 
        className="t10-week-nav-btn" 
        disabled={!canNavigatePrev}
        onClick={() => onNavigate(currentWeekIndex - 1)}
        title="Previous week"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="t10-week-selector">
        <button 
          className={`t10-week-selector-trigger ${dropdownOpen ? 'open' : ''}`}
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <Calendar size={16} />
          <span className="t10-week-selector-date">{formatWeekDisplay()}</span>
          {currentWeek?.is_checked_out && (
            <span className="t10-week-status-badge closed">
              <Check size={12} /> Closed
            </span>
          )}
          {!currentWeek?.is_checked_out && isViewingCurrentWeek && (
            <span className="t10-week-status-badge current">Current</span>
          )}
          <ChevronDown size={16} className={`t10-week-selector-chevron ${dropdownOpen ? 'rotated' : ''}`} />
        </button>

        {dropdownOpen && (
          <div className="t10-week-dropdown">
            <div className="t10-week-dropdown-header">
              <span>Select Week</span>
            </div>
            <div className="t10-week-dropdown-list">
              {weeks.length === 0 ? (
                <div className="t10-week-dropdown-empty">
                  <p>No weeks created yet</p>
                </div>
              ) : (
                weeks.map((week, index) => {
                  const { range, label } = getWeekLabel(week, index);
                  const isSelected = index === currentWeekIndex;
                  
                  return (
                    <button
                      key={week.id}
                      className={`t10-week-dropdown-item ${isSelected ? 'selected' : ''} ${week.is_checked_out ? 'closed' : ''}`}
                      onClick={() => handleSelectWeek(index)}
                    >
                      <div className="t10-week-dropdown-item-main">
                        <span className="t10-week-dropdown-item-date">{range}</span>
                        {label && (
                          <span className={`t10-week-dropdown-item-label ${label === 'Closed' ? 'closed' : label === 'Current Week' ? 'current' : 'active'}`}>
                            {label}
                          </span>
                        )}
                      </div>
                      {week.is_checked_out && (
                        <div className="t10-week-dropdown-item-stats">
                          <span>{week.closed_count} done</span>
                          <span>{week.carried_count} carried</span>
                        </div>
                      )}
                      {isSelected && <Check size={16} className="t10-week-dropdown-check" />}
                    </button>
                  );
                })
              )}
            </div>
            
            {!hasCurrentCalendarWeek && (
              <div className="t10-week-dropdown-footer">
                <button 
                  className="t10-week-create-btn"
                  onClick={handleCreateWeek}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Start This Week
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <button 
        className="t10-week-nav-btn" 
        disabled={!canNavigateNext}
        onClick={() => onNavigate(currentWeekIndex + 1)}
        title="Next week"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
