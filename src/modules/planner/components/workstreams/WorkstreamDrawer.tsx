// ============================================================
// WORKSTREAMS V10 - Detail Drawer Component
// ============================================================

import '@/styles/workstreams.css';
import { useState } from 'react';
import { Pencil, MoreVertical, X, AlertTriangle, Check, LayoutGrid, Columns3, Calendar, UserPlus, Trash2 } from 'lucide-react';
import { Workstream, useUpdateWorkstream, useAddWorkstreamMember, useRemoveWorkstreamMember } from '../../hooks/usePlannerWorkstreams';
import { usePlannerUsers } from '../../hooks/usePlannerUsers';
import { useNavigate } from 'react-router-dom';

interface WorkstreamDrawerProps {
  workstream: Workstream | null;
  isOpen: boolean;
  onClose: () => void;
}

export function WorkstreamDrawer({ workstream, isOpen, onClose }: WorkstreamDrawerProps) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  const { data: users = [] } = usePlannerUsers();
  const updateWorkstream = useUpdateWorkstream();
  const addMember = useAddWorkstreamMember();
  const removeMember = useRemoveWorkstreamMember();

  if (!workstream) return null;

  const healthInfo = {
    'healthy': { icon: Check, label: 'On Track', color: 'var(--ws-success)' },
    'at-risk': { icon: AlertTriangle, label: 'At Risk', color: 'var(--ws-warning)' },
    'critical': { icon: AlertTriangle, label: 'Critical', color: 'var(--ws-danger)' },
    'locked': { icon: null, label: 'Locked', color: 'var(--ws-text-muted)' },
  };

  const health = healthInfo[workstream.health || 'healthy'];
  const HealthIcon = health.icon;

  const handleSave = () => {
    updateWorkstream.mutate({
      id: workstream.id,
      updates: {
        name: editName || workstream.name,
        description: editDescription || workstream.description,
      },
    });
    setIsEditing(false);
  };

  const navigateToTasks = () => {
    navigate(`/planner/task-list?workstream=${workstream.slug || workstream.id}`);
    onClose();
  };

  const navigateToBoard = () => {
    navigate(`/planner/boards?workstream=${workstream.slug || workstream.id}`);
    onClose();
  };

  const navigateToCalendar = () => {
    navigate(`/planner/calendar?workstream=${workstream.slug || workstream.id}`);
    onClose();
  };

  return (
    <>
      <div 
        className={`ws-drawer-overlay ${isOpen ? 'open' : ''}`} 
        onClick={onClose} 
      />
      <aside className={`ws-drawer ${isOpen ? 'open' : ''}`} role="dialog" aria-modal="true">
        {/* Header */}
        <div className="ws-drawer-header">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-3">
                <div className="ws-color-dot" style={{ background: workstream.color }} />
                <h2 className="ws-drawer-title">{workstream.name}</h2>
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--ws-text-tertiary)' }}>
                <span style={{ fontFamily: 'ui-monospace, monospace' }}>{workstream.code}</span>
                {' · Created '}
                {new Date(workstream.created_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </div>
            </div>
            <div className="flex gap-1">
              <button 
                className="ws-btn ws-btn-ghost ws-btn-icon ws-btn-sm"
                onClick={() => {
                  setEditName(workstream.name);
                  setEditDescription(workstream.description || '');
                  setIsEditing(true);
                }}
              >
                <Pencil className="w-4 h-4" strokeWidth={2} />
              </button>
              <button className="ws-btn ws-btn-ghost ws-btn-icon ws-btn-sm">
                <MoreVertical className="w-4 h-4" strokeWidth={2} />
              </button>
              <button className="ws-btn ws-btn-ghost ws-btn-icon ws-btn-sm" onClick={onClose}>
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Health Status */}
          <div 
            className="p-3 rounded-lg mb-3"
            style={{ background: 'var(--ws-bg-secondary)' }}
          >
            <div 
              className="flex items-center gap-2 font-semibold mb-1"
              style={{ color: health.color }}
            >
              {HealthIcon && <HealthIcon className="w-4 h-4" strokeWidth={2} />}
              {health.label}
              {workstream.trend && (
                <span className={`ws-trend-indicator ws-trend-${workstream.trend}`}>
                  {workstream.trend === 'up' && '↑'}
                  {workstream.trend === 'down' && '↓'}
                  {workstream.trend === 'stable' && '→'}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--ws-text-secondary)' }}>
              {workstream.overdueCount || 0} overdue · {workstream.taskCount || 0} tasks
            </div>
          </div>

          {/* Save Status */}
          <div 
            className="flex items-center gap-1"
            style={{ fontSize: '0.6875rem', color: 'var(--ws-success)' }}
          >
            <Check className="w-3 h-3" strokeWidth={2} />
            All changes saved
          </div>
        </div>

        {/* Body */}
        <div className="ws-drawer-body">
          {/* Description Section */}
          <div className="ws-drawer-section">
            <div className="ws-drawer-section-title">Description</div>
            {isEditing ? (
              <div>
                <textarea
                  className="ws-form-input"
                  style={{ height: '80px', resize: 'none' }}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Add a description..."
                />
                <div className="flex gap-2 mt-2">
                  <button className="ws-btn ws-btn-primary ws-btn-sm" onClick={handleSave}>
                    Save
                  </button>
                  <button className="ws-btn ws-btn-secondary ws-btn-sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 'var(--ws-text-base)', color: 'var(--ws-text-secondary)' }}>
                {workstream.description || 'No description provided'}
              </p>
            )}
          </div>

          {/* Team Section */}
          <div className="ws-drawer-section">
            <div className="flex justify-between mb-3">
              <div className="ws-drawer-section-title">Team</div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--ws-text-muted)' }}>
                {workstream.memberCount || 0} members
              </span>
            </div>

            {/* Lead Card */}
            {workstream.lead && (
              <div 
                className="p-3 rounded-lg mb-3"
                style={{ 
                  background: 'var(--ws-bg-secondary)', 
                  border: '1px solid var(--ws-border-primary)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="ws-avatar" style={{ background: workstream.color }}>
                      {workstream.lead.initials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--ws-text-primary)' }}>
                        {workstream.lead.name}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--ws-text-tertiary)' }}>
                        Team Lead
                      </div>
                    </div>
                  </div>
                  <span 
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{ background: 'var(--ws-primary-light)', color: 'var(--ws-primary)' }}
                  >
                    Lead
                  </span>
                </div>
              </div>
            )}

            {/* Members List */}
            {workstream.members && workstream.members.length > 0 && (
              <div className="space-y-2">
                {workstream.members
                  .filter(m => m.role !== 'lead')
                  .map((member) => (
                    <div 
                      key={member.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--ws-bg-secondary)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="ws-avatar ws-avatar-sm" style={{ background: workstream.color }}>
                          {member.profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                        </div>
                        <span style={{ fontSize: 'var(--ws-text-base)', color: 'var(--ws-text-primary)' }}>
                          {member.profile?.full_name || 'Unknown'}
                        </span>
                      </div>
                      <button 
                        className="ws-btn ws-btn-ghost ws-btn-icon ws-btn-sm"
                        onClick={() => removeMember.mutate({ 
                          workstreamId: workstream.id, 
                          userId: member.user_id 
                        })}
                      >
                        <X className="w-3 h-3" strokeWidth={2} />
                      </button>
                    </div>
                  ))}
              </div>
            )}

            <button className="ws-btn ws-btn-secondary ws-btn-sm mt-3 w-full">
              <UserPlus className="w-4 h-4" strokeWidth={2} />
              Add Member
            </button>
          </div>

          {/* Work Summary */}
          <div className="ws-drawer-section">
            <div className="ws-drawer-section-title">Work Summary</div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div 
                className="p-3 rounded-lg text-center"
                style={{ background: 'var(--ws-bg-secondary)' }}
              >
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ws-text-primary)' }}>
                  {workstream.taskCount || 0}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--ws-text-tertiary)' }}>
                  Total Tasks
                </div>
              </div>
              <div 
                className="p-3 rounded-lg text-center"
                style={{ background: 'var(--ws-bg-secondary)' }}
              >
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ws-danger)' }}>
                  {workstream.overdueCount || 0}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--ws-text-tertiary)' }}>
                  Overdue
                </div>
              </div>
              <div 
                className="p-3 rounded-lg text-center"
                style={{ background: 'var(--ws-bg-secondary)' }}
              >
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ws-text-primary)' }}>
                  {workstream.memberCount || 0}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--ws-text-tertiary)' }}>
                  Members
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="ws-progress-bar">
              <div 
                className="ws-progress-fill" 
                style={{ 
                  width: '0%', 
                  background: 'var(--ws-primary)' 
                }} 
              />
            </div>
            <div 
              className="text-right mt-1"
              style={{ fontSize: '0.6875rem', color: 'var(--ws-text-tertiary)' }}
            >
              0% complete
            </div>
          </div>

          {/* Activity Feed */}
          <div className="ws-drawer-section">
            <div className="ws-drawer-section-title">Activity</div>
            <div className="ws-activity-feed">
              <div className="ws-activity-item">
                <div className="ws-activity-avatar" style={{ background: workstream.color }}>
                  {workstream.lead?.initials || 'SY'}
                </div>
                <div className="ws-activity-content">
                  <div className="ws-activity-text">
                    <strong>{workstream.lead?.name || 'System'}</strong> created this workstream
                  </div>
                  <div className="ws-activity-time">
                    {new Date(workstream.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="ws-drawer-footer">
          <div className="ws-drawer-footer-buttons">
            <button className="ws-btn ws-btn-primary" onClick={navigateToTasks}>
              <LayoutGrid className="w-4 h-4" strokeWidth={2} />
              Task List
            </button>
            <button className="ws-btn ws-btn-secondary" onClick={navigateToBoard}>
              <Columns3 className="w-4 h-4" strokeWidth={2} />
              Board
            </button>
            <button className="ws-btn ws-btn-secondary" onClick={navigateToCalendar}>
              <Calendar className="w-4 h-4" strokeWidth={2} />
              Calendar
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
