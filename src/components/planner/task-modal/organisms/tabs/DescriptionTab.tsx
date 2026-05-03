// ============================================================================
// ORGANISM: DescriptionTab — Description tab content (ADS-compliant)
// NO "Description" header — starts directly with textarea
// ============================================================================

import React, { useState } from 'react';
import { CanonicalDescriptionField } from '@/components/shared/CanonicalDescriptionField';
import { useCanonicalDescription } from '@/hooks/useCanonicalDescription';
import { PRIORITY_COLORS, PRIORITIES } from '../../colors';
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
  onLabelsChange,
}) => {
  const { description: fetchedDescription, save, isSaving, error } = useCanonicalDescription(
    task.id,
    'task'
  );
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(task.description || fetchedDescription);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    onDescriptionChange(newValue);
  };

  const handleSave = async () => {
    await save(value);
  };

  const priorityOptions = PRIORITIES.map((p) => ({
    value: p,
    color: PRIORITY_COLORS[p],
  }));

  return (
    <div>
      {/* DESCRIPTION — Using CanonicalDescriptionField */}
      <CanonicalDescriptionField
        workItemId={task.id}
        workItemType="task"
        value={value}
        onChange={handleChange}
        onSave={handleSave}
        isEditing={isEditing}
        onEditToggle={setIsEditing}
        isLoading={isSaving}
        error={error?.message}
        maxLength={10000}
        placeholder="What is this task about? Add context, requirements, or notes..."
        isRequired={false}
      />

      {/* FIELDS ROW — 3 columns */}
      <div className="grid grid-cols-3 gap-5 mt-7">
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
      <div className="mt-7">
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Labels
        </label>
        <LabelsManager taskId={task.id} onLabelsChange={onLabelsChange} />
      </div>
    </div>
  );
};

export default DescriptionTab;
