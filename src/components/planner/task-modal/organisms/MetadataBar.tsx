// ============================================================================
// ORGANISM: MetadataBar — 4-column metadata dropdowns (Portal-based)
// Uses portal overlays to avoid footer collision in modal contexts
// ============================================================================

import React from 'react';
import { COLORS, STATUS_COLORS, PRIORITY_COLORS, WORKSTREAM_COLORS, STATUSES, PRIORITIES, WORKSTREAMS, DEFAULT_ASSIGNEES } from '../colors';
import { PortalMetaDropdown, PortalAssigneeDropdown } from '../molecules';
import { Task, TaskStatus, TaskPriority, TaskWorkstream, Assignee } from '../types';

interface MetadataBarProps {
  task: Task;
  onStatusChange: (status: TaskStatus) => void;
  onPriorityChange: (priority: TaskPriority) => void;
  onWorkstreamChange: (workstream: TaskWorkstream) => void;
  onAssigneeChange: (assignee: Assignee | undefined) => void;
}

export const MetadataBar: React.FC<MetadataBarProps> = ({
  task,
  onStatusChange,
  onPriorityChange,
  onWorkstreamChange,
  onAssigneeChange
}) => {
  // Build options arrays
  const statusOptions = STATUSES.map(s => ({ value: s, color: STATUS_COLORS[s] }));
  const priorityOptions = PRIORITIES.map(p => ({ value: p, color: PRIORITY_COLORS[p] }));
  const workstreamOptions = WORKSTREAMS.map(w => ({ value: w, color: WORKSTREAM_COLORS[w] }));

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        padding: '18px 28px',
        backgroundColor: COLORS.surfacePage,
        borderBottom: `1px solid ${COLORS.borderLight}`
      }}
    >
      {/* STATUS DROPDOWN — Portal-based */}
      <PortalMetaDropdown
        label="Status"
        value={task.status}
        options={statusOptions}
        onChange={(value) => onStatusChange(value as TaskStatus)}
        colorMap={STATUS_COLORS}
      />

      {/* PRIORITY DROPDOWN — Portal-based */}
      <PortalMetaDropdown
        label="Priority"
        value={task.priority}
        options={priorityOptions}
        onChange={(value) => onPriorityChange(value as TaskPriority)}
        colorMap={PRIORITY_COLORS}
      />

      {/* WORKSTREAM DROPDOWN — Portal-based */}
      <PortalMetaDropdown
        label="Workstream"
        value={task.workstream}
        options={workstreamOptions}
        onChange={(value) => onWorkstreamChange(value as TaskWorkstream)}
        colorMap={WORKSTREAM_COLORS}
      />

      {/* ASSIGNEE DROPDOWN — Portal-based */}
      <PortalAssigneeDropdown
        value={task.assignee}
        onChange={onAssigneeChange}
        assignees={DEFAULT_ASSIGNEES}
      />
    </div>
  );
};

export default MetadataBar;
