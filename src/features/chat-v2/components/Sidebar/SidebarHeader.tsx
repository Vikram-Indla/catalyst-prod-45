import React from 'react';
import { ChevronDownIcon } from '../shared/Icon';

interface SidebarHeaderProps {
  title: string;
  unreadsOnly: boolean;
  onToggleUnreadsOnly: (v: boolean) => void;
  /** Opens the new-conversation flow via the circular compose button on the
   *  far right. Optional — when absent at a call site, the button is hidden. */
  onNewConversation?: () => void;
  onTitleClick?: () => void;
}

export function SidebarHeader({
  title,
  unreadsOnly,
  onToggleUnreadsOnly,
  onNewConversation,
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
        {onNewConversation && <ComposeButton onClick={onNewConversation} />}
      </div>
    </div>
  );
}

function ComposeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="New message"
      title="New message"
      style={{
        width: 28,
        height: 28,
        flex: '0 0 auto',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--ds-background-brand-bold)',
        color: 'var(--ds-text-inverse)',
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
        padding: 0,
        transition: 'background var(--cv2-transition-fast)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background =
          'var(--ds-background-brand-bold-hovered)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background =
          'var(--ds-background-brand-bold)';
      }}
    >
      <svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      </svg>
    </button>
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
        font: 'var(--ds-font-body-small)',
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
