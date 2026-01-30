/**
 * Task Metadata Bar Component
 * 4 dropdowns: Status, Priority, Workstream, Assignee — ALL with colored dots
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePlannerUsers } from '../../../hooks/usePlannerUsers';
import { usePlannerWorkstreams } from '../../../hooks/usePlannerWorkstreams';

interface TaskMetadataBarProps {
  task: {
    status_id: string | null;
    priority: string;
    workstream_id: string | null;
    assignee_id: string | null;
    status?: { id: string; name: string; slug: string; color?: string } | null;
    workstream?: { id: string; name: string; color?: string } | null;
    assignee?: { id: string; full_name: string | null } | null;
  };
  onChange: (field: string, value: any) => void;
}

// COLOR MAPPINGS — CRITICAL
const STATUS_COLORS: Record<string, string> = {
  'backlog': '#94a3b8',
  'planned': '#3b82f6',
  'in-progress': '#f59e0b',
  'review': '#8b5cf6',
  'done': '#16a34a',
};

const PRIORITY_COLORS: Record<string, string> = {
  'critical': '#dc2626',
  'high': '#f97316',
  'medium': '#eab308', // YELLOW — NOT BLUE
  'low': '#94a3b8',
};

const WORKSTREAM_COLORS: Record<string, string> = {
  'catalyst': '#6366f1',
  'data-ai': '#8b5cf6',
  'delivery': '#ec4899',
  'mim': '#64748b',
  'senaei': '#14b8a6',
};

const PRIORITIES = ['critical', 'high', 'medium', 'low'];

// Generate avatar color from string
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6', '#f59e0b', '#dc2626'];
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export function TaskMetadataBar({ task, onChange }: TaskMetadataBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Fetch statuses
  const { data: statuses = [] } = useQuery({
    queryKey: ['planner-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planner_statuses')
        .select('*')
        .order('position');
      if (error) throw error;
      return data;
    },
  });

  // Fetch users
  const { data: users = [] } = usePlannerUsers();
  
  // Fetch workstreams
  const { data: workstreams = [] } = usePlannerWorkstreams();

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

  const getStatusColor = (slug: string) => STATUS_COLORS[slug] || '#94a3b8';
  const getPriorityColor = (priority: string) => PRIORITY_COLORS[priority.toLowerCase()] || '#eab308';
  const getWorkstreamColor = (workstream: any) => {
    if (workstream?.color) return workstream.color;
    return WORKSTREAM_COLORS[workstream?.name?.toLowerCase().replace(/\s+/g, '-')] || '#64748b';
  };

  return (
    <div className="metadata-bar">
      {/* STATUS DROPDOWN */}
      <div className="meta-field">
        <span className="meta-label">STATUS</span>
        <div
          className={`meta-dropdown ${openDropdown === 'status' ? 'open' : ''}`}
          onClick={(e) => { e.stopPropagation(); toggleDropdown('status'); }}
        >
          <span
            className="meta-dot"
            style={{ backgroundColor: getStatusColor(task.status?.slug || 'backlog') }}
          />
          <span className="meta-text">{task.status?.name || 'Backlog'}</span>
          <ChevronDown size={16} className="meta-chevron" />
        </div>
        {openDropdown === 'status' && (
          <div className="dropdown-menu show">
            {statuses.map((status) => (
              <div
                key={status.id}
                className={`dropdown-item ${task.status_id === status.id ? 'selected' : ''}`}
                onClick={() => { onChange('status_id', status.id); closeDropdowns(); }}
              >
                <span className="item-dot" style={{ backgroundColor: getStatusColor(status.slug) }} />
                <span className="item-text">{status.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PRIORITY DROPDOWN — MEDIUM IS YELLOW */}
      <div className="meta-field">
        <span className="meta-label">PRIORITY</span>
        <div
          className={`meta-dropdown ${openDropdown === 'priority' ? 'open' : ''}`}
          onClick={(e) => { e.stopPropagation(); toggleDropdown('priority'); }}
        >
          <span
            className="meta-dot"
            style={{ backgroundColor: getPriorityColor(task.priority) }}
          />
          <span className="meta-text" style={{ textTransform: 'capitalize' }}>{task.priority}</span>
          <ChevronDown size={16} className="meta-chevron" />
        </div>
        {openDropdown === 'priority' && (
          <div className="dropdown-menu show">
            {PRIORITIES.map((priority) => (
              <div
                key={priority}
                className={`dropdown-item ${task.priority.toLowerCase() === priority ? 'selected' : ''}`}
                onClick={() => { onChange('priority', priority); closeDropdowns(); }}
              >
                <span className="item-dot" style={{ backgroundColor: getPriorityColor(priority) }} />
                <span className="item-text" style={{ textTransform: 'capitalize' }}>{priority}</span>
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
          onClick={(e) => { e.stopPropagation(); toggleDropdown('workstream'); }}
        >
          <span
            className="meta-dot"
            style={{ backgroundColor: getWorkstreamColor(task.workstream) }}
          />
          <span className="meta-text">{task.workstream?.name || 'None'}</span>
          <ChevronDown size={16} className="meta-chevron" />
        </div>
        {openDropdown === 'workstream' && (
          <div className="dropdown-menu show">
            {workstreams.map((ws) => (
              <div
                key={ws.id}
                className={`dropdown-item ${task.workstream_id === ws.id ? 'selected' : ''}`}
                onClick={() => { onChange('workstream_id', ws.id); closeDropdowns(); }}
              >
                <span className="item-dot" style={{ backgroundColor: ws.color || '#64748b' }} />
                <span className="item-text">{ws.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ASSIGNEE DROPDOWN — WITH AVATAR */}
      <div className="meta-field">
        <span className="meta-label">ASSIGNEE</span>
        <div
          className={`meta-dropdown ${openDropdown === 'assignee' ? 'open' : ''}`}
          onClick={(e) => { e.stopPropagation(); toggleDropdown('assignee'); }}
        >
          <span
            className="avatar-sm"
            style={{ backgroundColor: task.assignee ? stringToColor(task.assignee.full_name || '') : '#94a3b8' }}
          >
            {getInitials(task.assignee?.full_name || null)}
          </span>
          <span className="meta-text">{task.assignee?.full_name || 'Unassigned'}</span>
          <ChevronDown size={16} className="meta-chevron" />
        </div>
        {openDropdown === 'assignee' && (
          <div className="dropdown-menu show">
            {/* Unassigned option */}
            <div
              className={`dropdown-item ${!task.assignee_id ? 'selected' : ''}`}
              onClick={() => { onChange('assignee_id', null); closeDropdowns(); }}
            >
              <span className="item-avatar" style={{ backgroundColor: '#94a3b8' }}>?</span>
              <span className="item-text">Unassigned</span>
            </div>
            {users.map((user) => (
              <div
                key={user.id}
                className={`dropdown-item ${task.assignee_id === user.id ? 'selected' : ''}`}
                onClick={() => { onChange('assignee_id', user.id); closeDropdowns(); }}
              >
                <span className="item-avatar" style={{ backgroundColor: stringToColor(user.name) }}>
                  {user.initials}
                </span>
                <span className="item-text">{user.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
