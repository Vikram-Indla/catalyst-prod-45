/**
 * DESCRIPTION TAB
 * No header — textarea directly, then fields row, then labels button
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Calendar, Tag } from 'lucide-react';
import { PRIORITY_COLORS } from '../types';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DescriptionTabProps {
  description: string | null;
  priority: string;
  dueDate: string | null;
  startDate: string | null;
  onDescriptionChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onDueDateChange: (value: string | null) => void;
  onStartDateChange: (value: string | null) => void;
}

const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const DescriptionTab: React.FC<DescriptionTabProps> = ({
  description,
  priority,
  dueDate,
  startDate,
  onDescriptionChange,
  onPriorityChange,
  onDueDateChange,
  onStartDateChange,
}) => {
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [localDescription, setLocalDescription] = useState(description || '');
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setLocalDescription(description || '');
  }, [description]);

  const handleDescriptionChange = (value: string) => {
    setLocalDescription(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onDescriptionChange(value);
    }, 500);
  };

  const formatDateDisplay = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return null;
    }
  };

  return (
    <div className="description-tab">
      {/* TEXTAREA — No header, directly editable */}
      <textarea
        className="description-textarea"
        placeholder="What is this task about? Add context, requirements, or notes..."
        value={localDescription}
        onChange={(e) => handleDescriptionChange(e.target.value)}
      />

      {/* FIELDS ROW — 3 columns */}
      <div className="fields-row">
        {/* PRIORITY FIELD */}
        <div className="field-group">
          <label className="field-label">PRIORITY</label>
          <div
            className={`field-dropdown ${showPriorityDropdown ? 'open' : ''}`}
            onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
          >
            <span
              className="field-dot"
              style={{ backgroundColor: PRIORITY_COLORS[priority] }}
            />
            <span className="field-text">{PRIORITY_LABELS[priority] || priority}</span>
            <ChevronDown size={16} className="field-chevron" />
          </div>
          {showPriorityDropdown && (
            <div className="dropdown-menu show">
              {PRIORITIES.map((p) => (
                <div
                  key={p}
                  className={`dropdown-item ${priority === p ? 'selected' : ''}`}
                  onClick={() => {
                    onPriorityChange(p);
                    setShowPriorityDropdown(false);
                  }}
                >
                  <span className="item-dot" style={{ backgroundColor: PRIORITY_COLORS[p] }} />
                  <span className="item-text">{PRIORITY_LABELS[p]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DUE DATE FIELD */}
        <div className="field-group">
          <label className="field-label">DUE DATE</label>
          <Popover>
            <PopoverTrigger asChild>
              <div className="field-dropdown">
                <Calendar size={18} className="field-icon" />
                <span className={`field-text ${!dueDate ? 'placeholder' : ''}`}>
                  {formatDateDisplay(dueDate) || 'Set due date...'}
                </span>
                <ChevronDown size={16} className="field-chevron" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dueDate ? new Date(dueDate) : undefined}
                onSelect={(date) => onDueDateChange(date ? date.toISOString() : null)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* START DATE FIELD */}
        <div className="field-group">
          <label className="field-label">START DATE</label>
          <Popover>
            <PopoverTrigger asChild>
              <div className="field-dropdown">
                <Calendar size={18} className="field-icon" />
                <span className={`field-text ${!startDate ? 'placeholder' : ''}`}>
                  {formatDateDisplay(startDate) || 'Set start date...'}
                </span>
                <ChevronDown size={16} className="field-chevron" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={startDate ? new Date(startDate) : undefined}
                onSelect={(date) => onStartDateChange(date ? date.toISOString() : null)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ADD LABELS — styled button */}
      <div className="labels-section">
        <button className="add-labels-btn">
          <Tag size={18} />
          Add labels
        </button>
      </div>
    </div>
  );
};
