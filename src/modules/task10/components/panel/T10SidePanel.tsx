import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Check, User, Calendar, Tag, FileText, Plus, Clock, Edit, 
  Trash2, Save
} from 'lucide-react';
import type { T10Item } from '../../types';
import { getRelativeTime, getRankTier, formatShortDate } from '../../utils';
import { T10AssigneePicker } from './T10AssigneePicker';
import { T10ActivityTimeline } from './T10ActivityTimeline';
import { T10LabelPicker } from './T10LabelPicker';

interface T10SidePanelProps {
  item: T10Item | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<T10Item>) => void;
  onDelete: () => void;
  isReadOnly?: boolean;
}

export function T10SidePanel({ item, isOpen, onClose, onUpdate, onDelete, isReadOnly = false }: T10SidePanelProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionTimeoutRef = useRef<NodeJS.Timeout>();
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
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditingTitle) {
          setIsEditingTitle(false);
          setEditTitle(item?.title || '');
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
  }, [isOpen, onClose, isEditingTitle, showDatePicker, item?.title]);

  // Close pickers on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
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
            <span className="t10-panel-title-text">Task<sup>10</sup> Priority</span>
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
                  <Clock size={14} />
                  STATUS
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
              <div className="t10-field">
                <div className="t10-field-label">
                  <Tag size={14} />
                  LABELS
                </div>
                <T10LabelPicker
                  currentLabel={item.label}
                  onSelect={(label) => onUpdate({ label })}
                  isReadOnly={isReadOnly}
                />
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
            <T10ActivityTimeline itemId={item.id} />
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
