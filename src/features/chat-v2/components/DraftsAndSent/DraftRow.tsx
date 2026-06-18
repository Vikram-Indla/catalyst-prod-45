import React from 'react';
import { formatRowTimestamp } from '../../lib/formatTimestamp';
import type { DraftListItem } from '../../hooks/useAllDrafts';

interface DraftRowProps {
  draft: DraftListItem;
  onClick: () => void;
  /** When in select mode, leading checkbox is rendered + click toggles selection. */
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelected?: () => void;
}

export function DraftRow({
  draft,
  onClick,
  selectMode = false,
  selected = false,
  onToggleSelected,
}: DraftRowProps) {
  const handleClick = () => {
    if (selectMode) {
      onToggleSelected?.();
      return;
    }
    onClick();
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        textAlign: 'left',
        padding: '12px 16px',
        background: 'transparent',
        border: '1px solid var(--cv2-border)',
        borderRadius: 8,
        cursor: 'pointer',
        fontFamily: 'var(--cv2-font)',
        color: 'var(--cv2-text)',
        transition: 'background var(--cv2-transition-fast)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {selectMode && (
        <span
          aria-hidden="true"
          style={{
            width: 16,
            height: 16,
            border: '1.5px solid var(--cv2-border-strong, var(--cv2-border))',
            borderRadius: 3,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: selected ? 'var(--cv2-accent)' : 'transparent',
            borderColor: selected ? 'var(--cv2-accent)' : undefined,
            flex: '0 0 auto',
          }}
        >
          {selected && (
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>
      )}
      <span
        aria-hidden="true"
        style={{
          width: 36,
          height: 36,
          borderRadius: 6,
          background: 'var(--cv2-bg-row-hover)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--cv2-text-subtle)',
          fontWeight: 600,
          flex: '0 0 auto',
        }}
      >
        {firstInitial(draft.conversationTitle)}
      </span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--cv2-text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {draft.conversationTitle}
        </span>
        <span
          style={{
            fontSize: 13,
            color: 'var(--cv2-text-subtle)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {draft.bodyPreview || 'No content'}
        </span>
      </span>
      <span
        style={{
          flex: '0 0 auto',
          fontSize: 12,
          color: 'var(--cv2-text-muted)',
        }}
      >
        {formatRowTimestamp(draft.updatedAt)}
      </span>
    </button>
  );
}

function firstInitial(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length === 0) return '?';
  return trimmed.charAt(0).toUpperCase();
}
