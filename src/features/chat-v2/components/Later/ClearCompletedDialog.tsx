/**
 * ClearCompletedDialog — confirms wiping all completed Later items.
 */
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface Props {
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ClearCompletedDialog({ count, onCancel, onConfirm }: Props) {
  const trapRef = useFocusTrap<HTMLDivElement>();
  useEffect(() => {
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
      aria-label="Clear completed reminders"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--cv2-bg-overlay)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '24vh',
        zIndex: 'var(--cv2-modal-z, 1000)' as any,
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          width: 440,
          background: 'var(--cv2-bg-modal)',
          border: '1px solid var(--cv2-border-strong)',
          borderRadius: 'var(--cv2-radius-lg)',
          boxShadow: 'var(--cv2-shadow-modal)',
          fontFamily: 'var(--cv2-font)',
          color: 'var(--cv2-text)',
          padding: 24,
        }}
      >
        <div style={{ font: 'var(--ds-font-heading-small)', fontWeight: 700, color: 'var(--cv2-text-strong)' }}>
          Clear completed items?
        </div>
        <div style={{ marginTop: 8, font: 'var(--ds-font-body)', color: 'var(--cv2-text-subtle)' }}>
          {count > 0
            ? `This will permanently remove ${count} completed item${count === 1 ? '' : 's'} from Later.`
            : 'There are no completed items.'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              height: 34,
              padding: '0 16px',
              background: 'transparent',
              color: 'var(--cv2-text)',
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
            disabled={count === 0}
            style={{
              height: 34,
              padding: '0 16px',
              background: count === 0 ? 'var(--cv2-bg-row-hover)' : 'var(--ds-background-danger-bold)',
              color: count === 0 ? 'var(--cv2-text-muted)' : 'var(--ds-text-inverse)',
              border: 'none',
              borderRadius: 'var(--cv2-radius-sm)',
              fontFamily: 'inherit',
              font: 'var(--ds-font-body)',
              fontWeight: 700,
              cursor: count === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
