import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Check, User, Calendar, Tag, FileText, Plus, CheckCircle, Edit, 
  ArrowRight, UserPlus, Trash2, Save, RotateCcw, AlertCircle 
} from 'lucide-react';
import type { T10Item, T10Activity } from '../../types';
import { getRelativeTime, getRankTier, formatShortDate } from '../../utils';
import { T10AssigneePicker } from './T10AssigneePicker';
import type { T10Profile } from '../../hooks/useProfiles';

interface T10SidePanelProps {
  item: T10Item | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<T10Item>) => void;
  onDelete: () => void;
  isReadOnly?: boolean;
}

const LABEL_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'BLOCKED', 'NEEDS-REVIEW'];

const mockActivity: T10Activity[] = [
  { id: '1', item_id: '1', type: 'created', description: 'Created this priority', actor_name: 'Vikram I.', created_at: '2026-02-01T10:00:00Z' },
  { id: '2', item_id: '1', type: 'ranked', description: 'Moved to rank #1', actor_name: 'Ibrahim A.', created_at: '2026-02-01T14:30:00Z' },
  { id: '3', item_id: '1', type: 'assigned', description: 'Assigned to Vikram I.', actor_name: 'Maali A.', created_at: '2026-02-02T09:00:00Z' },
];

export function T10SidePanel({ item, isOpen, onClose, onUpdate, onDelete, isReadOnly = false }: T10SidePanelProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionTimeoutRef = useRef<NodeJS.Timeout>();
  const labelPickerRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const assigneeFieldRef = useRef<HTMLDivElement>(null);

  // Sync local state with item
  useEffect(() => {
    if (item) {
      setEditTitle(item.title);
      setEditDescription(item.description || '');
      setEditDate(item.due_date || '');
      setHasChanges(false);
    }
  }, [item?.id]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditingTitle) {
          setIsEditingTitle(false);
          setEditTitle(item?.title || '');
        } else if (showLabelPicker) {
          setShowLabelPicker(false);
        } else if (showDatePicker) {
          setShowDatePicker(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose, isEditingTitle, showLabelPicker, showDatePicker, item?.title]);

  // Close pickers on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (labelPickerRef.current && !labelPickerRef.current.contains(e.target as Node)) {
        setShowLabelPicker(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus title input when editing
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Debounced description save
  const handleDescriptionChange = useCallback((value: string) => {
    setEditDescription(value);
    setHasChanges(true);
    
    if (descriptionTimeoutRef.current) {
      clearTimeout(descriptionTimeoutRef.current);
    }
    
    descriptionTimeoutRef.current = setTimeout(() => {
      onUpdate({ description: value });
      setHasChanges(false);
    }, 800);
  }, [onUpdate]);

  // Save title
  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== item?.title) {
      onUpdate({ title: editTitle.trim() });
    } else {
      setEditTitle(item?.title || '');
    }
    setIsEditingTitle(false);
  };

  // Handle title key press
  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setEditTitle(item?.title || '');
      setIsEditingTitle(false);
    }
  };

  // Handle label selection
  const handleLabelSelect = (label: string) => {
    onUpdate({ label: label === item?.label ? undefined : label });
    setShowLabelPicker(false);
  };

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setEditDate(newDate);
    onUpdate({ due_date: newDate || undefined });
    setShowDatePicker(false);
  };

  // Clear date
  const handleClearDate = () => {
    setEditDate('');
    onUpdate({ due_date: undefined });
    setShowDatePicker(false);
  };

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

  const getLabelColor = (label: string) => {
    switch (label) {
      case 'CRITICAL': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      case 'HIGH': return { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' };
      case 'MEDIUM': return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
      case 'LOW': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
      case 'BLOCKED': return { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
      case 'NEEDS-REVIEW': return { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' };
      default: return { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' };
    }
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
            <span className="t10-panel-title-text">Priority #{item.rank}</span>
            {item.carryover_count > 0 && (
              <span className="t10-carryover-badge" style={{ marginLeft: '8px' }}>
                ×{item.carryover_count}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {hasChanges && (
              <span style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Save size={14} /> Saving...
              </span>
            )}
            <button className="t10-panel-close" onClick={onClose}>
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Subheader - Editable Title */}
        <div className="t10-panel-subheader">
          {item.taskhub_key && (
            <span className="t10-panel-key">{item.taskhub_key}</span>
          )}
          {isEditingTitle ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                ref={titleInputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                onBlur={handleSaveTitle}
                className="t10-panel-title-input"
                placeholder="Enter title..."
              />
            </div>
          ) : (
            <h2 
              className="t10-panel-item-title" 
              onClick={() => !isReadOnly && setIsEditingTitle(true)}
              style={{ cursor: isReadOnly ? 'default' : 'pointer' }}
            >
              {item.title}
              {!isReadOnly && <Edit size={14} style={{ marginLeft: '8px', color: '#9ca3af', verticalAlign: 'middle' }} />}
            </h2>
          )}
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
                  className={`t10-status-checkbox ${isReadOnly ? 'disabled' : ''}`}
                  onClick={() => !isReadOnly && onUpdate({ status: isCompleted ? 'todo' : 'done' })}
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
              <div className="t10-field" ref={assigneeFieldRef}>
                <div className="t10-field-label">
                  <User size={14} />
                  Assigned To
                </div>
                <div 
                  className="t10-field-value t10-field-clickable"
                  onClick={() => !isReadOnly && setShowAssigneePicker(!showAssigneePicker)}
                >
                  {item.assignee_name ? (
                    <>
                      <span className="t10-avatar t10-avatar-sm">{item.assignee_initials}</span>
                      {item.assignee_name}
                    </>
                  ) : (
                    <span style={{ color: '#9ca3af' }}>
                      <Plus size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                      Add assignee
                    </span>
                  )}
                </div>
                
                <T10AssigneePicker
                  currentAssigneeId={item.assignee_id}
                  currentAssigneeName={item.assignee_name}
                  currentAssigneeInitials={item.assignee_initials}
                  onSelect={(profile) => {
                    if (profile) {
                      onUpdate({ assignee_id: profile.id });
                    } else {
                      onUpdate({ assignee_id: undefined });
                    }
                  }}
                  anchorRef={assigneeFieldRef}
                  isOpen={showAssigneePicker && !isReadOnly}
                  onClose={() => setShowAssigneePicker(false)}
                />
              </div>

              {/* Due Date */}
              <div className="t10-field" ref={datePickerRef}>
                <div className="t10-field-label">
                  <Calendar size={14} />
                  Due Date
                </div>
                <div 
                  className="t10-field-value t10-field-clickable"
                  onClick={() => !isReadOnly && setShowDatePicker(!showDatePicker)}
                >
                  {item.due_date ? (
                    <span className="t10-date-display">
                      {formatShortDate(item.due_date)}
                    </span>
                  ) : (
                    <span style={{ color: '#9ca3af' }}>
                      <Plus size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                      Add due date
                    </span>
                  )}
                </div>
                
                {showDatePicker && !isReadOnly && (
                  <div className="t10-date-picker-dropdown">
                    <input
                      type="date"
                      value={editDate}
                      onChange={handleDateChange}
                      className="t10-date-input"
                    />
                    {item.due_date && (
                      <button className="t10-clear-date-btn" onClick={handleClearDate}>
                        <X size={14} /> Clear
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Labels */}
              <div className="t10-field" ref={labelPickerRef}>
                <div className="t10-field-label">
                  <Tag size={14} />
                  Priority Label
                </div>
                <div 
                  className="t10-field-value t10-field-clickable"
                  onClick={() => !isReadOnly && setShowLabelPicker(!showLabelPicker)}
                >
                  {item.label ? (
                    <span 
                      className="t10-label-chip"
                      style={{
                        background: getLabelColor(item.label).bg,
                        color: getLabelColor(item.label).color,
                        border: `1px solid ${getLabelColor(item.label).border}`,
                      }}
                    >
                      {item.label}
                    </span>
                  ) : (
                    <span style={{ color: '#9ca3af' }}>
                      <Plus size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                      Add label
                    </span>
                  )}
                </div>
                
                {showLabelPicker && !isReadOnly && (
                  <div className="t10-label-picker-dropdown">
                    {LABEL_OPTIONS.map((label) => {
                      const colors = getLabelColor(label);
                      return (
                        <button
                          key={label}
                          className={`t10-label-option ${item.label === label ? 'selected' : ''}`}
                          onClick={() => handleLabelSelect(label)}
                          style={{
                            background: colors.bg,
                            color: colors.color,
                            border: `1px solid ${colors.border}`,
                          }}
                        >
                          {label}
                          {item.label === label && <Check size={14} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="t10-field">
                <div className="t10-field-label">
                  <FileText size={14} />
                  Description
                </div>
                <textarea
                  className="t10-textarea"
                  placeholder={isReadOnly ? 'No description' : 'Add a description...'}
                  value={editDescription}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  disabled={isReadOnly}
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
                    {activity.type === 'carried' && <RotateCcw size={16} />}
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
            Created {getRelativeTime(item.created_at)}
          </span>
          {!isReadOnly && (
            <button className="t10-delete-btn" onClick={onDelete}>
              <Trash2 size={16} />
              Delete
            </button>
          )}
        </div>
      </div>
    </>
  );

  // Use Portal to render at document.body level
  return createPortal(panelContent, document.body);
}
