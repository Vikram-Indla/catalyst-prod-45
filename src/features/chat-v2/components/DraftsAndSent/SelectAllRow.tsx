import React from 'react';

interface SelectAllRowProps {
  totalCount: number;
  selectedCount: number;
  onToggle: () => void;
}

export function SelectAllRow({ totalCount, selectedCount, onToggle }: SelectAllRowProps) {
  const allSelected = selectedCount > 0 && selectedCount === totalCount;
  const indeterminate = selectedCount > 0 && selectedCount < totalCount;
  const label = selectedCount > 0 ? `Selected (${selectedCount})` : 'Select all';
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--cv2-font)',
        font: 'var(--ds-font-body)',
        color: 'var(--cv2-text)',
        fontWeight: 500,
        textAlign: 'left',
      }}
      aria-label={label}
    >
      <span
        aria-hidden="true"
        style={{
          width: 16,
          height: 16,
          border: `1.5px solid ${allSelected || indeterminate ? 'var(--cv2-accent)' : 'var(--cv2-border-strong, var(--cv2-border))'}`,
          borderRadius: 3,
          background: allSelected || indeterminate ? 'var(--cv2-accent)' : 'transparent',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
        }}
      >
        {allSelected && (
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="var(--ds-surface)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
        {indeterminate && (
          <span
            style={{
              width: 8,
              height: 2,
              background: 'var(--ds-surface)',
              borderRadius: 1,
            }}
          />
        )}
      </span>
      {label}
    </button>
  );
}
