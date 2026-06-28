/**
 * catalystFlag — canonical small flag toast for Catalyst.
 *
 * API:
 *   catalystFlag.success('Release created')
 *   catalystFlag.error('Something went wrong')
 *
 * Mount <CatalystFlagHost /> once at the app root (App.tsx).
 *
 * Design (Jira-parity):
 *   - White background, black title text
 *   - Success: green circular icon with white check stroke
 *   - Error:   red circular icon with white cross stroke
 *   - Close X at the end, auto-dismiss after `duration` ms (default 4000)
 *   - Bottom-right stack, slide-in animation
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type CatalystFlagType = 'success' | 'error';

export interface CatalystFlagItem {
  id: number;
  type: CatalystFlagType;
  message: string;
  duration: number;
}

type Listener = (items: CatalystFlagItem[]) => void;

let queue: CatalystFlagItem[] = [];
const listeners = new Set<Listener>();
let counter = 0;

function emit() {
  listeners.forEach((l) => l([...queue]));
}

function push(type: CatalystFlagType, message: string, duration = 4000) {
  const item: CatalystFlagItem = { id: ++counter, type, message, duration };
  queue = [...queue, item];
  emit();
}

function dismiss(id: number) {
  queue = queue.filter((q) => q.id !== id);
  emit();
}

export const catalystFlag = {
  success: (message: string, duration?: number) => push('success', message, duration),
  error:   (message: string, duration?: number) => push('error',   message, duration),
};

// ───────────────────────── Host ─────────────────────────

export function CatalystFlagHost() {
  const [items, setItems] = useState<CatalystFlagItem[]>([]);

  useEffect(() => {
    const l: Listener = (next) => setItems(next);
    listeners.add(l);
    l(queue);
    return () => { listeners.delete(l); };
  }, []);

  if (items.length === 0) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: 24,
        bottom: 24,
        zIndex: 100000,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      {items.map((item) => (
        <FlagCard key={item.id} item={item} onClose={() => dismiss(item.id)} />
      ))}
    </div>,
    document.body,
  );
}

// ───────────────────────── Card ─────────────────────────

function FlagCard({ item, onClose }: { item: CatalystFlagItem; onClose: () => void }) {
  const [entered, setEntered] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    // play enter transition next frame
    const r = requestAnimationFrame(() => setEntered(true));
    timer.current = window.setTimeout(onClose, item.duration);
    return () => {
      cancelAnimationFrame(r);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [item.duration, onClose]);

  const isSuccess = item.type === 'success';
  const iconBg = isSuccess
    ? 'var(--ds-background-success-bold, #22A06B)'
    : 'var(--ds-background-danger-bold, #C9372C)';

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minWidth: 280,
        maxWidth: 420,
        padding: '12px 14px',
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        color: 'var(--ds-text, #292A2E)',
        borderRadius: 6,
        boxShadow: '0 8px 24px rgba(9,30,66,0.18), 0 2px 6px rgba(9,30,66,0.10)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        opacity: entered ? 1 : 0,
        transform: entered ? 'translateX(0)' : 'translateX(-16px)',
        transition: 'opacity 160ms ease, transform 160ms ease',
        fontSize: 14,
        fontFamily: 'inherit',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: iconBg,
          flexShrink: 0,
        }}
      >
        {isSuccess ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="var(--ds-text-inverse, #FFFFFF)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M6 6l12 12M18 6L6 18" stroke="var(--ds-text-inverse, #FFFFFF)" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        )}
      </span>
      <span style={{ flex: 1, lineHeight: 1.35, color: 'var(--ds-text, #292A2E)', fontWeight: 500 }}>
        {item.message}
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          borderRadius: 3,
          color: 'var(--ds-text-subtle, #6B778C)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, var(--ds-background-neutral, #F1F2F4))';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
