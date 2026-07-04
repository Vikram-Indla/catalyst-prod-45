/**
 * DictationCTA — the visible CatyFlow affordance (CAT-VOICE-FLOW-
 * 20260704-001 V3). A small magenta mic button that follows focus onto
 * any eligible text field (input / textarea / rich editor), so dictation
 * is discoverable without knowing the hotkeys. Clicking it activates the
 * same engine as double-space / ⌘⇧V.
 *
 * Mounted globally by VoiceFlowProvider; renders nothing while a
 * dictation session is active or no eligible field has focus.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import Tooltip from '@atlaskit/tooltip';
import { CatyPulseIcon } from '@/components/ui/CatyPulseIcon';
import { getActiveTextTarget } from './useActiveTextTarget';
import type { ActiveField } from './voiceFlow.types';

const BTN = 30;
const HIDE_DELAY_MS = 150;

export interface DictationCTAProps {
  /** True while a dictation session is anything but idle. */
  sessionActive: boolean;
  onActivate: (field: ActiveField) => void;
}

interface Pos {
  top: number;
  left: number;
}

export function DictationCTA({ sessionActive, onActivate }: DictationCTAProps) {
  const [pos, setPos] = useState<Pos | null>(null);
  const targetElRef = useRef<HTMLElement | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const place = useCallback((el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    if (rect.width < 60 || rect.height < 24 || rect.bottom < 0 || rect.top > window.innerHeight) {
      setPos(null);
      return;
    }
    setPos({
      top: Math.min(rect.bottom - BTN - 4, window.innerHeight - BTN - 8),
      left: Math.min(rect.right - BTN - 4, window.innerWidth - BTN - 8),
    });
  }, []);

  useEffect(() => {
    const onFocusIn = () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      const active = document.activeElement;
      const field = getActiveTextTarget(active);
      if (field) {
        targetElRef.current = field.element;
        place(field.element);
      } else if (!(active instanceof HTMLElement) || !active.closest('[data-catyflow-cta]')) {
        targetElRef.current = null;
        setPos(null);
      }
    };
    const onFocusOut = () => {
      hideTimer.current = setTimeout(() => {
        const field = getActiveTextTarget(document.activeElement);
        if (!field) {
          targetElRef.current = null;
          setPos(null);
        }
      }, HIDE_DELAY_MS);
    };
    const onReflow = () => {
      if (targetElRef.current?.isConnected) place(targetElRef.current);
      else setPos(null);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    window.addEventListener('scroll', onReflow, { passive: true, capture: true });
    window.addEventListener('resize', onReflow, { passive: true });
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [place]);

  if (!pos || sessionActive) return null;

  return createPortal(
    <div data-catyflow-cta style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 60 }}>
      <Tooltip content="Dictate (double-space or ⌘⇧V) — select text first to command">
        <button
          type="button"
          aria-label="Start dictation"
          onMouseDown={(e) => {
            // Keep the field focused; capture it (incl. live selection for
            // command mode) before any blur can run.
            e.preventDefault();
            const el = targetElRef.current;
            const field = el ? getActiveTextTarget(el) : null;
            if (field) onActivate(field);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: BTN,
            height: BTN,
            borderRadius: '50%',
            border: `1px solid ${token('color.border')}`,
            background: token('elevation.surface.raised'),
            boxShadow: token('elevation.shadow.raised'),
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <CatyPulseIcon size={15} title="Dictate" />
        </button>
      </Tooltip>
    </div>,
    document.body,
  );
}

export default DictationCTA;
