/**
 * SnoozeSubmenu — Later-row 🕐 clock submenu.
 * Slack labels: 30 mins · 1 hour · 3 hours · Tomorrow at 9 AM · Monday at 9 AM · Custom… · Clear due date.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ReminderModal } from '../Activity/ReminderModal';

interface SnoozeSubmenuProps {
  anchorRect: DOMRect | null;
  /** Pass null to clear the reminder; ISO string to set/snooze. */
  onPick: (remindAtIso: string | null) => void;
  onClose: () => void;
}

interface QuickOption {
  label: string;
  detail?: string;
  minutesFromNow?: number;
  resolveAt?: () => Date;
}

function buildOptions(now: Date = new Date()): QuickOption[] {
  const tomorrow9 = new Date(now);
  tomorrow9.setDate(tomorrow9.getDate() + 1);
  tomorrow9.setHours(9, 0, 0, 0);

  const nextMonday9 = new Date(now);
  const daysToMonday = (1 + 7 - nextMonday9.getDay()) % 7 || 7;
  nextMonday9.setDate(nextMonday9.getDate() + daysToMonday);
  nextMonday9.setHours(9, 0, 0, 0);

  return [
    { label: '30 mins', minutesFromNow: 30 },
    { label: '1 hour', minutesFromNow: 60 },
    { label: '3 hours', minutesFromNow: 180 },
    { label: 'Tomorrow at 9:00 AM', resolveAt: () => tomorrow9 },
    { label: 'Monday at 9:00 AM', resolveAt: () => nextMonday9 },
  ];
}

export function SnoozeSubmenu({ anchorRect, onPick, onClose }: SnoozeSubmenuProps) {
  const popRef = useRef<HTMLDivElement>(null);
  const [showCustom, setShowCustom] = useState(false);
  const options = buildOptions();

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (popRef.current?.contains(t)) return;
      if (t.closest('[data-cv2-reminder-modal]')) return;
      if (showCustom) return;
      onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose, showCustom]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  if (!anchorRect) return null;
  const SUB_W = 240;
  const vw = window.innerWidth;
  let left = anchorRect.left - 16;
  if (left + SUB_W > vw - 12) left = vw - SUB_W - 12;
  if (left < 12) left = 12;
  const top = Math.min(window.innerHeight - 320, anchorRect.bottom + 4);

  return (
    <>
      {!showCustom && createPortal(
        <div
          ref={popRef}
          role="menu"
          aria-label="Snooze"
          style={{
            position: 'fixed',
            top, left, width: SUB_W,
            background: 'var(--cv2-bg-modal)',
            border: '1px solid var(--cv2-border-strong)',
            borderRadius: 'var(--cv2-radius-md)',
            boxShadow: 'var(--cv2-shadow-modal)',
            padding: '6px 0',
            fontFamily: 'var(--cv2-font)',
            color: 'var(--cv2-text)',
            zIndex: 'var(--cv2-tooltip-z, 1200)' as any,
          }}
        >
          <div
            style={{
              padding: '6px 16px',
              fontSize: 'var(--ds-font-size-200)',
              color: 'var(--cv2-text-muted)',
              textTransform: 'none',
            }}
          >
            Snooze…
          </div>
          {options.map(opt => (
            <SubItem
              key={opt.label}
              label={opt.label}
              detail={opt.detail}
              onClick={() => {
                const at = opt.resolveAt
                  ? opt.resolveAt()
                  : new Date(Date.now() + (opt.minutesFromNow ?? 0) * 60_000);
                onPick(at.toISOString());
              }}
            />
          ))}
          <SubItem label="Custom…" onClick={() => setShowCustom(true)} />
          <div aria-hidden="true" style={{ height: 1, margin: '4px 0', background: 'var(--cv2-divider)' }} />
          <SubItem
            label="Clear due date"
            onClick={() => onPick(null)}
          />
        </div>,
        document.body,
      )}
      {showCustom && (
        <ReminderModal
          onCancel={() => { setShowCustom(false); onClose(); }}
          onSave={iso => { setShowCustom(false); onPick(iso); }}
        />
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
  detail?: string;
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
        height: 34,
        padding: '0 16px',
        background: 'transparent',
        color: 'var(--cv2-text)',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        fontSize: 'var(--ds-font-size-400)',
      }}
    >
      <span>{label}</span>
      {detail && (
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--cv2-text-muted)' }}>{detail}</span>
      )}
    </button>
  );
}
