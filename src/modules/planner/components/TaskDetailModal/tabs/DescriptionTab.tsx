// ============================================================
// DESCRIPTION TAB
// Textarea + Priority/Due Date/Start Date fields + Labels button
// ============================================================

import React, { useState } from 'react';
import { ChevronDown, Calendar, Tag } from 'lucide-react';
import { PRIORITY_COLORS } from '../types';
import { format, parseISO } from 'date-fns';

interface DescriptionTabProps {
  description: string | null;
  priority: string;
  dueDate: string | null;
  startDate: string | null;
  onDescriptionChange: (description: string) => void;
  onPriorityChange: (priority: string) => void;
  onDueDateChange: (date: string | null) => void;
  onStartDateChange: (date: string | null) => void;
}

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="description-tab">
      {/* TEXTAREA — Full width, no header */}
      <textarea
        className="description-textarea"
        placeholder="What is this task about? Add context, requirements, or notes..."
        value={description || ''}
        onChange={(e) => onDescriptionChange(e.target.value)}
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
              style={{ backgroundColor: PRIORITY_COLORS[priority] || '#eab308' }}
            />
            <span className="field-text">{priority}</span>
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
                  <span className="item-text">{p}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DUE DATE FIELD */}
        <div className="field-group">
          <label className="field-label">DUE DATE</label>
          <div className="field-dropdown">
            <Calendar size={18} className="field-icon" />
            <input
              type="date"
              className="date-input"
              value={dueDate || ''}
              onChange={(e) => onDueDateChange(e.target.value || null)}
            />
            <span className={`field-text ${!dueDate ? 'placeholder' : ''}`}>
              {formatDate(dueDate) || 'Set due date...'}
            </span>
          </div>
        </div>

        {/* START DATE FIELD */}
        <div className="field-group">
          <label className="field-label">START DATE</label>
          <div className="field-dropdown">
            <Calendar size={18} className="field-icon" />
            <input
              type="date"
              className="date-input"
              value={startDate || ''}
              onChange={(e) => onStartDateChange(e.target.value || null)}
            />
            <span className={`field-text ${!startDate ? 'placeholder' : ''}`}>
              {formatDate(startDate) || 'Set start date...'}
            </span>
          </div>
        </div>
      </div>

      {/* ADD LABELS BUTTON */}
      <div className="labels-section">
        <button className="add-labels-btn">
          <Tag size={18} />
          Add labels
        </button>
      </div>
    </div>
  );
};
