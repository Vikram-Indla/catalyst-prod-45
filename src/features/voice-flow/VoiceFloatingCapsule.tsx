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
  /** Real-time mic analyser — drives bar heights from amplitude data */
  analyserNode?: AnalyserNode | null;
  /** Partial streaming text during processing state */
  partialText?: string | null;
}

interface Pos { top: number; left: number }

const CAPSULE_STYLE_ID = 'vf-capsule-styles-v6';
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
      gap: 4px;
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
      background: rgba(16, 20, 36, 0.82); // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
      border: 1px solid var(--ds-surface, rgba(255, 255, 255, 0.18));
      box-shadow: inset 0 0 0 1px var(--ds-surface, rgba(255, 255, 255, 0.06)), 0 4px 24px var(--ds-shadow-raised, rgba(0, 0, 0, 0.28));
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 999px;
      padding: 0 12px;
      height: 40px;
      min-width: 200px;
      max-width: min(480px, calc(100vw - 32px));
    }
    .vf-capsule__row--review {
      background: rgba(40, 20, 0, 0.85); // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
      border-color: rgba(247, 144, 9, 0.5); // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
    }
    .vf-capsule--entering .vf-capsule__row {
      animation: vf-slide-in 150ms ease forwards;
    }
    @keyframes vf-slide-in {
      from { opacity: 0; transform: translateY(-4px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)   scale(1); }
    }

    /* Waveform bars — magenta; JS drives heights when analyser available, else CSS anim */
    .vf-bars {
      display: flex;
      align-items: center;
      gap: 0px;
      height: 18px;
      flex-shrink: 0;
    }
    .vf-bar {
      width: 2px;
      border-radius: 2px;
      background: #E040FB; // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
      height: 5px;
      transition: height 80ms ease;
    }
    /* CSS fallback — only active via class when no analyser drives bars */
    .vf-bars--css-anim .vf-bar {
      animation: vf-bounce 0.8s ease-in-out infinite;
    }
    .vf-bars--css-anim .vf-bar:nth-child(1) { animation-delay: 0ms;   height: 5px; }
    .vf-bars--css-anim .vf-bar:nth-child(2) { animation-delay: 100ms; height: 12px; }
    .vf-bars--css-anim .vf-bar:nth-child(3) { animation-delay: 200ms; height: 18px; }
    .vf-bars--css-anim .vf-bar:nth-child(4) { animation-delay: 100ms; height: 12px; }
    .vf-bars--css-anim .vf-bar:nth-child(5) { animation-delay: 0ms;   height: 5px; }
    @keyframes vf-bounce {
      0%, 100% { transform: scaleY(0.3); }
      50%       { transform: scaleY(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      .vf-bar { animation: vf-pulse 1.5s ease infinite !important; }
      @keyframes vf-pulse {
        0%, 100% { opacity: 0.4; }
        50%       { opacity: 1; }
      }
    }

    /* Spinner for processing */
    .vf-spinner {
      width: 14px; height: 14px;
      border: 2px solid var(--ds-surface, rgba(255,255,255,0.2));
      border-top-color: var(--ds-surface, rgba(255,255,255,0.8));
      border-radius: 50%;
      animation: vf-spin 0.7s linear infinite;
      flex-shrink: 0;
    }
    @keyframes vf-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .vf-spinner { animation: none; opacity: 0.6; } }

    /* Warning icon for review state */
    .vf-icon--warn {
      font-size: 14px;
      flex-shrink: 0;
    }

    /* Text */
    .vf-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--ds-surface, rgba(255,255,255,0.88));
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 260px;
      flex: 1;
    }
    .vf-label--muted {
      color: var(--ds-surface, rgba(255,255,255,0.88));
      font-weight: 400;
    }
    .vf-label--result {
      color: var(--ds-surface, rgba(255,255,255,0.88));
      font-weight: 400;
    }
    .vf-label--partial {
      color: var(--ds-surface, rgba(255,255,255,0.55));
      font-weight: 400;
      font-style: italic;
    }
    .vf-label--error {
      color: #F87168; // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
    }
    .vf-label--review {
      color: #F79009; // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
      font-weight: 500;
    }

    /* Muted timer — no glow, no magenta */
    .vf-timer {
      font-size: 12px;
      font-weight: 400;
      color: var(--ds-surface, rgba(255,255,255,0.4));
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.02em;
      flex-shrink: 0;
    }

    /* Language detection badge */
    .vf-lang-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(206, 147, 216, 0.12); // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
      border: 1px solid rgba(206, 147, 216, 0.25); // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
      border-radius: 999px;
      padding: 0px 10px;
      font-size: 11px;
      font-weight: 500;
      color: #CE93D8; // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
      animation: vf-fade-in 250ms ease forwards;
      align-self: flex-start;
      margin-left: 12px;
    }
    /* Hotkey hint badge (listening state, no lang yet) */
    .vf-hint-badge {
      display: inline-flex;
      align-items: center;
      background: var(--ds-surface, rgba(255,255,255,0.06));
      border: 1px solid var(--ds-surface, rgba(255,255,255,0.12));
      border-radius: 999px;
      padding: 0px 8px;
      font-size: 10px;
      font-weight: 500;
      color: var(--ds-surface, rgba(255,255,255,0.35));
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
      background: var(--ds-surface, rgba(255,255,255,0.12));
      color: var(--ds-surface, rgba(255,255,255,0.7));
    }
    .vf-btn--cancel:hover { background: var(--ds-surface, rgba(255,255,255,0.22)); }
    .vf-btn--commit {
      background: var(--ds-link);
      color: var(--ds-text-inverse);
    }
    .vf-btn--commit:hover { background: var(--ds-link); }
    .vf-btn--commit-review {
      background: #F79009; // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
      color: var(--ds-text-inverse);
    }
    .vf-btn--commit-review:hover { background: var(--ds-background-warning-bold); }
  `;
  document.head.appendChild(s);
}

// ─── WaveformBars ────────────────────────────────────────────────────────────

interface WaveformBarsProps {
  analyserNode?: AnalyserNode | null;
}

function WaveformBars({ analyserNode }: WaveformBarsProps) {
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!analyserNode) return;

    const data = new Uint8Array(analyserNode.frequencyBinCount); // 16 bins for fftSize=32
    const NUM_BARS = 5;
    const bucketSize = Math.max(1, Math.floor(data.length / NUM_BARS));
    const MIN_H = 3;
    const MAX_H = 18;
    let rafId: number;

    const tick = () => {
      analyserNode.getByteFrequencyData(data);
      barRefs.current.forEach((bar, i) => {
        if (!bar) return;
        const start = i * bucketSize;
        const end   = Math.min(start + bucketSize, data.length);
        let sum = 0;
        for (let j = start; j < end; j++) sum += data[j];
        const avg = sum / (end - start);
        const h = MIN_H + (avg / 255) * (MAX_H - MIN_H);
        bar.style.height = `${h}px`;
      });
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [analyserNode]);

  const hasCssAnim = !analyserNode;

  return (
    <div className={`vf-bars${hasCssAnim ? ' vf-bars--css-anim' : ''}`} aria-hidden="true">
      {[0, 1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="vf-bar"
          ref={el => { barRefs.current[i] = el; }}
        />
      ))}
    </div>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner() {
  return <div className="vf-spinner" aria-hidden="true" />;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMs(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── VoiceFloatingCapsule ─────────────────────────────────────────────────────

export function VoiceFloatingCapsule({
  status,
  anchorElement,
  resultText,
  errorMessage,
  onCommit,
  onCancel,
  remainingMs,
  detectedLanguage,
  analyserNode,
  partialText,
}: Props) {
  const [pos, setPos] = useState<Pos | null>(null);
  const posRef = useRef<Pos | null>(null);

  useEffect(() => {
    if (!anchorElement || !anchorElement.isConnected) {
      posRef.current = null;
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

  const isReview = status === 'review';

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
            <WaveformBars analyserNode={analyserNode} />
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
            {partialText ? (
              <span className="vf-label vf-label--partial" title={partialText}>
                {partialText}
              </span>
            ) : (
              <span className="vf-label vf-label--muted">Transcribing…</span>
            )}
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

      case 'review':
        return (
          <>
            <span className="vf-icon--warn" aria-hidden="true">⚠</span>
            <span className="vf-label vf-label--review" title={resultText ?? ''}>
              {resultText ?? 'Low confidence — review before inserting'}
            </span>
            <button className="vf-btn vf-btn--cancel" onClick={onCancel} aria-label="Discard">✕</button>
            <button className="vf-btn vf-btn--commit-review" onClick={onCommit} aria-label="Insert anyway">✓</button>
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
      <div className={`vf-capsule__row${isReview ? ' vf-capsule__row--review' : ''}`}>
        {content}
      </div>
      {detectedLanguage && (
        <div className="vf-lang-badge" aria-label={`Detected language: ${detectedLanguage}`}>
          {detectedLanguage}
        </div>
      )}
      {status === 'listening' && !detectedLanguage && (
        <div className="vf-hint-badge" aria-hidden="true">
          ⌘⇧V or double-space
        </div>
      )}
    </div>,
    document.body,
  );
}
