import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PresenceAvatar } from '../shared/PresenceAvatar';
import { XIcon } from '../shared/Icon';
import { formatMessageTime } from '../../lib/formatTimestamp';
import { renderMarkdownInline } from '../../lib/markdown';
import type { ChatMessage } from '@/types/chat';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface DeleteMessageDialogProps {
  message: ChatMessage;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteMessageDialog({ message, onCancel, onConfirm }: DeleteMessageDialogProps) {
  const trapRef = useFocusTrap<HTMLDivElement>();
  useEffect(() => {
    // CAT-AUDIT-0607: Enter must NOT confirm a destructive action from
    // anywhere in the dialog — only explicit activation of the focused
    // Delete button should. Escape-to-cancel is still a safe global default.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCancel(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  return createPortal(
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label="Delete message"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--cv2-bg-overlay)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '16vh',
        zIndex: 'var(--cv2-modal-z, 1000)' as any,
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          width: 520,
          background: 'var(--cv2-bg-modal)',
          border: '1px solid var(--cv2-border-strong)',
          borderRadius: 'var(--cv2-radius-lg)',
          boxShadow: 'var(--cv2-shadow-modal)',
          fontFamily: 'var(--cv2-font)',
          color: 'var(--cv2-text)',
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ font: 'var(--ds-font-heading-large)', fontWeight: 700, color: 'var(--cv2-text-strong)' }}>
            Delete message
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            style={{
              width: 28, height: 28,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', color: 'var(--cv2-text-subtle)',
              border: 'none', borderRadius: 'var(--cv2-radius-sm)', cursor: 'pointer',
            }}
          >
            <XIcon size={16} />
          </button>
        </div>
        <p
          style={{
            margin: '12px 0 16px',
            font: 'var(--ds-font-body-large)',
            lineHeight: 1.45,
            color: 'var(--cv2-text)',
          }}
        >
          Are you sure you want to delete this message? This cannot be undone.
        </p>
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: 12,
            border: '1px solid var(--cv2-border)',
            borderRadius: 'var(--cv2-radius-md)',
            background: 'var(--cv2-bg-row-hover)',
          }}
        >
          <PresenceAvatar name={message.authorName} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ font: 'var(--ds-font-body)', fontWeight: 700, color: 'var(--cv2-text-strong)' }}>
                {message.authorName}
              </span>
              <span style={{ font: 'var(--ds-font-body-small)', color: 'var(--cv2-text-muted)' }}>
                {formatMessageTime(message.createdAt)}
              </span>
            </div>
            <div
              style={{
                marginTop: 4,
                font: 'var(--ds-font-body)',
                color: 'var(--cv2-text)',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
              }}
              dangerouslySetInnerHTML={{ __html: renderMarkdownInline(message.bodyText) }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              height: 36,
              padding: '0 16px',
              background: 'transparent',
              color: 'var(--cv2-text-strong)',
              border: '1px solid var(--cv2-border-strong)',
              borderRadius: 'var(--cv2-radius-sm)',
              fontFamily: 'inherit',
              font: 'var(--ds-font-body)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            style={{
              height: 36,
              padding: '0 16px',
              background: 'var(--cv2-danger)',
              color: 'var(--ds-text-inverse)',
              border: '1px solid var(--cv2-danger)',
              borderRadius: 'var(--cv2-radius-sm)',
              boxShadow: '0 0 0 3px var(--ds-border-danger)',
              fontFamily: 'inherit',
              font: 'var(--ds-font-body)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
