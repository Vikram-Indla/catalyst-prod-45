// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10AddItemModal
// Purpose: Modal for adding new priority items
// Prompt 9 of 9 Complete Rebuild
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, User } from 'lucide-react';
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
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 600,
          animation: isClosing ? undefined : 't10-fadeIn 200ms ease',
        }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
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
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>
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
              color: '#6b7280',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Title */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#6b7280',
                  marginBottom: '8px',
                }}
              >
                Title <span style={{ color: '#ef4444' }}>*</span>
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
                  fontSize: '14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  outline: 'none',
                }}
              />
              {error && (
                <p style={{ fontSize: '13px', color: '#ef4444', marginTop: '4px' }}>{error}</p>
              )}
            </div>

            {/* TaskHub Key */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#6b7280',
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
                  fontSize: '14px',
                  fontFamily: "'SF Mono', Monaco, monospace",
                  border: '1px solid #d1d5db',
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
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#6b7280',
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
                        fontSize: '14px',
                        fontWeight: 600,
                        color: isSelected
                          ? '#2563eb'
                          : isOccupied
                          ? '#9ca3af'
                          : isBuffer
                          ? '#9ca3af'
                          : '#4b5563',
                        backgroundColor: isSelected
                          ? '#eff6ff'
                          : isBuffer
                          ? '#f9fafb'
                          : '#f3f4f6',
                        border: isSelected
                          ? '2px solid #2563eb'
                          : isBuffer
                          ? '2px dashed #d1d5db'
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
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#6b7280',
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
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
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
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#6b7280',
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
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    outline: 'none',
                    backgroundColor: '#ffffff',
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
              backgroundColor: '#f9fafb',
              borderTop: '1px solid #e5e7eb',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                color: '#9ca3af',
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
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#6b7280',
                  backgroundColor: '#e5e7eb',
                  border: '1px solid #d1d5db',
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
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
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
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#ffffff',
                  backgroundColor: '#2563eb',
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
