// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10AddItemModal
// Purpose: Modal for adding new priority items
// Prompt 9 of 9 Complete Rebuild
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, User } from '@/lib/atlaskit-icons';
import { useT10CreateItem, useT10Users } from '../../hooks';
import { getT10Initials } from '../../utils';

interface T10AddItemModalProps {
  weekId: string;
  defaultRank?: number;
  existingRanks: number[];
  onClose: () => void;
  onCreated: () => void;
}

export function T10AddItemModal({
  weekId,
  defaultRank = 1,
  existingRanks,
  onClose,
  onCreated,
}: T10AddItemModalProps) {
  const [title, setTitle] = useState('');
  const [taskhubKey, setTaskhubKey] = useState('');
  const [rank, setRank] = useState(defaultRank);
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const createItem = useT10CreateItem();
  const { data: users } = useT10Users();

  // Focus title input on mount
  useEffect(() => {
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 100);
  }, []);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      await createItem.mutateAsync({
        week_id: weekId,
        title: title.trim(),
        rank,
        taskhub_key: taskhubKey.trim() || undefined,
        due_date: dueDate || undefined,
        assignee_id: assigneeId || undefined,
      });

      console.log('[T10] Item created:', title, 'at rank', rank);
      onCreated();
    } catch (err) {
      console.error('[T10] Error creating item:', err);
      setError(err instanceof Error ? err.message : 'Failed to create item');
    }
  };

  // Generate position options (1-10 + buffer)
  const positions = Array.from({ length: 11 }, (_, i) => i + 1);

  const modalContent = (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'var(--ds-shadow-raised, rgba(0, 0, 0, 0.4))',
          zIndex: 600,
          animation: isClosing ? undefined : 't10-fadeIn 200ms ease',
        }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '48%',
          left: '48%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: '480px',
          backgroundColor: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px var(--ds-shadow-raised, rgba(0, 0, 0, 0.25))',
          zIndex: 601,
          overflow: 'hidden',
          animation: isClosing
            ? 't10-scaleOut 200ms ease forwards'
            : 't10-scaleIn 200ms ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--ds-border)',
          }}
        >
          <h2 style={{ fontSize: 'var(--ds-font-size-600)', fontWeight: 600, color: 'var(--ds-text)', margin: 0 }}>
            Add Priority Item
          </h2>
          <button
            type="button"
            onClick={handleClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--ds-text-subtlest)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Title */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--ds-font-size-300)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--ds-text-subtlest)',
                  marginBottom: '8px',
                }}
              >
                Title <span style={{ color: 'var(--ds-text-danger)' }}>*</span>
              </label>
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                maxLength={200}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: 'var(--ds-font-size-400)',
                  border: '1px solid var(--ds-border)',
                  borderRadius: '8px',
                  outline: 'none',
                }}
              />
              {error && (
                <p style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-danger)', marginTop: '4px' }}>{error}</p>
              )}
            </div>

            {/* TaskHub Key */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: 'var(--ds-font-size-300)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--ds-text-subtlest)',
                  marginBottom: '8px',
                }}
              >
                TaskHub Key
                <span style={{ fontWeight: 400, textTransform: 'none', opacity: 0.7 }}>(optional)</span>
              </label>
              <input
                type="text"
                value={taskhubKey}
                onChange={(e) => setTaskhubKey(e.target.value.toUpperCase())}
                placeholder="e.g., TSK-123"
                maxLength={20}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: 'var(--ds-font-size-400)',
                  fontFamily: "'SF Mono', Monaco, monospace",
                  border: '1px solid var(--ds-border)',
                  borderRadius: '8px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Position */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--ds-font-size-300)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--ds-text-subtlest)',
                  marginBottom: '8px',
                }}
              >
                Position
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {positions.map(pos => {
                  const isOccupied = existingRanks.includes(pos) && pos !== defaultRank;
                  const isSelected = pos === rank;
                  const isBuffer = pos > 10;

                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => !isOccupied && setRank(pos)}
                      disabled={isOccupied}
                      title={isOccupied ? 'Position occupied' : isBuffer ? 'Buffer zone' : `Position ${pos}`}
                      style={{
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 'var(--ds-font-size-400)',
                        fontWeight: 600,
                        color: isSelected
                          ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))'
                          : isOccupied
                          ? 'var(--ds-text-subtlest)'
                          : isBuffer
                          ? 'var(--ds-text-subtlest)'
                          : 'var(--ds-text-subtle)',
                        backgroundColor: isSelected
                          ? 'var(--ds-background-selected)'
                          : isBuffer
                          ? 'var(--ds-surface-sunken)'
                          : 'var(--ds-background-neutral)',
                        border: isSelected
                          ? '2px solid var(--ds-link)'
                          : isBuffer
                          ? '2px dashed var(--ds-border)'
                          : '2px solid transparent',
                        borderRadius: '8px',
                        cursor: isOccupied ? 'not-allowed' : 'pointer',
                        opacity: isOccupied ? 0.4 : 1,
                      }}
                    >
                      {pos > 10 ? '+' : pos}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Due Date + Assignee Row */}
            <div style={{ display: 'flex', gap: '16px' }}>
              {/* Due Date */}
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: 'var(--ds-font-size-300)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'var(--ds-text-subtlest)',
                    marginBottom: '8px',
                  }}
                >
                  <Calendar size={14} />
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: 'var(--ds-font-size-400)',
                    border: '1px solid var(--ds-border)',
                    borderRadius: '8px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Assignee */}
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: 'var(--ds-font-size-300)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'var(--ds-text-subtlest)',
                    marginBottom: '8px',
                  }}
                >
                  <User size={14} />
                  Assignee
                </label>
                <select
                  value={assigneeId || ''}
                  onChange={(e) => setAssigneeId(e.target.value || null)}
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 14px',
                    fontSize: 'var(--ds-font-size-400)',
                    border: '1px solid var(--ds-border)',
                    borderRadius: '8px',
                    outline: 'none',
                    backgroundColor: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
                  }}
                >
                  <option value="">Unassigned</option>
                  {users?.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || 'Unknown User'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              backgroundColor: 'var(--ds-surface-sunken)',
              borderTop: '1px solid var(--ds-border)',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: 'var(--ds-font-size-200)',
                color: 'var(--ds-text-subtlest)',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '20px',
                  height: '20px',
                  padding: '0 6px',
                  fontFamily: "'SF Mono', Monaco, monospace",
                  fontSize: 'var(--ds-font-size-100)',
                  fontWeight: 500,
                  color: 'var(--ds-text-subtlest)',
                  backgroundColor: 'var(--ds-border)',
                  border: '1px solid var(--ds-border)',
                  borderRadius: '4px',
                }}
              >
                ESC
              </span>
              to cancel
            </span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  padding: '8px 20px',
                  fontSize: 'var(--ds-font-size-400)',
                  fontWeight: 500,
                  color: 'var(--ds-text)',
                  backgroundColor: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
                  border: '1px solid var(--ds-border)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || createItem.isPending}
                style={{
                  padding: '8px 20px',
                  fontSize: 'var(--ds-font-size-400)',
                  fontWeight: 500,
                  color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
                  backgroundColor: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: !title.trim() ? 'not-allowed' : 'pointer',
                  opacity: !title.trim() ? 0.5 : 1,
                }}
              >
                {createItem.isPending ? 'Adding...' : 'Add to Week'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}

export default T10AddItemModal;
