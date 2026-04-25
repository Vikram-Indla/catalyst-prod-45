// ============================================================================
// ORGANISM: DescriptionTab — Description tab content
// NO "Description" header — starts directly with textarea
// ============================================================================

import React, { useState } from 'react';
import { COLORS, PRIORITY_COLORS, PRIORITIES } from '../../colors';
import { FieldDropdown, DateDropdown } from '../../molecules';
import { LabelsManager } from '../../molecules/LabelsManager';
import { Task, TaskPriority } from '../../types';
import { Label } from '../../types/labels';

interface DescriptionTabProps {
  task: Task;
  onDescriptionChange: (description: string) => void;
  onPriorityChange: (priority: TaskPriority) => void;
  onDueDateChange: (date: string) => void;
  onStartDateChange: (date: string) => void;
  onLabelsChange?: (labels: Label[]) => void;
}

export const DescriptionTab: React.FC<DescriptionTabProps> = ({
  task,
  onDescriptionChange,
  onPriorityChange,
  onDueDateChange,
  onStartDateChange,
  onLabelsChange
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const priorityOptions = PRIORITIES.map(p => ({ value: p, color: PRIORITY_COLORS[p] }));

  return (
    <div>
      {/* 
        CRITICAL: NO "Description" HEADER HERE
        The tab name already says "Description"
        Start directly with the textarea
      */}

      {/* DESCRIPTION TEXTAREA */}
      <textarea
        value={task.description || ''}
        onChange={(e) => onDescriptionChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="What is this task about? Add context, requirements, or notes..."
        style={{
          width: '100%',
          minHeight: '160px',
          padding: '16px 18px',
          border: `1px solid ${isFocused ? COLORS.borderFocus : COLORS.borderDefault}`,
          borderRadius: '12px',
          fontFamily: 'var(--ds-font-family-body)',
          fontSize: '14px',
          lineHeight: 1.6,
          color: COLORS.textPrimary,
          backgroundColor: COLORS.surfaceCard,
          resize: 'vertical',
          outline: 'none',
          boxShadow: isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          boxSizing: 'border-box'
        }}
      />

      {/* FIELDS ROW — 3 columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
          marginTop: '28px'
        }}
      >
        {/* PRIORITY */}
        <FieldDropdown
          label="Priority"
          value={task.priority}
          options={priorityOptions}
          onChange={(value) => onPriorityChange(value as TaskPriority)}
          colorMap={PRIORITY_COLORS}
        />

        {/* DUE DATE */}
        <DateDropdown
          label="Due Date"
          value={task.dueDate}
          placeholder="Set due date..."
          onChange={onDueDateChange}
        />

        {/* START DATE */}
        <DateDropdown
          label="Start Date"
          value={task.startDate}
          placeholder="Set start date..."
          onChange={onStartDateChange}
        />
      </div>

      {/* LABELS SECTION */}
      <div style={{ marginTop: '28px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            marginBottom: '12px'
          }}
        >
          Labels
        </label>
        <LabelsManager 
          taskId={task.id} 
          onLabelsChange={onLabelsChange}
        />
      </div>
    </div>
  );
};

export default DescriptionTab;
