import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, User, Calendar, Tag, FileText, Plus, CheckCircle, Edit, ArrowRight, UserPlus, Trash2 } from 'lucide-react';
import type { T10Item, T10Activity } from '../../types';
import { getRelativeTime, getRankTier } from '../../utils';

interface T10SidePanelProps {
  item: T10Item | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<T10Item>) => void;
  onDelete: () => void;
}

const mockActivity: T10Activity[] = [
  { id: '1', item_id: '1', type: 'created', description: 'Created this priority', actor_name: 'Vikram I.', created_at: '2026-02-01T10:00:00Z' },
  { id: '2', item_id: '1', type: 'ranked', description: 'Moved to rank #1', actor_name: 'Ibrahim A.', created_at: '2026-02-01T14:30:00Z' },
  { id: '3', item_id: '1', type: 'assigned', description: 'Assigned to Vikram I.', actor_name: 'Maali A.', created_at: '2026-02-02T09:00:00Z' },
];

export function T10SidePanel({ item, isOpen, onClose, onUpdate, onDelete }: T10SidePanelProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const rankTier = getRankTier(item.rank);
  const isCompleted = item.status === 'done';

  const getRankStyles = () => {
    if (rankTier === 'top') {
      return { background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', color: 'white' };
    } else if (rankTier === 'mid') {
      return { background: '#6b7280', color: 'white' };
    }
    return { background: 'transparent', border: '2px dashed #d1d5db', color: '#9ca3af' };
  };

  const panelContent = (
    <>
      {/* Overlay */}
      <div className={`t10-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />

      {/* Panel */}
      <div className={`t10-panel ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="t10-panel-header">
          <div className="t10-panel-title-group">
            <div className="t10-panel-rank" style={getRankStyles()}>
              {item.rank}
            </div>
            <span className="t10-panel-title-text">Task¹⁰ Priority</span>
          </div>
          <button className="t10-panel-close" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        {/* Subheader */}
        <div className="t10-panel-subheader">
          {item.taskhub_key && (
            <span className="t10-panel-key">{item.taskhub_key}</span>
          )}
          <h2 className="t10-panel-item-title">{item.title}</h2>
        </div>

        {/* Tabs */}
        <div className="t10-panel-tabs">
          <button
            className={`t10-panel-tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button
            className={`t10-panel-tab ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
        </div>

        {/* Content */}
        <div className="t10-panel-content">
          {activeTab === 'details' ? (
            <>
              {/* Status */}
              <div className="t10-field">
                <div className="t10-field-label">
                  <CheckCircle size={14} />
                  Status
                </div>
                <div
                  className="t10-status-checkbox"
                  onClick={() => onUpdate({ status: isCompleted ? 'todo' : 'done' })}
                >
                  <div className={`t10-checkbox ${isCompleted ? 'checked' : ''}`} style={{ width: '26px', height: '26px' }}>
                    <Check size={14} />
                  </div>
                  <span className={`t10-status-text ${isCompleted ? 'completed' : ''}`}>
                    {isCompleted ? 'Completed' : 'Mark as completed'}
                  </span>
                </div>
              </div>

              {/* Assignee */}
              <div className="t10-field">
                <div className="t10-field-label">
                  <User size={14} />
                  Assigned To
                </div>
                <div className="t10-field-value">
                  {item.assignee_name ? (
                    <>
                      <span className="t10-avatar t10-avatar-sm">{item.assignee_initials}</span>
                      {item.assignee_name}
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Add assignee
                    </>
                  )}
                </div>
              </div>

              {/* Due Date */}
              <div className="t10-field">
                <div className="t10-field-label">
                  <Calendar size={14} />
                  Due Date
                </div>
                <div className="t10-field-value">
                  {item.due_date || 'Add due date'}
                </div>
              </div>

              {/* Labels */}
              <div className="t10-field">
                <div className="t10-field-label">
                  <Tag size={14} />
                  Labels
                </div>
                <div className="t10-field-value">
                  {item.label ? (
                    <span className="t10-card-label">{item.label}</span>
                  ) : null}
                  <span style={{ color: '#6b7280' }}>+ Add</span>
                </div>
              </div>

              {/* Description */}
              <div className="t10-field">
                <div className="t10-field-label">
                  <FileText size={14} />
                  Description
                </div>
                <textarea
                  className="t10-textarea"
                  placeholder="Add a description..."
                  value={item.description || ''}
                  onChange={(e) => onUpdate({ description: e.target.value })}
                />
              </div>
            </>
          ) : (
            <div className="t10-activity-list">
              {mockActivity.map((activity) => (
                <div key={activity.id} className="t10-activity-item">
                  <div className={`t10-activity-icon ${activity.type}`}>
                    {activity.type === 'created' && <Plus size={16} />}
                    {activity.type === 'completed' && <Check size={16} />}
                    {activity.type === 'updated' && <Edit size={16} />}
                    {activity.type === 'ranked' && <ArrowRight size={16} />}
                    {activity.type === 'assigned' && <UserPlus size={16} />}
                  </div>
                  <div className="t10-activity-content">
                    <div className="t10-activity-text">
                      <strong>{activity.actor_name}</strong> {activity.description}
                    </div>
                    <div className="t10-activity-meta">
                      {getRelativeTime(activity.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="t10-panel-footer">
          <span className="t10-panel-footer-info">
            Created by Vikram I. · 3 days ago
          </span>
          <button className="t10-delete-btn" onClick={onDelete}>
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>
    </>
  );

  // Use Portal to render at document.body level
  return createPortal(panelContent, document.body);
}
