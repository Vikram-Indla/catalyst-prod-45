import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '../shared/Icon';

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
          gap: 6,
          padding: '8px 8px 8px 12px',
          color: 'var(--cv2-text-subtle)',
          fontFamily: 'var(--cv2-font)',
          fontSize: 13,
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
          {open ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
        </button>
        <span style={{ flex: 1 }}>{title}</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
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
