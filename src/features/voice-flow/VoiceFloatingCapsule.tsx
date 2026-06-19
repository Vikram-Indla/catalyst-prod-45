import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { VoiceStatus } from './voiceFlow.types';

interface Props {
  status: VoiceStatus;
  anchorElement: HTMLElement | null;
  resultText: string | null;
  errorMessage: string | null;
  onCommit: () => void;
  onCancel: () => void;
}

interface Pos { top: number; left: number }

const CAPSULE_STYLE_ID = 'vf-capsule-styles-v1';
if (typeof document !== 'undefined' && !document.getElementById(CAPSULE_STYLE_ID)) {
  const s = document.createElement('style');
  s.id = CAPSULE_STYLE_ID;
  s.textContent = `
    .vf-capsule {
      position: fixed;
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--ds-surface-overlay, #1C2B41);
      border: 1px solid var(--ds-border-inverse, rgba(255,255,255,0.12));
      border-radius: 999px;
      padding: 0 12px;
      height: 44px;
      box-shadow: 0 8px 32px rgba(9,30,66,0.32), 0 2px 8px rgba(9,30,66,0.16);
      min-width: 200px;
      max-width: min(480px, calc(100vw - 32px));
      font-family: var(--ds-font-family-body, 'Atlassian Sans', ui-sans-serif, system-ui);
      pointer-events: all;
      transition: opacity 150ms ease, transform 150ms ease;
    }
    .vf-capsule--entering {
      animation: vf-slide-in 150ms ease forwards;
    }
    @keyframes vf-slide-in {
      from { opacity: 0; transform: translateY(-4px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)   scale(1); }
    }

    /* Waveform bars */
    .vf-bars {
      display: flex;
      align-items: center;
      gap: 2px;
      height: 20px;
    }
    .vf-bar {
      width: 3px;
      border-radius: 2px;
      background: var(--ds-text-inverse, #FFFFFF);
      animation: vf-bounce 0.8s ease-in-out infinite;
    }
    .vf-bar:nth-child(1) { animation-delay: 0ms;   height: 6px; }
    .vf-bar:nth-child(2) { animation-delay: 100ms; height: 14px; }
    .vf-bar:nth-child(3) { animation-delay: 200ms; height: 20px; }
    .vf-bar:nth-child(4) { animation-delay: 100ms; height: 14px; }
    .vf-bar:nth-child(5) { animation-delay: 0ms;   height: 6px; }

    @keyframes vf-bounce {
      0%, 100% { transform: scaleY(0.3); }
      50%       { transform: scaleY(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      .vf-bar { animation: vf-pulse 1.5s ease infinite; }
      @keyframes vf-pulse {
        0%, 100% { opacity: 0.4; }
        50%       { opacity: 1; }
      }
    }

    /* Spinner for processing */
    .vf-spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.25);
      border-top-color: rgba(255,255,255,0.9);
      border-radius: 50%;
      animation: vf-spin 0.7s linear infinite;
    }
    @keyframes vf-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .vf-spinner { animation: none; opacity: 0.7; } }

    /* Text */
    .vf-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--ds-text-inverse, #FFFFFF);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 260px;
      flex: 1;
    }
    .vf-label--muted {
      opacity: 0.65;
      font-weight: 400;
    }
    .vf-label--result {
      color: var(--ds-text-inverse, #FFFFFF);
      font-weight: 400;
    }
    .vf-label--error {
      color: var(--ds-text-danger, #F87168);
    }

    /* Icon buttons */
    .vf-btn {
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      font-size: 14px;
      flex-shrink: 0;
      transition: background 100ms;
    }
    .vf-btn--cancel {
      background: rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.75);
    }
    .vf-btn--cancel:hover { background: rgba(255,255,255,0.2); }
    .vf-btn--commit {
      background: #0C66E4;
      color: #FFFFFF;
    }
    .vf-btn--commit:hover { background: #0055CC; }

    /* Dark mode override — capsule is always dark-ish regardless of app theme */
    [data-color-mode="light"] .vf-capsule {
      background: #1C2B41;
      border-color: rgba(255,255,255,0.08);
    }
  `;
  document.head.appendChild(s);
}

function WaveformBars() {
  return (
    <div className="vf-bars" aria-hidden="true">
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="vf-bar" />
      ))}
    </div>
  );
}

function Spinner() {
  return <div className="vf-spinner" aria-hidden="true" />;
}

export function VoiceFloatingCapsule({
  status,
  anchorElement,
  resultText,
  errorMessage,
  onCommit,
  onCancel,
}: Props) {
  const [pos, setPos] = useState<Pos | null>(null);
  const posRef = useRef<Pos | null>(null);

  // Recompute position whenever anchor or status changes
  useEffect(() => {
    if (!anchorElement || !anchorElement.isConnected) {
      setPos(null);
      return;
    }
    const compute = () => {
      const rect = anchorElement.getBoundingClientRect();
      const MARGIN = 8;
      const CAPSULE_H = 52;
      let top = rect.bottom + MARGIN;
      // Flip above if not enough space below
      if (top + CAPSULE_H > window.innerHeight - 16) {
        top = rect.top - CAPSULE_H - MARGIN;
      }
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - 216));
      const next = { top, left };
      if (posRef.current?.top !== next.top || posRef.current?.left !== next.left) {
        posRef.current = next;
        setPos(next);
      }
    };

    compute();
    window.addEventListener('resize', compute, { passive: true });
    window.addEventListener('scroll', compute, { passive: true, capture: true });
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [anchorElement, status]);

  if (!pos || status === 'idle' || status === 'cancelled' || status === 'committing') return null;

  const content = (() => {
    switch (status) {
      case 'arming':
        return (
          <>
            <Spinner />
            <span className="vf-label vf-label--muted">Requesting mic…</span>
            <button className="vf-btn vf-btn--cancel" onClick={onCancel} aria-label="Cancel">✕</button>
          </>
        );
      case 'listening':
        return (
          <>
            <WaveformBars />
            <span className="vf-label vf-label--muted">Listening… (Space to finish)</span>
            <button className="vf-btn vf-btn--cancel" onClick={onCancel} aria-label="Cancel voice">✕</button>
          </>
        );
      case 'processing':
        return (
          <>
            <Spinner />
            <span className="vf-label vf-label--muted">Translating…</span>
            <button className="vf-btn vf-btn--cancel" onClick={onCancel} aria-label="Cancel">✕</button>
          </>
        );
      case 'ready':
        return (
          <>
            <span className="vf-label vf-label--result" title={resultText ?? ''}>
              {resultText ?? '…'}
            </span>
            <button className="vf-btn vf-btn--cancel" onClick={onCancel} aria-label="Discard">✕</button>
            <button className="vf-btn vf-btn--commit" onClick={onCommit} aria-label="Insert text">✓</button>
          </>
        );
      case 'error':
        return (
          <>
            <span className="vf-label vf-label--error" title={errorMessage ?? ''}>
              {errorMessage ?? 'Voice error'}
            </span>
            <button className="vf-btn vf-btn--cancel" onClick={onCancel} aria-label="Dismiss">✕</button>
          </>
        );
      default:
        return null;
    }
  })();

  if (!content) return null;

  return createPortal(
    <div
      role="dialog"
      aria-label="Voice dictation"
      aria-live="polite"
      className="vf-capsule vf-capsule--entering"
      style={{ top: pos.top, left: pos.left }}
    >
      {content}
    </div>,
    document.body,
  );
}
