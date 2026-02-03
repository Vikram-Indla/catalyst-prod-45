// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ PANEL DETAILS TAB COMPONENT
// Fully editable fields that persist to database
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { Calendar, User, Tag, FileText, ChevronDown, Check, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { T10ItemWithAssignee } from '../../types';
import { T10RankBadge } from '../week-view/T10RankBadge';
import { useProfiles, type ProfileOption } from '../../hooks';

// Predefined labels
const AVAILABLE_LABELS = [
  'Documentation',
  'Security',
  'Code Review',
  'Testing',
  'Bug Fix',
  'DevOps',
  'Presentation',
  'Performance',
  'UI/UX',
  'Backend',
  'Frontend',
  'Infrastructure',
];

interface T10PanelDetailsTabProps {
  item: T10ItemWithAssignee;
  onUpdate?: (itemId: string, updates: Partial<T10ItemWithAssignee>) => void;
}

export function T10PanelDetailsTab({ item, onUpdate }: T10PanelDetailsTabProps) {
  const [description, setDescription] = useState(item.description || '');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  
  const assigneeRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  
  // Fetch profiles for assignee dropdown
  const { data: profiles = [], isLoading: profilesLoading } = useProfiles();

  // Sync description when item changes
  useEffect(() => {
    setDescription(item.description || '');
    setIsEditingDescription(false);
  }, [item.id, item.description]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) {
        setShowAssigneeDropdown(false);
      }
      if (labelRef.current && !labelRef.current.contains(e.target as Node)) {
        setShowLabelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDescriptionSave = async () => {
    if (description !== item.description) {
      setIsSavingDescription(true);
      onUpdate?.(item.id, { description });
      // Simulate save delay for feedback
      setTimeout(() => setIsSavingDescription(false), 500);
    }
    setIsEditingDescription(false);
  };

  const handleStatusToggle = () => {
    const newStatus = item.status === 'done' ? 'todo' : 'done';
    onUpdate?.(item.id, { status: newStatus as 'todo' | 'done' });
  };

  const handleAssigneeChange = (profileId: string | null) => {
    onUpdate?.(item.id, { assignee_id: profileId || undefined });
    setShowAssigneeDropdown(false);
  };

  const handleDueDateChange = (date: string | null) => {
    onUpdate?.(item.id, { due_date: date || undefined });
  };

  const handleLabelChange = (label: string | null) => {
    onUpdate?.(item.id, { label: label || undefined });
    setShowLabelDropdown(false);
  };

  return (
    <div className="t10-panel-details">
      {/* Rank & Status */}
      <div className="t10-panel-details__section">
        <div className="t10-panel-details__row">
          <div className="t10-panel-details__field">
            <span className="t10-panel-details__label">Priority Rank</span>
            <div className="t10-panel-details__rank">
              <T10RankBadge rank={item.rank} />
              <span className="t10-panel-details__rank-text">
                {item.rank <= 5 ? 'Top 5' : item.rank <= 10 ? 'Top 10' : 'Buffer'}
              </span>
            </div>
          </div>
          
          <div className="t10-panel-details__field">
            <span className="t10-panel-details__label">Status</span>
            <button
              onClick={handleStatusToggle}
              className={`t10-status-toggle ${
                item.status === 'done' 
                  ? 't10-status-toggle--done' 
                  : 't10-status-toggle--todo'
              }`}
            >
              {item.status === 'done' && <Check size={14} />}
              <span>
                {item.status === 'todo' ? 'To Do' : 
                 item.status === 'done' ? 'Done' : 
                 item.status === 'resolved' ? 'Resolved' : 'Removed'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Assignee - Editable Dropdown */}
      <div className="t10-panel-details__section">
        <div className="t10-panel-details__field">
          <span className="t10-panel-details__label">
            <User className="t10-panel-details__label-icon" />
            Assignee
          </span>
          <div className="t10-dropdown-container" ref={assigneeRef}>
            <button
              onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
              className="t10-dropdown-trigger"
              disabled={profilesLoading}
            >
              {item.assignee ? (
                <div className="t10-panel-details__assignee">
                  {item.assignee.avatar_url ? (
                    <img 
                      src={item.assignee.avatar_url} 
                      alt={item.assignee.full_name || ''} 
                      className="t10-panel-details__avatar"
                    />
                  ) : (
                    <span className="t10-panel-details__avatar-placeholder">
                      {(item.assignee.full_name || 'U').charAt(0)}
                    </span>
                  )}
                  <span>{item.assignee.full_name}</span>
                </div>
              ) : (
                <span className="t10-panel-details__empty">Unassigned</span>
              )}
              <ChevronDown size={16} className={`t10-dropdown-chevron ${showAssigneeDropdown ? 't10-dropdown-chevron--open' : ''}`} />
            </button>
            
            {showAssigneeDropdown && (
              <div className="t10-dropdown-menu">
                <button
                  onClick={() => handleAssigneeChange(null)}
                  className="t10-dropdown-item t10-dropdown-item--muted"
                >
                  <X size={14} />
                  <span>Unassign</span>
                </button>
                <div className="t10-dropdown-divider" />
                {profiles.map((profile: ProfileOption) => (
                  <button
                    key={profile.id}
                    onClick={() => handleAssigneeChange(profile.id)}
                    className={`t10-dropdown-item ${item.assignee_id === profile.id ? 't10-dropdown-item--active' : ''}`}
                  >
                    <span className="t10-panel-details__avatar-placeholder t10-panel-details__avatar-placeholder--sm">
                      {(profile.full_name || profile.email || 'U').charAt(0)}
                    </span>
                    <div className="t10-dropdown-item-content">
                      <span className="t10-dropdown-item-name">{profile.full_name || 'Unknown'}</span>
                      <span className="t10-dropdown-item-email">{profile.email}</span>
                    </div>
                    {item.assignee_id === profile.id && <Check size={14} className="t10-dropdown-check" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Due Date - Editable Date Picker */}
      <div className="t10-panel-details__section">
        <div className="t10-panel-details__field">
          <span className="t10-panel-details__label">
            <Calendar className="t10-panel-details__label-icon" />
            Due Date
          </span>
          <div className="t10-date-picker">
            <input
              type="date"
              value={item.due_date || ''}
              onChange={(e) => handleDueDateChange(e.target.value || null)}
              className="t10-date-input"
            />
            {item.due_date && (
              <button
                onClick={() => handleDueDateChange(null)}
                className="t10-date-clear"
                title="Clear date"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Label - Editable Dropdown */}
      <div className="t10-panel-details__section">
        <div className="t10-panel-details__field">
          <span className="t10-panel-details__label">
            <Tag className="t10-panel-details__label-icon" />
            Label
          </span>
          <div className="t10-dropdown-container" ref={labelRef}>
            <button
              onClick={() => setShowLabelDropdown(!showLabelDropdown)}
              className="t10-dropdown-trigger"
            >
              {item.label ? (
                <span className="t10-panel-details__tag">{item.label}</span>
              ) : (
                <span className="t10-panel-details__empty">No label</span>
              )}
              <ChevronDown size={16} className={`t10-dropdown-chevron ${showLabelDropdown ? 't10-dropdown-chevron--open' : ''}`} />
            </button>
            
            {showLabelDropdown && (
              <div className="t10-dropdown-menu t10-dropdown-menu--labels">
                <button
                  onClick={() => handleLabelChange(null)}
                  className="t10-dropdown-item t10-dropdown-item--muted"
                >
                  <X size={14} />
                  <span>Remove label</span>
                </button>
                <div className="t10-dropdown-divider" />
                {AVAILABLE_LABELS.map((label) => (
                  <button
                    key={label}
                    onClick={() => handleLabelChange(label)}
                    className={`t10-dropdown-item ${item.label === label ? 't10-dropdown-item--active' : ''}`}
                  >
                    <span className="t10-label-chip">{label}</span>
                    {item.label === label && <Check size={14} className="t10-dropdown-check" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description - Editable Text Area */}
      <div className="t10-panel-details__section t10-panel-details__section--description">
        <div className="t10-panel-details__field">
          <span className="t10-panel-details__label">
            <FileText className="t10-panel-details__label-icon" />
            Description
            {isSavingDescription && (
              <span className="t10-saving-indicator">Saving...</span>
            )}
          </span>
          {isEditingDescription ? (
            <div className="t10-panel-details__description-edit">
              <textarea
                className="t10-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={4}
                autoFocus
              />
              <div className="t10-panel-details__description-actions">
                <button 
                  className="t10-btn t10-btn--sm t10-btn--ghost"
                  onClick={() => {
                    setDescription(item.description || '');
                    setIsEditingDescription(false);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="t10-btn t10-btn--sm t10-btn--primary"
                  onClick={handleDescriptionSave}
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div 
              className="t10-panel-details__description"
              onClick={() => setIsEditingDescription(true)}
            >
              {item.description || 'Click to add a description...'}
            </div>
          )}
        </div>
      </div>

      {/* Carryover Info */}
      {item.carryover_count > 0 && (
        <div className="t10-panel-details__section">
          <div className="t10-panel-details__carryover-notice">
            <span>⚠️ This item has been carried over {item.carryover_count} time{item.carryover_count > 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="t10-panel-details__section t10-panel-details__section--meta">
        <div className="t10-panel-details__meta">
          <span>Created {format(parseISO(item.created_at), 'MMM d, yyyy')}</span>
          <span>Updated {format(parseISO(item.updated_at), 'MMM d, yyyy')}</span>
        </div>
      </div>
    </div>
  );
}

export default T10PanelDetailsTab;
