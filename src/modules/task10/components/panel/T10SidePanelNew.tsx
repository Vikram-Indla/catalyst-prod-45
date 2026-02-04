// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10SidePanelNew (V2 Design Tokens)
// Purpose: Complete 480px side panel with database-wired fields and auto-save
// Refactored: Using task10-v2.css design tokens
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ExternalLink,
  MoreHorizontal,
  X,
  Copy,
  Clock,
  User,
  Calendar,
  Tag,
  FileText,
  Check,
  Trash2,
} from 'lucide-react';
import {
  useT10Item,
  useT10UpdateItem,
  useT10ToggleItemStatus,
  useT10DeleteItem,
  useT10UpdateItemLabels,
} from '../../hooks';
import { T10AssigneeFieldNew } from './T10AssigneeFieldNew';
import { T10DateFieldNew } from './T10DateFieldNew';
import { T10LabelsFieldNew } from './T10LabelsFieldNew';
import { T10ActivityTimeline } from './T10ActivityTimeline';
import { formatT10RelativeTime } from '../../utils';
import '../../styles/task10-v2.css';

interface T10SidePanelNewProps {
  itemId: string;
  onClose: () => void;
  onUpdated?: () => void;
  onDeleted?: () => void;
}

export function T10SidePanelNew({
  itemId,
  onClose,
  onUpdated,
  onDeleted,
}: T10SidePanelNewProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [descriptionValue, setDescriptionValue] = useState('');
  const [descriptionStatus, setDescriptionStatus] = useState<
    'idle' | 'saving' | 'saved'
  >('idle');
  const [copiedKey, setCopiedKey] = useState(false);

  // Fetch item data
  const { data: item, isLoading, refetch } = useT10Item(itemId);
  const updateItem = useT10UpdateItem();
  const toggleStatus = useT10ToggleItemStatus();
  const deleteItem = useT10DeleteItem();
  const updateLabels = useT10UpdateItemLabels();

  // Sync local state with item data
  useEffect(() => {
    if (item) {
      setTitleValue(item.title);
      setDescriptionValue(item.description || '');
    }
  }, [item]);

  // Handle close with animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
    console.log('[T10] Side panel closed');
  }, [onClose]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  // Handle overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Handle title save
  const handleTitleSave = async () => {
    if (item && titleValue.trim() && titleValue !== item.title) {
      await updateItem.mutateAsync({ id: item.id, title: titleValue.trim() });
      console.log('[T10] Title saved:', titleValue);
      onUpdated?.();
    }
    setIsEditingTitle(false);
  };

  // Handle description auto-save (debounced)
  useEffect(() => {
    if (!item || descriptionValue === (item.description || '')) return;

    setDescriptionStatus('saving');
    const timer = setTimeout(async () => {
      try {
        await updateItem.mutateAsync({
          id: item.id,
          description: descriptionValue || null,
        });
        setDescriptionStatus('saved');
        console.log('[T10] Description auto-saved');
        onUpdated?.();
        setTimeout(() => setDescriptionStatus('idle'), 2000);
      } catch (err) {
        setDescriptionStatus('idle');
        console.error('[T10] Description save failed:', err);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [descriptionValue, item]);

  // Handle status toggle
  const handleStatusToggle = async () => {
    if (item) {
      await toggleStatus.mutateAsync(item);
      console.log('[T10] Status toggled via panel');
      refetch();
      onUpdated?.();
    }
  };

  // Handle assignee change
  const handleAssigneeChange = async (userId: string | null) => {
    if (item) {
      await updateItem.mutateAsync({ id: item.id, assignee_id: userId });
      console.log('[T10] Assignee changed:', userId);
      refetch();
      onUpdated?.();
    }
  };

  // Handle date change
  const handleDateChange = async (date: string | null) => {
    if (item) {
      await updateItem.mutateAsync({ id: item.id, due_date: date });
      console.log('[T10] Due date changed:', date);
      refetch();
      onUpdated?.();
    }
  };

  // Handle labels change
  const handleLabelsChange = async (labelIds: string[]) => {
    if (item) {
      await updateLabels.mutateAsync({ item_id: item.id, label_ids: labelIds });
      console.log('[T10] Labels changed:', labelIds.length);
      refetch();
      onUpdated?.();
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (item && confirm(`Delete "${item.title}"? This action cannot be undone.`)) {
      await deleteItem.mutateAsync(item);
      console.log('[T10] Item deleted via panel');
      onDeleted?.();
      handleClose();
    }
  };

  // Handle copy key
  const handleCopyKey = () => {
    if (item?.taskhub_key) {
      navigator.clipboard.writeText(item.taskhub_key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      console.log('[T10] Key copied:', item.taskhub_key);
    }
  };

  // Handle external link
  const handleExternalLink = () => {
    if (item?.taskhub_key) {
      window.open(`/taskhub/${item.taskhub_key}`, '_blank');
      console.log('[T10] External link clicked:', item.taskhub_key);
    }
  };

  if (isLoading || !item) {
    return createPortal(
      <div className="t10-portal-wrapper">
        {/* Overlay */}
        <div className="t10-panel-overlay" onClick={handleOverlayClick} />
        {/* Panel Loading */}
        <div className="t10-panel">
          <div className="t10-loading-center">
            <span className="t10-loading-text">Loading...</span>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const isCompleted = item.status === 'done';

  const panelContent = (
    <div className="t10-portal-wrapper">
      {/* Overlay */}
      <div 
        className={`t10-panel-overlay ${isClosing ? 't10-panel-overlay-closing' : ''}`}
        onClick={handleOverlayClick}
      />

      {/* Panel */}
      <div
        className={`t10-panel ${isClosing ? 't10-panel-closing' : 'open'}`}
      >
        {/* Header */}
        <div className="t10-panel-header">
          <div className="t10-panel-header-row">
            <div className="t10-panel-header-left">
              <div className="t10-panel-rank-badge">{item.rank}</div>
              <h2 className="t10-panel-title-label">Task¹⁰ Priority</h2>
            </div>
            <div className="t10-panel-header-actions">
              {item.taskhub_key && (
                <button
                  type="button"
                  onClick={handleExternalLink}
                  title="Open in TaskHub"
                  className="t10-panel-header-btn"
                >
                  <ExternalLink size={18} />
                </button>
              )}
              <button
                type="button"
                title="More actions"
                className="t10-panel-header-btn"
              >
                <MoreHorizontal size={18} />
              </button>
              <button
                type="button"
                onClick={handleClose}
                title="Close (ESC)"
                className="t10-panel-header-btn"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          {item.taskhub_key && (
            <div className="t10-panel-key-row">
              <span className="t10-panel-key">{item.taskhub_key}</span>
              <button
                type="button"
                onClick={handleCopyKey}
                title={copiedKey ? 'Copied!' : 'Copy key'}
                className="t10-panel-copy-btn"
              >
                {copiedKey ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          )}
        </div>

        {/* Title Section */}
        <div className="t10-panel-title-section">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') {
                  setTitleValue(item.title);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="t10-panel-title-input"
            />
          ) : (
            <h3
              onClick={() => setIsEditingTitle(true)}
              className="t10-panel-title-display"
            >
              {item.title}
            </h3>
          )}
        </div>

        {/* Tabs */}
        <div className="t10-panel-tabs">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`t10-panel-tab ${activeTab === 'details' ? 't10-panel-tab-active' : ''}`}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`t10-panel-tab ${activeTab === 'activity' ? 't10-panel-tab-active' : ''}`}
          >
            Activity
          </button>
        </div>

        {/* Content */}
        <div className="t10-panel-content">
          {activeTab === 'details' && (
            <div className="t10-panel-body">
              {/* Status Field */}
              <div className="t10-field-group">
                <div className="t10-field-header">
                  <label className="t10-field-label">
                    <Clock size={14} />
                    Status
                  </label>
                </div>
                <div
                  onClick={handleStatusToggle}
                  role="checkbox"
                  aria-checked={isCompleted}
                  tabIndex={0}
                  className={`t10-status-toggle ${isCompleted ? 't10-status-toggle-done' : ''}`}
                >
                  <div className={`t10-status-checkbox ${isCompleted ? 't10-status-checkbox-done' : ''}`}>
                    {isCompleted && <Check size={14} color="#ffffff" />}
                  </div>
                  <span className={`t10-status-text ${isCompleted ? 't10-status-text-done' : ''}`}>
                    {isCompleted ? 'Completed' : 'Mark as completed'}
                  </span>
                </div>
              </div>

              {/* Assignee Field */}
              <div className="t10-field-group">
                <div className="t10-field-label">
                  <User size={14} />
                  Assigned To
                </div>
                <T10AssigneeFieldNew
                  value={item.assignee_id || null}
                  assigneeName={item.assignee_name || null}
                  assigneeAvatar={item.assignee_avatar || null}
                  onChange={handleAssigneeChange}
                />
              </div>

              {/* Due Date Field */}
              <div className="t10-field-group">
                <div className="t10-field-label">
                  <Calendar size={14} />
                  Due Date
                </div>
                <T10DateFieldNew
                  value={item.due_date || null}
                  onChange={handleDateChange}
                />
              </div>

              {/* Labels Field */}
              <div className="t10-field-group">
                <div className="t10-field-label">
                  <Tag size={14} />
                  Labels
                </div>
                <T10LabelsFieldNew
                  selectedLabels={item.labels || []}
                  onChange={handleLabelsChange}
                />
              </div>

              {/* Description Field */}
              <div className="t10-field-group">
                <div className="t10-field-header">
                  <label className="t10-field-label">
                    <FileText size={14} />
                    Description
                  </label>
                  {descriptionStatus !== 'idle' && (
                    <span className={`t10-save-status ${descriptionStatus === 'saving' ? 't10-save-status-saving' : 't10-save-status-saved'}`}>
                      {descriptionStatus === 'saving' && 'Saving...'}
                      {descriptionStatus === 'saved' && (
                        <>
                          <Check size={12} />
                          Saved
                        </>
                      )}
                    </span>
                  )}
                </div>
                <textarea
                  value={descriptionValue}
                  onChange={(e) => setDescriptionValue(e.target.value)}
                  placeholder="Add a description..."
                  className="t10-description-textarea"
                />
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="t10-panel-body">
              <T10ActivityTimeline itemId={item.id} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="t10-panel-footer">
          <span className="t10-panel-footer-meta">
            Created {formatT10RelativeTime(item.created_at)}
          </span>
          <button
            type="button"
            onClick={handleDelete}
            className="t10-btn-delete"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(panelContent, document.body);
}

export default T10SidePanelNew;
