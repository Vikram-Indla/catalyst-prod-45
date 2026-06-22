/**
 * ResizeColumnDialog — portal slider for column width (Jira parity, 2026-06-23).
 *
 * Live preview: drag → onPreview fires every change → JiraTable updates
 * columnWidths in real-time. Save commits; Cancel reverts to original.
 */
import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ResizeColumnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  columnLabel: string;
  currentWidth: number;
  minWidth?: number;
  maxWidth?: number;
  onPreview: (next: number) => void;
  onSave: (next: number) => void;
  onCancel: () => void;
}

/**
 * CustomSlider — div-based range input. Native <input type="range"> kept
 * macOS Chrome's white halo ring around the thumb even with -webkit-appearance:
 * none + every reset rule. This implementation has zero UA styling, draws the
 * track + filled portion + thumb as plain divs, and handles drag via mouse
 * events. Track height 6px, thumb 10px round.
 */
function CustomSlider({
  value, min, max, onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const valueFromClientX = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return value;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(min + ratio * (max - min));
  };

  useEffect(() => {
    if (!draggingRef.current) return;
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      onChange(valueFromClientX(e.clientX));
    };
    const onUp = () => {
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  });

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 10 : 1;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(min, value - step)); }
        else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.min(max, value + step)); }
        else if (e.key === 'Home') { e.preventDefault(); onChange(min); }
        else if (e.key === 'End') { e.preventDefault(); onChange(max); }
      }}
      style={{
        position: 'relative',
        width: '100%',
        height: 16,
        outline: 'none',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onMouseDown={(e) => {
        draggingRef.current = true;
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        onChange(valueFromClientX(e.clientX));
      }}
    >
      <div
        ref={trackRef}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          height: 6,
          borderRadius: 3,
          background: 'var(--ds-border, #DFE1E6)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: `${pct}%`,
          height: 6,
          borderRadius: 3,
          background: 'var(--ds-text-subtle, #505258)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: `calc(${pct}% - 8px)`,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: 'var(--ds-text-subtle, #505258)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

export function ResizeColumnDialog({
  isOpen, onClose, triggerRef, columnLabel,
  currentWidth, minWidth = 60, maxWidth = 600,
  onPreview, onSave, onCancel,
}: ResizeColumnDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(currentWidth);
  const originalRef = useRef(currentWidth);
  // 2026-06-23 — anchor position locked at open-time. Resizing the column
  // moves the trigger's bounding rect every tick, which would drag the
  // dialog left/right with the cursor. We snap once and never recompute.
  // Position is the LEFT edge of the column's TH (start of column).
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  // 2026-06-23 — track previous isOpen so we seed width ONLY on false→true.
  // currentWidth changes every onPreview tick (live preview feeds back into
  // the prop), so re-seeding on currentWidth change would snap the slider
  // to the latest preview value mid-drag and feel like it "jumps to max".
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      originalRef.current = currentWidth;
      setWidth(currentWidth);
      const triggerEl = triggerRef.current;
      const th = triggerEl?.closest('th') as HTMLTableCellElement | null;
      const refEl: HTMLElement | null = th ?? triggerEl;
      if (refEl) {
        const rect = refEl.getBoundingClientRect();
        setAnchor({ top: rect.bottom + 4, left: Math.max(8, rect.left) });
      }
    } else if (!isOpen && wasOpenRef.current) {
      setAnchor(null);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, currentWidth, triggerRef]);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (dialogRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      onCancel();
      onPreview(originalRef.current);
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
        onPreview(originalRef.current);
        onClose();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [isOpen, onClose, onCancel, onPreview, triggerRef]);

  if (!isOpen || !anchor) return null;
  const dialogLeft = anchor.left;
  const dialogTop = anchor.top;

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-label={`Column width — ${columnLabel}`}
      style={{
        position: 'fixed',
        top: dialogTop,
        left: dialogLeft,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 6,
        boxShadow: 'var(--ds-shadow-overlay, 0 8px 28px rgba(9,30,66,0.25))',
        padding: 12,
        minWidth: 180,
        zIndex: 9999,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 653,
          color: 'var(--ds-text, #292A2E)',
          marginBottom: 8,
        }}
      >
        Column width - {columnLabel}
      </div>
      <CustomSlider
        value={width}
        min={minWidth}
        max={maxWidth}
        onChange={(next) => { setWidth(next); onPreview(next); }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 4,
          marginTop: 8,
        }}
      >
        <button
          type="button"
          onClick={() => {
            onCancel();
            onPreview(originalRef.current);
            onClose();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--ds-text-subtle, #44546F)',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: 12,
            borderRadius: 3,
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => { onSave(width); onClose(); }}
          style={{
            background: 'var(--ds-background-brand-bold, #0C66E4)',
            border: 'none',
            color: 'var(--ds-text-inverse, #FFFFFF)',
            padding: '4px 12px',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 3,
          }}
        >
          Save
        </button>
      </div>
    </div>,
    document.body,
  );
}
