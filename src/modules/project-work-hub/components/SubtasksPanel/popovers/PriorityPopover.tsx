/**
 * PriorityPopover — createPortal-based priority picker (fixed-position dropdown).
 * Replaced @atlaskit/popup 2026-05-05 — same click-outside race fix as StatusPopover.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import { PriorityIndicator, normalisePriority } from '@/components/shared/PriorityIndicator';
import { Check } from '@/lib/atlaskit-icons';

interface PriorityPopoverProps {
  priority: string;
  onChange: (priority: 'Critical' | 'High' | 'Medium' | 'Low') => void;
  children: React.ReactNode;
  /** When false, no "current value" check mark is rendered — use in bulk-edit contexts. */
  showActive?: boolean;
}

const OPTIONS: Array<{ value: 'Critical' | 'High' | 'Medium' | 'Low' }> = [
  { value: 'Critical' },
  { value: 'High' },
  { value: 'Medium' },
  { value: 'Low' },
];

export function PriorityPopover({ priority, onChange, children, showActive = true }: PriorityPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const current = normalisePriority(priority);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      const pop = document.querySelector('[data-sp-priority-popover]');
      if (pop?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [isOpen]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!triggerRef.current) return;
    if (isOpen) { setIsOpen(false); return; }
    const r = triggerRef.current.getBoundingClientRect();
    setAnchor({ top: r.bottom + 4, left: r.left });
    setIsOpen(true);
  };

  return (
    <>
      <span ref={triggerRef} onClick={toggle} style={{ display: 'inline-flex', cursor: 'pointer' }}>
        {children}
      </span>

      {isOpen && anchor && typeof document !== 'undefined' &&
        createPortal(
          <div
            data-sp-priority-popover
            role="menu"
            style={{
              position: 'fixed',
              top: anchor.top,
              left: anchor.left,
              width: 180,
              background: token('elevation.surface.overlay', 'var(--ds-surface)'),
              border: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral))')}`,
              borderRadius: 6,
              boxShadow: '0 8px 24px var(--ds-shadow-raised)',
              padding: 4,
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {OPTIONS.map(({ value }) => {
              const active = showActive && normalisePriority(value) === current;
              return (
                <button
                  key={value}
                  type="button"
                  role="menuitem"
                  style={{
                    display: 'flex', alignItems: 'center', width: '100%',
                    height: 36, padding: '0 10px', gap: 8,
                    background: active ? token('color.background.selected', 'var(--ds-background-information)') : 'transparent',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle, var(--ds-background-neutral-subtle))'); }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                  onClick={() => { onChange(value); setIsOpen(false); }}
                >
                  <PriorityIndicator priority={value} showLabel fontSize={'var(--ds-font-size-300)'} />
                  {active && <Check size={14} color="var(--cp-primary-60)" style={{ marginLeft: 'auto' }} />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
