// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10SidePanelNew
// Purpose: Complete 480px side panel with database-wired fields and auto-save
// Prompt 8 of 9 Complete Rebuild
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
      <>
        {/* Overlay */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 500,
            animation: 't10-fadeIn 200ms ease',
          }}
          onClick={handleOverlayClick}
        />
        {/* Panel Loading */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '480px',
            maxWidth: '100vw',
            height: '100vh',
            backgroundColor: '#ffffff',
            boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.12)',
            zIndex: 501,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center', color: '#64748b' }}>Loading...</div>
        </div>
      </>,
      document.body
    );
  }

  const isCompleted = item.status === 'done';

  const panelContent = (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 500,
          animation: isClosing ? undefined : 't10-fadeIn 200ms ease',
        }}
        onClick={handleOverlayClick}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '480px',
          maxWidth: '100vw',
          height: '100vh',
          backgroundColor: '#ffffff',
          boxShadow:
            '-8px 0 32px rgba(0, 0, 0, 0.12), -2px 0 8px rgba(0, 0, 0, 0.08)',
          zIndex: 501,
          display: 'flex',
          flexDirection: 'column',
          animation: isClosing
            ? 't10-slideOutRight 200ms ease forwards'
            : 't10-slideInRight 250ms ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            padding: '16px 20px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#ffffff',
                }}
              >
                {item.rank}
              </div>
              <h2
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  margin: 0,
                }}
              >
                Task¹⁰ Priority
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {item.taskhub_key && (
                <button
                  type="button"
                  onClick={handleExternalLink}
                  title="Open in TaskHub"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    cursor: 'pointer',
                  }}
                >
                  <ExternalLink size={18} />
                </button>
              )}
              <button
                type="button"
                title="More actions"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  cursor: 'pointer',
                }}
              >
                <MoreHorizontal size={18} />
              </button>
              <button
                type="button"
                onClick={handleClose}
                title="Close (ESC)"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
          {item.taskhub_key && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontFamily: "'SF Mono', Monaco, monospace",
                  fontSize: '13px',
                  color: 'rgba(255, 255, 255, 0.9)',
                }}
              >
                {item.taskhub_key}
              </span>
              <button
                type="button"
                onClick={handleCopyKey}
                title={copiedKey ? 'Copied!' : 'Copy key'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                }}
              >
                {copiedKey ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          )}
        </div>

        {/* Title Section */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #f3f4f6',
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
              style={{
                width: '100%',
                fontSize: '20px',
                fontWeight: 600,
                color: '#111827',
                backgroundColor: '#ffffff',
                border: '2px solid #2563eb',
                borderRadius: '6px',
                padding: '4px 8px',
                margin: '-4px -8px',
                outline: 'none',
              }}
            />
          ) : (
            <h3
              onClick={() => setIsEditingTitle(true)}
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#111827',
                margin: 0,
                lineHeight: 1.4,
                cursor: 'text',
                padding: '4px 0',
                borderRadius: '6px',
              }}
            >
              {item.title}
            </h3>
          )}
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e5e7eb',
            padding: '0 20px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: activeTab === 'details' ? '#2563eb' : '#6b7280',
              background: 'transparent',
              border: 'none',
              borderBottom:
                activeTab === 'details' ? '2px solid #2563eb' : '2px solid transparent',
              marginBottom: '-1px',
              cursor: 'pointer',
            }}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: activeTab === 'activity' ? '#2563eb' : '#6b7280',
              background: 'transparent',
              border: 'none',
              borderBottom:
                activeTab === 'activity' ? '2px solid #2563eb' : '2px solid transparent',
              marginBottom: '-1px',
              cursor: 'pointer',
            }}
          >
            Activity
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
          {activeTab === 'details' && (
            <div style={{ padding: '20px' }}>
              {/* Status Field */}
              <div style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: '#6b7280',
                    }}
                  >
                    <Clock size={14} />
                    Status
                  </label>
                </div>
                <div
                  onClick={handleStatusToggle}
                  role="checkbox"
                  aria-checked={isCompleted}
                  tabIndex={0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    backgroundColor: isCompleted ? '#ecfdf5' : '#f9fafb',
                    border: isCompleted ? '1px solid #10b981' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      border: isCompleted
                        ? '2px solid #10b981'
                        : '2px solid #d1d5db',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isCompleted ? '#10b981' : 'transparent',
                      flexShrink: 0,
                    }}
                  >
                    {isCompleted && <Check size={14} color="#ffffff" />}
                  </div>
                  <span
                    style={{
                      fontSize: '14px',
                      color: isCompleted ? '#10b981' : '#374151',
                      fontWeight: isCompleted ? 500 : 400,
                    }}
                  >
                    {isCompleted ? 'Completed' : 'Mark as completed'}
                  </span>
                </div>
              </div>

              {/* Assignee Field */}
              <div style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#6b7280',
                    marginBottom: '8px',
                  }}
                >
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
              <div style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#6b7280',
                    marginBottom: '8px',
                  }}
                >
                  <Calendar size={14} />
                  Due Date
                </div>
                <T10DateFieldNew
                  value={item.due_date || null}
                  onChange={handleDateChange}
                />
              </div>

              {/* Labels Field */}
              <div style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#6b7280',
                    marginBottom: '8px',
                  }}
                >
                  <Tag size={14} />
                  Labels
                </div>
                <T10LabelsFieldNew
                  selectedLabels={item.labels || []}
                  onChange={handleLabelsChange}
                />
              </div>

              {/* Description Field */}
              <div style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: '#6b7280',
                    }}
                  >
                    <FileText size={14} />
                    Description
                  </label>
                  {descriptionStatus !== 'idle' && (
                    <span
                      style={{
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: descriptionStatus === 'saving' ? '#2563eb' : '#10b981',
                      }}
                    >
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
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '12px 14px',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    color: '#111827',
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div style={{ padding: '20px' }}>
              <T10ActivityTimeline itemId={item.id} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
            borderTop: '1px solid #e5e7eb',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '13px', color: '#6b7280' }}>
            Created {formatT10RelativeTime(item.created_at)}
          </span>
          <button
            type="button"
            onClick={handleDelete}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#ef4444',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>
    </>
  );

  return createPortal(panelContent, document.body);
}

export default T10SidePanelNew;
