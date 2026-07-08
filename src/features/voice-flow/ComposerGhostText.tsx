/**
 * ComposerGhostText — live transcript rendered INSIDE the dictation target
 * (CAT-VOICE-UX-PREMIUM-20260708-001 S3b).
 *
 * Replaces the detached capsule caption panel: words appear where they will
 * land. Ghost text is an overlay — it is never written into the field's
 * value/document until commit, so the undo stack, ProseMirror state, and
 * cancel-restore all stay untouched (Plan Lock D4).
 *
 * Stable words render solid-ish (they will not change); the provisional tail
 * renders subtler — the grey-provisional → solid convention from Apple/Docs
 * dictation.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  targetEl: HTMLElement | null;
  stable: string;
  provisional: string;
}

interface Pos {
  top: number;
  left: number;
  width: number;
}

export function ComposerGhostText({ targetEl, stable, provisional }: Props) {
  const [pos, setPos] = useState<Pos | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!targetEl || !targetEl.isConnected) {
      setPos(null);
      return;
    }
    const compute = () => {
      const rect = targetEl.getBoundingClientRect();
      if (rect.width < 40 || rect.bottom < 0 || rect.top > window.innerHeight) {
        setPos(null);
        return;
      }
      const boxH = boxRef.current?.offsetHeight ?? 0;
      setPos({
        // Anchored to the bottom-inside of the field, growing upward.
        top: rect.bottom - boxH - 6,
        left: rect.left + 8,
        width: rect.width - 16,
      });
    };
    compute();
    window.addEventListener('scroll', compute, { passive: true, capture: true });
    window.addEventListener('resize', compute, { passive: true });
    const interval = setInterval(compute, 300); // text growth reflows height
    return () => {
      window.removeEventListener('scroll', compute, true);
      window.removeEventListener('resize', compute);
      clearInterval(interval);
    };
  }, [targetEl, stable, provisional]);

  if (!targetEl || (!stable && !provisional)) return null;

  return createPortal(
    <div
      ref={boxRef}
      data-voice-ghost
      aria-hidden="true"
      dir="auto"
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: pos?.width,
        maxHeight: 96,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
        pointerEvents: 'none',
        zIndex: 70,
        padding: '4px 8px',
        borderRadius: 6,
        background: 'var(--ds-surface)',
        border: '1px solid var(--ds-border)',
        font: 'var(--ds-font-body)',
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        unicodeBidi: 'plaintext',
        textAlign: 'start',
      }}
    >
      <span>
        <bdi style={{ color: 'var(--ds-text-subtle)' }}>{stable}</bdi>
        <bdi style={{ color: 'var(--ds-text-subtlest)', fontStyle: 'italic' }}>{provisional}</bdi>
        <span
          style={{
            display: 'inline-block',
            width: 2,
            height: '1em',
            verticalAlign: '-0.15em',
            marginInlineStart: 3,
            background: 'var(--ds-icon-accent-magenta)',
          }}
        />
      </span>
    </div>,
    document.body,
  );
}

export default ComposerGhostText;
