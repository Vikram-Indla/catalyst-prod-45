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

  // Hover companion: translate the field's content Arabic ↔ English via the
  // ai-translate-field lane (auto-detects direction) and write it back.
  const [translating, setTranslating] = useState(false);
  const translateField = useCallback(async () => {
    const el = targetElRef.current;
    if (!el || translating) return;
    const isFormField = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
    const text = isFormField ? el.value : el.textContent ?? '';
    if (!text.trim()) return;
    setTranslating(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.functions.invoke('ai-translate-field', {
        body: { text },
      });
      const translated: string | undefined = data?.translated ?? data?.text ?? data?.result;
      if (error || !translated) throw new Error(error?.message || 'no translation returned');
      if (isFormField) {
        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, translated);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        el.textContent = translated;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch (e) {
      const { catalystToast } = await import('@/lib/catalystToast');
      catalystToast.error(`Translate failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTranslating(false);
    }
  }, [translating]);

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

  // HOVER-reveal, not focus (design-critique F4, Vikram 2026-07-06: "this
  // catty flow must only be visible when you hover over it" — a chip that
  // parks in every focused field reads as clutter). The cluster shows while
  // the pointer is over an eligible field or the cluster itself.
  useEffect(() => {
    const cancelHide = () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
    const scheduleHide = () => {
      cancelHide();
      hideTimer.current = setTimeout(() => {
        targetElRef.current = null;
        setPos(null);
      }, HIDE_DELAY_MS);
    };
    const onPointerOver = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (t instanceof HTMLElement && t.closest('[data-catyflow-cta]')) {
        cancelHide();
        return;
      }
      const host =
        t instanceof HTMLElement
          ? (t.closest('input, textarea, [contenteditable]') as HTMLElement | null)
          : null;
      const field = getActiveTextTarget(host);
      if (field) {
        cancelHide();
        targetElRef.current = field.element;
        place(field.element);
      }
    };
    const onPointerOut = (e: PointerEvent) => {
      if (!targetElRef.current) return;
      const next = e.relatedTarget as Element | null;
      if (
        next instanceof HTMLElement &&
        (next.closest('[data-catyflow-cta]') || targetElRef.current.contains(next))
      ) {
        return;
      }
      scheduleHide();
    };
    const onReflow = () => {
      if (targetElRef.current?.isConnected) place(targetElRef.current);
      else setPos(null);
    };
    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('pointerout', onPointerOut);
    window.addEventListener('scroll', onReflow, { passive: true, capture: true });
    window.addEventListener('resize', onReflow, { passive: true });
    return () => {
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerout', onPointerOut);
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [place]);

  if (!pos || sessionActive) return null;

  return createPortal(
    <div
      data-catyflow-cta
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 60, display: 'flex', gap: 4 }}
    >
      <Tooltip content={translating ? 'Translating…' : 'Translate (Arabic ↔ English)'}>
        <button
          type="button"
          aria-label="Translate field"
          disabled={translating}
          onMouseDown={(e) => {
            e.preventDefault();
            void translateField();
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
            font: 'var(--ds-font-body-small)',
            color: 'var(--ds-text-subtle)',
            opacity: translating ? 0.6 : 1,
          }}
        >
          {translating ? '…' : 'ع/A'}
        </button>
      </Tooltip>
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
