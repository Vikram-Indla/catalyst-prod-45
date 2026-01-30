// ============================================================
// TASK METADATA BAR
// 4 dropdowns: Status, Priority, Workstream, Assignee
// All with colored dots
// ============================================================

import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { STATUS_COLORS, PRIORITY_COLORS, WORKSTREAM_COLORS } from './types';

interface Assignee {
  id: string;
  name: string;
  initials: string;
  color: string;
}

interface TaskMetadataBarProps {
  status: string;
  priority: string;
  workstream: string;
  assignee: Assignee | null;
  onStatusChange: (status: string) => void;
  onPriorityChange: (priority: string) => void;
  onWorkstreamChange: (workstream: string) => void;
  onAssigneeChange: (assignee: Assignee | null) => void;
  statuses: string[];
  priorities: string[];
  workstreams: string[];
  assignees: Assignee[];
}

export const TaskMetadataBar: React.FC<TaskMetadataBarProps> = ({
  status,
  priority,
  workstream,
  assignee,
  onStatusChange,
  onPriorityChange,
  onWorkstreamChange,
  onAssigneeChange,
  statuses,
  priorities,
  workstreams,
  assignees,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const toggleDropdown = (id: string) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const closeDropdowns = () => setOpenDropdown(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = () => closeDropdowns();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="metadata-bar">
      {/* STATUS DROPDOWN */}
      <div className="meta-field">
        <span className="meta-label">Status</span>
        <div
          className={`meta-dropdown ${openDropdown === 'status' ? 'open' : ''}`}
          onClick={(e) => { e.stopPropagation(); toggleDropdown('status'); }}
        >
          <span
            className="meta-dot"
            style={{ backgroundColor: STATUS_COLORS[status] || '#94a3b8' }}
          />
          <span className="meta-text">{status}</span>
          <ChevronDown size={16} className="meta-chevron" />
        </div>
        {openDropdown === 'status' && (
          <div className="dropdown-menu show">
            {statuses.map((s) => (
              <div
                key={s}
                className={`dropdown-item ${status === s ? 'selected' : ''}`}
                onClick={() => { onStatusChange(s); closeDropdowns(); }}
              >
                <span className="item-dot" style={{ backgroundColor: STATUS_COLORS[s] }} />
                <span className="item-text">{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PRIORITY DROPDOWN */}
      <div className="meta-field">
        <span className="meta-label">Priority</span>
        <div
          className={`meta-dropdown ${openDropdown === 'priority' ? 'open' : ''}`}
          onClick={(e) => { e.stopPropagation(); toggleDropdown('priority'); }}
        >
          <span
            className="meta-dot"
            style={{ backgroundColor: PRIORITY_COLORS[priority] || '#eab308' }}
          />
          <span className="meta-text">{priority}</span>
          <ChevronDown size={16} className="meta-chevron" />
        </div>
        {openDropdown === 'priority' && (
          <div className="dropdown-menu show">
            {priorities.map((p) => (
              <div
                key={p}
                className={`dropdown-item ${priority === p ? 'selected' : ''}`}
                onClick={() => { onPriorityChange(p); closeDropdowns(); }}
              >
                <span className="item-dot" style={{ backgroundColor: PRIORITY_COLORS[p] }} />
                <span className="item-text">{p}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WORKSTREAM DROPDOWN */}
      <div className="meta-field">
        <span className="meta-label">Workstream</span>
        <div
          className={`meta-dropdown ${openDropdown === 'workstream' ? 'open' : ''}`}
          onClick={(e) => { e.stopPropagation(); toggleDropdown('workstream'); }}
        >
          <span
            className="meta-dot"
            style={{ backgroundColor: WORKSTREAM_COLORS[workstream] || '#64748b' }}
          />
          <span className="meta-text">{workstream || 'None'}</span>
          <ChevronDown size={16} className="meta-chevron" />
        </div>
        {openDropdown === 'workstream' && (
          <div className="dropdown-menu show">
            {workstreams.map((ws) => (
              <div
                key={ws}
                className={`dropdown-item ${workstream === ws ? 'selected' : ''}`}
                onClick={() => { onWorkstreamChange(ws); closeDropdowns(); }}
              >
                <span className="item-dot" style={{ backgroundColor: WORKSTREAM_COLORS[ws] }} />
                <span className="item-text">{ws}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ASSIGNEE DROPDOWN */}
      <div className="meta-field">
        <span className="meta-label">Assignee</span>
        <div
          className={`meta-dropdown ${openDropdown === 'assignee' ? 'open' : ''}`}
          onClick={(e) => { e.stopPropagation(); toggleDropdown('assignee'); }}
        >
          <span
            className="avatar-sm"
            style={{ backgroundColor: assignee?.color || '#94a3b8' }}
          >
            {assignee?.initials || '?'}
          </span>
          <span className="meta-text">{assignee?.name || 'Unassigned'}</span>
          <ChevronDown size={16} className="meta-chevron" />
        </div>
        {openDropdown === 'assignee' && (
          <div className="dropdown-menu show">
            <div
              className={`dropdown-item ${!assignee ? 'selected' : ''}`}
              onClick={() => { onAssigneeChange(null); closeDropdowns(); }}
            >
              <span className="item-avatar" style={{ backgroundColor: '#94a3b8' }}>?</span>
              <span className="item-text">Unassigned</span>
            </div>
            {assignees.map((a) => (
              <div
                key={a.id}
                className={`dropdown-item ${assignee?.id === a.id ? 'selected' : ''}`}
                onClick={() => { onAssigneeChange(a); closeDropdowns(); }}
              >
                <span className="item-avatar" style={{ backgroundColor: a.color }}>{a.initials}</span>
                <span className="item-text">{a.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
