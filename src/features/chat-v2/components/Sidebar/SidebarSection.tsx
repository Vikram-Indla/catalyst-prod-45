import React, { useState } from 'react';
import { ChevronDownIcon } from '../shared/Icon';

interface SidebarSectionProps {
  title: string;
  defaultOpen?: boolean;
  /** Icons rendered on the right of the header, only visible on hover. */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function SidebarSection({
  title,
  defaultOpen = true,
  actions,
  children,
}: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [hover, setHover] = useState(false);
  return (
    <section
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          minHeight: 26,
          padding: '4px 0 4px 4px',
          color: 'var(--cv2-text-muted)',
          fontFamily: 'var(--cv2-font)',
          font: 'var(--ds-font-body-small)',
          fontWeight: 700,
          userSelect: 'none',
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`}
          style={{
            width: 18,
            height: 18,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            color: 'var(--cv2-text-subtle)',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            borderRadius: 3,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: 'inline-flex',
              transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform var(--cv2-transition-fast)',
            }}
          >
            <ChevronDownIcon size={12} />
          </span>
        </button>
        <span style={{ flex: 1 }}>{title}</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0,
            opacity: hover ? 1 : 0,
            transition: 'opacity var(--cv2-transition-fast)',
            pointerEvents: hover ? 'auto' : 'none',
          }}
        >
          {actions}
        </span>
      </header>
      {open && <div>{children}</div>}
    </section>
  );
}
