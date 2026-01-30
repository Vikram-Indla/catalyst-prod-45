/**
 * Description Tab Component
 * Textarea + 3-column fields (Priority, Due Date, Start Date) + Add labels button
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown, Calendar, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DescriptionTabProps {
  task: {
    description: string | null;
    priority: string;
    due_date: string | null;
    start_date: string | null;
  };
  onChange: (field: string, value: any, debounce?: boolean) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  'critical': '#dc2626',
  'high': '#f97316',
  'medium': '#eab308', // YELLOW
  'low': '#94a3b8',
};

const PRIORITIES = ['critical', 'high', 'medium', 'low'];

export function DescriptionTab({ task, onChange }: DescriptionTabProps) {
  const [description, setDescription] = useState(task.description || '');
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

  // Sync with prop changes
  useEffect(() => {
    setDescription(task.description || '');
  }, [task.description]);

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    onChange('description', e.target.value, true); // debounced
  };

  const handleDateChange = (field: 'due_date' | 'start_date', date: Date | undefined) => {
    onChange(field, date ? format(date, 'yyyy-MM-dd') : null);
  };

  return (
    <div className="description-tab">
      {/* NO "Description" HEADER — start directly with textarea */}
      <textarea
        className="description-textarea"
        placeholder="What is this task about? Add context, requirements, or notes..."
        value={description}
        onChange={handleDescriptionChange}
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
              style={{ backgroundColor: PRIORITY_COLORS[task.priority.toLowerCase()] || '#eab308' }}
            />
            <span className="field-text" style={{ textTransform: 'capitalize' }}>{task.priority}</span>
            <ChevronDown size={16} className="field-chevron" />
          </div>
          {showPriorityDropdown && (
            <div className="dropdown-menu show">
              {PRIORITIES.map((priority) => (
                <div
                  key={priority}
                  className={`dropdown-item ${task.priority.toLowerCase() === priority ? 'selected' : ''}`}
                  onClick={() => {
                    onChange('priority', priority);
                    setShowPriorityDropdown(false);
                  }}
                >
                  <span className="item-dot" style={{ backgroundColor: PRIORITY_COLORS[priority] }} />
                  <span className="item-text" style={{ textTransform: 'capitalize' }}>{priority}</span>
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
                <span className={`field-text ${!task.due_date ? 'placeholder' : ''}`}>
                  {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'Set due date...'}
                </span>
                <ChevronDown size={16} className="field-chevron" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={task.due_date ? new Date(task.due_date) : undefined}
                onSelect={(date) => handleDateChange('due_date', date)}
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
                <span className={`field-text ${!task.start_date ? 'placeholder' : ''}`}>
                  {task.start_date ? format(new Date(task.start_date), 'MMM d, yyyy') : 'Set start date...'}
                </span>
                <ChevronDown size={16} className="field-chevron" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={task.start_date ? new Date(task.start_date) : undefined}
                onSelect={(date) => handleDateChange('start_date', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ADD LABELS — STYLED BUTTON */}
      <div className="labels-section">
        <button className="add-labels-btn">
          <Tag size={18} />
          Add labels
        </button>
      </div>
    </div>
  );
}
