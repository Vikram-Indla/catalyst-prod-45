import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface RemindMeSubmenuProps {
  anchorRect: DOMRect | null;
  onPick: (whenIso: string) => void;
  onCustom: () => void;
  onClose: () => void;
}

interface QuickOption {
  label: string;
  detail: string;
  minutesFromNow: number;
}

function buildQuickOptions(now: Date = new Date()): QuickOption[] {
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const fmtDay = (d: Date) =>
    d.toLocaleDateString([], { weekday: 'long' });

  const in20 = new Date(now.getTime() + 20 * 60_000);
  const in1h = new Date(now.getTime() + 60 * 60_000);
  const in3h = new Date(now.getTime() + 3 * 60 * 60_000);
  const tomorrow9 = new Date(now);
  tomorrow9.setDate(tomorrow9.getDate() + 1);
  tomorrow9.setHours(9, 0, 0, 0);
  const nextWeek9 = new Date(now);
  nextWeek9.setDate(nextWeek9.getDate() + 7);
  nextWeek9.setHours(9, 0, 0, 0);

  return [
    { label: 'In 20 minutes', detail: fmtTime(in20), minutesFromNow: 20 },
    { label: 'In 1 hour', detail: fmtTime(in1h), minutesFromNow: 60 },
    { label: 'In 3 hours', detail: fmtTime(in3h), minutesFromNow: 180 },
    {
      label: 'Tomorrow',
      detail: `${fmtDay(tomorrow9)} at ${fmtTime(tomorrow9)}`,
      minutesFromNow: Math.round((tomorrow9.getTime() - now.getTime()) / 60_000),
    },
    {
      label: 'Next week',
      detail: `${fmtDay(nextWeek9)} at ${fmtTime(nextWeek9)}`,
      minutesFromNow: Math.round((nextWeek9.getTime() - now.getTime()) / 60_000),
    },
  ];
}

export function RemindMeSubmenu({ anchorRect, onPick, onCustom, onClose }: RemindMeSubmenuProps) {
  const popRef = useRef<HTMLDivElement>(null);
  const options = buildQuickOptions();

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (popRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  if (!anchorRect) return null;
  const top = Math.max(12, anchorRect.top);
  const vw = window.innerWidth;
  const SUB_W = 240;
  let left = anchorRect.left - SUB_W - 4;
  if (left < 12) left = Math.min(vw - SUB_W - 12, anchorRect.right + 4);

  return (
    <>
      {createPortal(
        <div
          ref={popRef}
          role="menu"
          data-cv2-submenu-of="activity-more"
          style={{
            position: 'fixed',
            top, left, width: SUB_W,
            background: 'var(--cv2-bg-modal)',
            border: '1px solid var(--cv2-border-strong)',
            borderRadius: 'var(--cv2-radius-md)',
            boxShadow: 'var(--cv2-shadow-modal)',
            padding: '4px 0',
            fontFamily: 'var(--cv2-font)',
            color: 'var(--cv2-text)',
            zIndex: 'var(--cv2-tooltip-z, 1200)' as any,
          }}
        >
          {options.map(opt => (
            <SubItem
              key={opt.label}
              label={opt.label}
              detail={opt.detail}
              onClick={() => {
                const iso = new Date(Date.now() + opt.minutesFromNow * 60_000).toISOString();
                onPick(iso);
              }}
            />
          ))}
          <div aria-hidden="true" style={{ height: 1, margin: '4px 0', background: 'var(--cv2-divider)' }} />
          <SubItem
            label="Custom..."
            detail=""
            onClick={onCustom}
          />
        </div>,
        document.body,
      )}
    </>
  );
}

function SubItem({
  label,
  detail,
  onClick,
}: {
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        width: '100%',
        height: 32,
        padding: '0 14px',
        background: 'transparent',
        color: 'var(--cv2-text)',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        fontSize: 'var(--ds-font-size-300)',
      }}
    >
      <span>{label}</span>
      {detail && (
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--cv2-text-muted)' }}>{detail}</span>
      )}
    </button>
  );
}
