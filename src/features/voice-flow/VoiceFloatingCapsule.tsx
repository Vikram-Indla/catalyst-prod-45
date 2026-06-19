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
  remainingMs?: number;
  detectedLanguage?: string | null;
}

interface Pos { top: number; left: number }

const CAPSULE_STYLE_ID = 'vf-capsule-styles-v2';
if (typeof document !== 'undefined' && !document.getElementById(CAPSULE_STYLE_ID)) {
  const s = document.createElement('style');
  s.id = CAPSULE_STYLE_ID;
  s.textContent = `
    .vf-capsule {
      position: fixed;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
      background: transparent;
      border-radius: 12px;
      padding: 0;
      font-family: var(--ds-font-family-body, 'Atlassian Sans', ui-sans-serif, system-ui);
      pointer-events: all;
    }
    .vf-capsule__row {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(18, 28, 45, 0.72);
      border-radius: 999px;
      padding: 0 12px;
      height: 40px;
      min-width: 200px;
      max-width: min(480px, calc(100vw - 32px));
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .vf-capsule--entering .vf-capsule__row {
      animation: vf-slide-in 150ms ease forwards;
    }
    @keyframes vf-slide-in {
      from { opacity: 0; transform: translateY(-4px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)   scale(1); }
    }

    /* Waveform bars — thin magenta */
    .vf-bars {
      display: flex;
      align-items: center;
      gap: 2px;
      height: 18px;
    }
    .vf-bar {
      width: 2px;
      border-radius: 2px;
      background: #E040FB;
      animation: vf-bounce 0.8s ease-in-out infinite;
    }
    .vf-bar:nth-child(1) { animation-delay: 0ms;   height: 5px; }
    .vf-bar:nth-child(2) { animation-delay: 100ms; height: 12px; }
    .vf-bar:nth-child(3) { animation-delay: 200ms; height: 18px; }
    .vf-bar:nth-child(4) { animation-delay: 100ms; height: 12px; }
    .vf-bar:nth-child(5) { animation-delay: 0ms;   height: 5px; }

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
      width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,0.2);
      border-top-color: rgba(255,255,255,0.8);
      border-radius: 50%;
      animation: vf-spin 0.7s linear infinite;
      flex-shrink: 0;
    }
    @keyframes vf-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .vf-spinner { animation: none; opacity: 0.6; } }

    /* Text */
    .vf-label {
      font-size: 13px;
      font-weight: 500;
      color: rgba(255,255,255,0.92);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 260px;
      flex: 1;
    }
    .vf-label--muted {
      color: rgba(255,255,255,0.65);
      font-weight: 400;
    }
    .vf-label--result {
      color: rgba(255,255,255,0.92);
      font-weight: 400;
    }
    .vf-label--error {
      color: #F87168;
    }

    /* Muted timer — no glow, no magenta */
    .vf-timer {
      font-size: 12px;
      font-weight: 400;
      color: rgba(255,255,255,0.4);
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.02em;
      flex-shrink: 0;
    }

    /* Language detection badge */
    .vf-lang-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(206, 147, 216, 0.12);
      border: 1px solid rgba(206, 147, 216, 0.25);
      border-radius: 999px;
      padding: 2px 10px;
      font-size: 11px;
      font-weight: 500;
      color: #CE93D8;
      animation: vf-fade-in 250ms ease forwards;
      align-self: flex-start;
      margin-left: 12px;
    }
    @keyframes vf-fade-in {
      from { opacity: 0; transform: translateY(-2px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Icon buttons */
    .vf-btn {
      display: flex; align-items: center; justify-content: center;
      width: 24px; height: 24px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      font-size: 12px;
      flex-shrink: 0;
      transition: background 100ms;
    }
    .vf-btn--cancel {
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.65);
    }
    .vf-btn--cancel:hover { background: rgba(255,255,255,0.16); }
    .vf-btn--commit {
      background: #0C66E4;
      color: #FFFFFF;
    }
    .vf-btn--commit:hover { background: #0055CC; }
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

function formatMs(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function VoiceFloatingCapsule({
  status,
  anchorElement,
  resultText,
  errorMessage,
  onCommit,
  onCancel,
  remainingMs,
  detectedLanguage,
}: Props) {
  const [pos, setPos] = useState<Pos | null>(null);
  const posRef = useRef<Pos | null>(null);

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
            {remainingMs !== undefined && (
              <span className="vf-timer" aria-label={`${formatMs(remainingMs)} remaining`}>
                {formatMs(remainingMs)}
              </span>
            )}
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
      <div className="vf-capsule__row">
        {content}
      </div>
      {detectedLanguage && (
        <div className="vf-lang-badge" aria-label={`Detected language: ${detectedLanguage}`}>
          {detectedLanguage}
        </div>
      )}
    </div>,
    document.body,
  );
}
