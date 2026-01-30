/**
 * TASK METADATA BAR
 * 4 dropdowns: Status, Priority, Workstream, Assignee
 * All with colored dots
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { STATUS_COLORS, PRIORITY_COLORS, WORKSTREAM_COLORS, Assignee } from './types';

interface TaskMetadataBarProps {
  status: string;
  priority: string;
  workstream: string | null;
  workstreamColor: string | null;
  assignee: Assignee | null;
  statuses: Array<{ id: string; name: string; slug: string }>;
  workstreams: Array<{ id: string; name: string; color: string }>;
  assignees: Assignee[];
  onStatusChange: (statusId: string, statusName: string) => void;
  onPriorityChange: (priority: string) => void;
  onWorkstreamChange: (workstreamId: string, workstreamName: string) => void;
  onAssigneeChange: (assignee: Assignee | null) => void;
}

const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const PRIORITY_LABELS: Record<string, string> = {
  'critical': 'Critical',
  'high': 'High',
  'medium': 'Medium',
  'low': 'Low',
};

export const TaskMetadataBar: React.FC<TaskMetadataBarProps> = ({
  status,
  priority,
  workstream,
  workstreamColor,
  assignee,
  statuses,
  workstreams,
  assignees,
  onStatusChange,
  onPriorityChange,
  onWorkstreamChange,
  onAssigneeChange,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = (id: string) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const closeDropdowns = () => setOpenDropdown(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdowns();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="metadata-bar" ref={containerRef}>
      {/* STATUS DROPDOWN */}
      <div className="meta-field">
        <span className="meta-label">STATUS</span>
        <div
          className={`meta-dropdown ${openDropdown === 'status' ? 'open' : ''}`}
          onClick={() => toggleDropdown('status')}
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
                key={s.id}
                className={`dropdown-item ${status === s.name ? 'selected' : ''}`}
                onClick={() => {
                  onStatusChange(s.id, s.name);
                  closeDropdowns();
                }}
              >
                <span className="item-dot" style={{ backgroundColor: STATUS_COLORS[s.name] || '#94a3b8' }} />
                <span className="item-text">{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PRIORITY DROPDOWN */}
      <div className="meta-field">
        <span className="meta-label">PRIORITY</span>
        <div
          className={`meta-dropdown ${openDropdown === 'priority' ? 'open' : ''}`}
          onClick={() => toggleDropdown('priority')}
        >
          <span
            className="meta-dot"
            style={{ backgroundColor: PRIORITY_COLORS[priority] || '#eab308' }}
          />
          <span className="meta-text">{PRIORITY_LABELS[priority] || priority}</span>
          <ChevronDown size={16} className="meta-chevron" />
        </div>
        {openDropdown === 'priority' && (
          <div className="dropdown-menu show">
            {PRIORITIES.map((p) => (
              <div
                key={p}
                className={`dropdown-item ${priority === p ? 'selected' : ''}`}
                onClick={() => {
                  onPriorityChange(p);
                  closeDropdowns();
                }}
              >
                <span className="item-dot" style={{ backgroundColor: PRIORITY_COLORS[p] }} />
                <span className="item-text">{PRIORITY_LABELS[p]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WORKSTREAM DROPDOWN */}
      <div className="meta-field">
        <span className="meta-label">WORKSTREAM</span>
        <div
          className={`meta-dropdown ${openDropdown === 'workstream' ? 'open' : ''}`}
          onClick={() => toggleDropdown('workstream')}
        >
          <span
            className="meta-dot"
            style={{ backgroundColor: workstreamColor || WORKSTREAM_COLORS[workstream || ''] || '#64748b' }}
          />
          <span className="meta-text">{workstream || 'Unassigned'}</span>
          <ChevronDown size={16} className="meta-chevron" />
        </div>
        {openDropdown === 'workstream' && (
          <div className="dropdown-menu show">
            {workstreams.map((ws) => (
              <div
                key={ws.id}
                className={`dropdown-item ${workstream === ws.name ? 'selected' : ''}`}
                onClick={() => {
                  onWorkstreamChange(ws.id, ws.name);
                  closeDropdowns();
                }}
              >
                <span className="item-dot" style={{ backgroundColor: ws.color || '#64748b' }} />
                <span className="item-text">{ws.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ASSIGNEE DROPDOWN */}
      <div className="meta-field">
        <span className="meta-label">ASSIGNEE</span>
        <div
          className={`meta-dropdown ${openDropdown === 'assignee' ? 'open' : ''}`}
          onClick={() => toggleDropdown('assignee')}
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
            {assignees.map((a) => (
              <div
                key={a.id}
                className={`dropdown-item ${assignee?.id === a.id ? 'selected' : ''}`}
                onClick={() => {
                  onAssigneeChange(a.id === 'unassigned' ? null : a);
                  closeDropdowns();
                }}
              >
                <span className="item-avatar" style={{ backgroundColor: a.color }}>
                  {a.initials}
                </span>
                <span className="item-text">{a.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
