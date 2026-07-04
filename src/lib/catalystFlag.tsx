/**
 * catalystFlag — canonical small flag toast for Catalyst.
 *
 * API:
 *   catalystFlag.success('Release created')                    // legacy — single message
 *   catalystFlag.error('Something went wrong')
 *   catalystFlag.info({ title, description })                  // 2-line info flag (purple icon)
 *   catalystFlag.success({ title, description, action })       // 2-line with optional link action
 *
 * Mount <CatalystFlagHost /> once at the app root (App.tsx).
 *
 * Design (Jira-parity):
 *   - White background, black title text
 *   - Success: green circular icon with white check stroke
 *   - Error:   red circular icon with white cross stroke
 *   - Info:    purple/discovery circular icon with white "i" glyph
 *   - Optional description line under the title (2-line flag)
 *   - Optional link action rendered under the body (opens new tab / runs cb)
 *   - Close X at the end, auto-dismiss after `duration` ms (default 4000)
 *   - Bottom-left stack, slide-in animation
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type CatalystFlagType = 'success' | 'error' | 'info';

export interface CatalystFlagAction {
  label: string;
  onClick: () => void;
}

export interface CatalystFlagContent {
  title: string;
  description?: string;
  action?: CatalystFlagAction;
}

export interface CatalystFlagItem {
  id: number;
  type: CatalystFlagType;
  content: CatalystFlagContent;
  duration: number;
}

type Listener = (items: CatalystFlagItem[]) => void;

let queue: CatalystFlagItem[] = [];
const listeners = new Set<Listener>();
let counter = 0;

function emit() {
  listeners.forEach((l) => l([...queue]));
}

function normalizeContent(input: string | CatalystFlagContent): CatalystFlagContent {
  return typeof input === 'string' ? { title: input } : input;
}

function push(type: CatalystFlagType, input: string | CatalystFlagContent, duration = 4000) {
  const item: CatalystFlagItem = {
    id: ++counter,
    type,
    content: normalizeContent(input),
    duration,
  };
  queue = [...queue, item];
  emit();
  return item.id;
}

function dismiss(id: number) {
  queue = queue.filter((q) => q.id !== id);
  emit();
}

export const catalystFlag = {
  success: (input: string | CatalystFlagContent, duration?: number) => push('success', input, duration),
  error:   (input: string | CatalystFlagContent, duration?: number) => push('error',   input, duration),
  info:    (input: string | CatalystFlagContent, duration?: number) => push('info',    input, duration),
  dismiss,
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
        gap: 8,
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
    const r = requestAnimationFrame(() => setEntered(true));
    timer.current = window.setTimeout(onClose, item.duration);
    return () => {
      cancelAnimationFrame(r);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [item.duration, onClose]);

  const iconBg =
    item.type === 'success' ? 'var(--ds-background-success-bold)'
    : item.type === 'error' ? 'var(--ds-background-danger-bold)'
    : 'var(--ds-background-discovery-bold)';

  const { title, description, action } = item.content;
  const isTwoLine = !!description || !!action;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        minWidth: 280,
        maxWidth: 420,
        padding: '12px 14px',
        background: 'var(--ds-surface-overlay)',
        color: 'var(--ds-text)',
        borderRadius: 6,
        boxShadow: 'var(--ds-shadow-overlay)',
        border: '1px solid var(--ds-border)',
        opacity: entered ? 1 : 0,
        transform: entered ? 'translateX(0)' : 'translateX(-16px)',
        transition: 'opacity 160ms ease, transform 160ms ease',
        fontSize: 'var(--ds-font-size-400)',
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
          marginTop: isTwoLine ? 2 : 0,
        }}
      >
        {item.type === 'success' && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="var(--ds-text-inverse)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {item.type === 'error' && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M6 6l12 12M18 6L6 18" stroke="var(--ds-text-inverse)" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        )}
        {item.type === 'info' && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="7.5" r="1.4" fill="var(--ds-text-inverse)" />
            <path d="M12 11v7" stroke="var(--ds-text-inverse)" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        )}
      </span>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <span style={{ lineHeight: 1.35, color: 'var(--ds-text)', fontWeight: 600 }}>
          {title}
        </span>
        {description && (
          <span style={{ lineHeight: 1.35, color: 'var(--ds-text)', fontWeight: 400 }}>
            {description}
          </span>
        )}
        {action && (
          <button
            type="button"
            onClick={() => { action.onClick(); onClose(); }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
            style={{
              alignSelf: 'flex-start',
              background: 'none',
              border: 'none',
              padding: '2px 0 0 0',
              cursor: 'pointer',
              color: 'var(--ds-link)',
              fontSize: 'var(--ds-font-size-200)',
              fontWeight: 500,
              lineHeight: 1.35,
              textAlign: 'left',
            }}
          >
            {action.label}
          </button>
        )}
      </div>

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
          color: 'var(--ds-text-subtle)',
          marginTop: isTwoLine ? 2 : 0,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, var(--ds-background-neutral))';
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
