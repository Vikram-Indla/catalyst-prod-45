// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ PANEL DETAILS TAB COMPONENT
// Matches reference design with proper field layout
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { Clock, User, Calendar, Tag, FileText, ChevronDown, Check, X, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { T10ItemWithAssignee } from '../../types';
import { useProfiles, type ProfileOption } from '../../hooks';

// Predefined labels
const AVAILABLE_LABELS = [
  'HR', 'Documentation', 'Security', 'Code Review', 'Testing',
  'Bug Fix', 'DevOps', 'Presentation', 'Performance',
  'UI/UX', 'Backend', 'Frontend', 'Infrastructure',
];

interface T10PanelDetailsTabProps {
  item: T10ItemWithAssignee;
  onUpdate?: (itemId: string, updates: Partial<T10ItemWithAssignee>) => void;
}

export function T10PanelDetailsTab({ item, onUpdate }: T10PanelDetailsTabProps) {
  const [description, setDescription] = useState(item.description || '');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  
  const assigneeRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  
  // Fetch profiles for assignee dropdown
  const { data: profiles = [], isLoading: profilesLoading } = useProfiles();

  // Filter profiles by search
  const filteredProfiles = profiles.filter((p: ProfileOption) => 
    (p.full_name?.toLowerCase() || '').includes(assigneeSearch.toLowerCase()) ||
    (p.email?.toLowerCase() || '').includes(assigneeSearch.toLowerCase())
  );

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
        setAssigneeSearch('');
      }
      if (labelRef.current && !labelRef.current.contains(e.target as Node)) {
        setShowLabelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDescriptionSave = () => {
    if (description !== item.description) {
      onUpdate?.(item.id, { description });
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
    setAssigneeSearch('');
  };

  const handleDueDateChange = (date: string | null) => {
    onUpdate?.(item.id, { due_date: date || undefined });
  };

  const handleLabelChange = (label: string | null) => {
    onUpdate?.(item.id, { label: label || undefined });
    setShowLabelDropdown(false);
  };

  // Get initials from name
  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get avatar background color based on name
  const getAvatarColor = (name: string | null) => {
    if (!name) return '#9ca3af';
    const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="t10-details">
      {/* STATUS */}
      <div className="t10-details__field">
        <label className="t10-details__label">
          <Clock size={16} />
          STATUS
        </label>
        <button
          onClick={handleStatusToggle}
          className="t10-details__status-row"
        >
          <span 
            className={`t10-details__checkbox ${item.status === 'done' ? 't10-details__checkbox--checked' : ''}`}
          >
            {item.status === 'done' && <Check size={14} />}
          </span>
          <span className="t10-details__status-text">
            {item.status === 'done' ? 'Completed' : 'Mark as completed'}
          </span>
        </button>
      </div>

      {/* ASSIGNED TO */}
      <div className="t10-details__field">
        <label className="t10-details__label">
          <User size={16} />
          ASSIGNED TO
        </label>
        <div className="t10-details__assignee" ref={assigneeRef}>
          <button
            onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
            className="t10-details__assignee-trigger"
            disabled={profilesLoading}
          >
            {item.assignee ? (
              <>
                <span 
                  className="t10-details__avatar"
                  style={{ backgroundColor: getAvatarColor(item.assignee.full_name) }}
                >
                  {getInitials(item.assignee.full_name)}
                </span>
                <span className="t10-details__assignee-name">{item.assignee.full_name}</span>
              </>
            ) : (
              <>
                <span className="t10-details__avatar t10-details__avatar--empty">
                  <User size={14} />
                </span>
                <span className="t10-details__assignee-name t10-details__assignee-name--empty">
                  Unassigned
                </span>
              </>
            )}
          </button>
          
          {showAssigneeDropdown && (
            <div className="t10-details__dropdown">
              <div className="t10-details__dropdown-search">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={assigneeSearch}
                  onChange={(e) => setAssigneeSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="t10-details__dropdown-options">
                <button
                  onClick={() => handleAssigneeChange(null)}
                  className={`t10-details__dropdown-option ${!item.assignee_id ? 't10-details__dropdown-option--active' : ''}`}
                >
                  <span className="t10-details__avatar t10-details__avatar--empty">
                    <X size={12} />
                  </span>
                  <span>Unassign</span>
                </button>
                
                {filteredProfiles.map((profile: ProfileOption) => (
                  <button
                    key={profile.id}
                    onClick={() => handleAssigneeChange(profile.id)}
                    className={`t10-details__dropdown-option ${item.assignee_id === profile.id ? 't10-details__dropdown-option--active' : ''}`}
                  >
                    <span 
                      className="t10-details__avatar"
                      style={{ backgroundColor: getAvatarColor(profile.full_name) }}
                    >
                      {getInitials(profile.full_name)}
                    </span>
                    <div className="t10-details__dropdown-option-info">
                      <span className="t10-details__dropdown-option-name">
                        {profile.full_name || 'Unknown'}
                      </span>
                    </div>
                    {item.assignee_id === profile.id && (
                      <Check size={14} className="t10-details__dropdown-check" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DUE DATE */}
      <div className="t10-details__field">
        <label className="t10-details__label">
          <Calendar size={16} />
          DUE DATE
        </label>
        <div className="t10-details__date-display">
          <input
            type="date"
            value={item.due_date || ''}
            onChange={(e) => handleDueDateChange(e.target.value || null)}
            className="t10-details__date-input"
          />
          {item.due_date && (
            <span className="t10-details__date-formatted">
              {format(parseISO(item.due_date), 'MMM d, yyyy')}
            </span>
          )}
        </div>
      </div>

      {/* LABELS */}
      <div className="t10-details__field">
        <label className="t10-details__label">
          <Tag size={16} />
          LABELS
        </label>
        <div className="t10-details__labels" ref={labelRef}>
          {item.label && (
            <span className="t10-details__label-tag">
              {item.label}
              <button 
                onClick={() => handleLabelChange(null)}
                className="t10-details__label-remove"
              >
                <X size={12} />
              </button>
            </span>
          )}
          <button
            onClick={() => setShowLabelDropdown(!showLabelDropdown)}
            className="t10-details__add-label"
          >
            <Plus size={14} />
            Add
          </button>
          
          {showLabelDropdown && (
            <div className="t10-details__dropdown t10-details__dropdown--labels">
              <div className="t10-details__dropdown-options">
                {AVAILABLE_LABELS.map((label) => (
                  <button
                    key={label}
                    onClick={() => handleLabelChange(label)}
                    className={`t10-details__dropdown-option ${item.label === label ? 't10-details__dropdown-option--active' : ''}`}
                  >
                    <span className="t10-details__label-tag t10-details__label-tag--option">
                      {label}
                    </span>
                    {item.label === label && <Check size={14} className="t10-details__dropdown-check" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DESCRIPTION */}
      <div className="t10-details__field">
        <label className="t10-details__label">
          <FileText size={16} />
          DESCRIPTION
        </label>
        {isEditingDescription ? (
          <div className="t10-details__description-edit">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={4}
              autoFocus
            />
            <div className="t10-details__description-actions">
              <button 
                onClick={() => {
                  setDescription(item.description || '');
                  setIsEditingDescription(false);
                }}
                className="t10-details__btn t10-details__btn--ghost"
              >
                Cancel
              </button>
              <button 
                onClick={handleDescriptionSave}
                className="t10-details__btn t10-details__btn--primary"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div 
            className={`t10-details__description ${!item.description ? 't10-details__description--empty' : ''}`}
            onClick={() => setIsEditingDescription(true)}
          >
            {item.description || 'Click to add a description...'}
          </div>
        )}
      </div>
    </div>
  );
}

export default T10PanelDetailsTab;
