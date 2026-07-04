/**
 * useFocusTrap — keeps Tab / Shift+Tab cycling inside a portaled dialog.
 *
 * Portaled modals render under document.body, so without a trap Tab walks
 * out into the page behind the overlay. Attach the returned ref to the
 * dialog root. On mount, focus moves to the first focusable child (unless
 * something inside is already focused, e.g. an autoFocus input); on unmount,
 * focus returns to the element that was focused before the dialog opened.
 */
import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(active = true) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    if (!root.contains(document.activeElement)) {
      const first = root.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? root).focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        el => el.offsetParent !== null || el === document.activeElement,
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (current === first || !root.contains(current)) {
          e.preventDefault();
          last.focus();
        }
      } else if (current === last || !root.contains(current)) {
        e.preventDefault();
        first.focus();
      }
    };

    // capture=true beats the page's own key handlers.
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, [active]);

  return ref;
}
