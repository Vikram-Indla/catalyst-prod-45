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
  StickyNote,
  Check,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useT10Item,
  useT10UpdateItem,
  useT10ToggleItemStatus,
  useT10DeleteItem,
  useT10UpdateItemLabels,
  useT10FullItemRealtime,
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
  const { toast } = useToast();
  const [isClosing, setIsClosing] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [notesValue, setNotesValue] = useState('');
  const [notesStatus, setNotesStatus] = useState<
    'idle' | 'saving' | 'saved'
  >('idle');
  const [copiedKey, setCopiedKey] = useState(false);

  // Fetch item data
  const { data: item, isLoading, refetch } = useT10Item(itemId);
  const updateItem = useT10UpdateItem();
  const toggleStatus = useT10ToggleItemStatus();
  const deleteItem = useT10DeleteItem();
  const updateLabels = useT10UpdateItemLabels();

  // Enable real-time subscriptions for this item
  useT10FullItemRealtime(itemId);

  // Sync local state with item data
  useEffect(() => {
    if (item) {
      setTitleValue(item.title);
      setNotesValue(item.description || '');
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

  // Handle notes auto-save (debounced)
  useEffect(() => {
    if (!item || notesValue === (item.description || '')) return;

    setNotesStatus('saving');
    const timer = setTimeout(async () => {
      try {
        await updateItem.mutateAsync({
          id: item.id,
          description: notesValue || null,
        });
        setNotesStatus('saved');
        console.log('[T10] Notes auto-saved');
        onUpdated?.();
        setTimeout(() => setNotesStatus('idle'), 2000);
      } catch (err) {
        setNotesStatus('idle');
        console.error('[T10] Notes save failed:', err);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [notesValue, item]);

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

  // Handle delete with toast notification
  const handleDelete = async () => {
    if (!item) return;

    try {
      await deleteItem.mutateAsync(item);
      
      // Show success toast
      toast({
        title: 'Item deleted',
        description: `"${item.title}" has been removed`,
        variant: 'destructive',
      });
      
      console.log('[T10] Item deleted via panel');
      onDeleted?.();
      setTimeout(() => handleClose(), 300);
    } catch (error) {
      console.error('[T10] Error deleting item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      });
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

  // Invasive inline styles to ensure panel visibility regardless of CSS conflicts
  const panelStyles: React.CSSProperties = {
    position: 'fixed',
    top: 'var(--app-top-offset, 0px)',
    right: 0,
    width: 480,
    maxWidth: '100vw',
    height: 'calc(100dvh - var(--app-top-offset, 0px))',
    background: '#ffffff',
    boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.15), -2px 0 8px rgba(0, 0, 0, 0.1)',
    zIndex: 100001,
    display: 'flex',
    flexDirection: 'column',
    pointerEvents: 'auto',
    transform: isClosing ? 'translateX(100%)' : 'translateX(0)',
    transition: 'transform 0.25s ease-out',
  };

  const overlayStyles: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    top: 'var(--app-top-offset, 0px)',
    background: 'rgba(0, 0, 0, 0.4)',
    zIndex: 100000,
    pointerEvents: 'auto',
  };

  if (isLoading || !item) {
    return createPortal(
      <div className="t10-portal-wrapper">
        {/* Overlay */}
        <div style={overlayStyles} onClick={handleOverlayClick} />
        {/* Panel Loading */}
        <div style={panelStyles}>
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
        style={overlayStyles}
        onClick={handleOverlayClick}
      />

      {/* Panel - with invasive inline styles */}
      <div style={panelStyles}>
        {/* Header - clean blue bar */}
        <div
          style={{
            background: '#2563eb',
            padding: '14px 20px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 56,
          }}
        >
          {/* Left side: Back arrow + branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={handleClose}
              title="Back"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                borderRadius: 8,
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: 18,
                fontFamily: 'system-ui, sans-serif',
              }}
            >
            ←
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#ffffff',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
                PRIORITIES
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#ffffff',
                }}
              >
                10
              </span>
            </div>
            {item.rank && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#ffffff',
                }}
              >
                {item.rank}
              </span>
            )}
          </div>

          {/* Right side: Close button */}
          <button
            type="button"
            onClick={handleClose}
            title="Close (ESC)"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: 8,
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Title Section */}
        <div
          style={{
            padding: 20,
            borderBottom: '1px solid var(--t10-border-subtle)',
          }}
        >
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
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--t10-border-default)',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            style={{
              flex: 1,
              padding: '12px 14px',
              fontSize: 13,
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: activeTab === 'details' ? 'var(--t10-accent)' : 'var(--t10-text-secondary)',
              borderBottom:
                activeTab === 'details'
                  ? '2px solid var(--t10-accent)'
                  : '2px solid transparent',
            }}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            style={{
              flex: 1,
              padding: '12px 14px',
              fontSize: 13,
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: activeTab === 'activity' ? 'var(--t10-accent)' : 'var(--t10-text-secondary)',
              borderBottom:
                activeTab === 'activity'
                  ? '2px solid var(--t10-accent)'
                  : '2px solid transparent',
            }}
          >
            Activity
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
          }}
        >
          {activeTab === 'details' && (
            <div style={{ padding: 20 }}>
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

              {/* Notes Field */}
              <div className="t10-field-group">
                <div className="t10-field-header">
                  <label className="t10-field-label">
                    <StickyNote size={14} />
                    Notes
                  </label>
                  {notesStatus !== 'idle' && (
                    <span className={`t10-save-status ${notesStatus === 'saving' ? 't10-save-status-saving' : 't10-save-status-saved'}`}>
                      {notesStatus === 'saving' && 'Saving...'}
                      {notesStatus === 'saved' && (
                        <>
                          <Check size={12} />
                          Saved
                        </>
                      )}
                    </span>
                  )}
                </div>
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  placeholder="Add notes..."
                  className="t10-description-textarea"
                />
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div style={{ padding: 20 }}>
              <T10ActivityTimeline itemId={item.id} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--t10-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--t10-text-secondary)' }}>
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
