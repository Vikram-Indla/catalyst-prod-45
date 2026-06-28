import React from 'react';
import { ChevronDownIcon } from '../shared/Icon';

interface SidebarHeaderProps {
  title: string;
  unreadsOnly: boolean;
  onToggleUnreadsOnly: (v: boolean) => void;
  /** Kept on the type for callsite compatibility but no longer wired —
   *  the inline "compose" pencil was removed at user request. The rail
   *  footer's "Create new" still covers new-conversation creation. */
  onNewConversation?: () => void;
  onTitleClick?: () => void;
}

export function SidebarHeader({
  title,
  unreadsOnly,
  onToggleUnreadsOnly,
  onTitleClick,
}: SidebarHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '12px 16px 10px',
      }}
    >
      <button
        type="button"
        onClick={onTitleClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: 'transparent',
          border: 'none',
          color: 'var(--cv2-text-strong)',
          fontFamily: 'var(--cv2-font)',
          fontSize: 'var(--cv2-fs-sidebar-header)',
          fontWeight: 700,
          letterSpacing: '-0.01em',
          cursor: 'pointer',
          padding: 0,
          maxWidth: 180,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
        <ChevronDownIcon size={14} />
      </button>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <UnreadsToggle value={unreadsOnly} onChange={onToggleUnreadsOnly} />
      </div>
    </div>
  );
}

function UnreadsToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label="Show unreads only"
      onClick={() => onChange(!value)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: 'transparent',
        border: 'none',
        color: 'var(--cv2-text-subtle)',
        fontFamily: 'var(--cv2-font)',
        fontSize: 'var(--ds-font-size-200)',
        fontWeight: 500,
        padding: 0,
        cursor: 'pointer',
      }}
    >
      <span>Unreads</span>
      <span
        aria-hidden="true"
        style={{
          width: 28,
          height: 16,
          borderRadius: 8,
          padding: 0,
          background: value ? 'var(--cv2-accent)' : 'var(--cv2-border-strong)',
          transition: 'background var(--cv2-transition-fast)',
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: 'var(--ds-surface)',
            transform: `translateX(${value ? 12 : 0}px)`,
            transition: 'transform var(--cv2-transition-fast)',
            display: 'block',
          }}
        />
      </span>
    </button>
  );
}
