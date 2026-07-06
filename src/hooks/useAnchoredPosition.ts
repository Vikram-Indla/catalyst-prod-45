/**
 * useAnchoredPosition — shared positioning logic for any popup
 * (dropdown menu, emoji picker, mention picker, etc.) that needs to
 * sit beside a trigger element.
 *
 * Features baked in once so every consumer gets them for free:
 *   - Opens BELOW the trigger by default.
 *   - Auto-flips ABOVE the trigger when there isn't enough room below
 *     AND there is more room above. Eliminates the per-dropdown
 *     placement code paths that kept reappearing across the app.
 *   - Clamps the horizontal position so the popup stays inside the
 *     viewport regardless of the trigger's location.
 *   - Recomputes on `scroll` (capture phase, so it catches scrolls in
 *     every ancestor) and `resize` — the popup tracks the trigger
 *     smoothly while the user scrolls.
 *
 * Usage:
 *   const triggerRef = useRef<HTMLButtonElement>(null);
 *   const pos = useAnchoredPosition(triggerRef, {
 *     open,
 *     menuWidth: 168,
 *     menuHeight: 96,
 *   });
 *   {pos && createPortal(<div style={{ position: 'fixed', ...pos }}>…</div>, document.body)}
 */
import { useEffect, useState, type RefObject } from 'react';

export interface AnchoredPosition {
  top: number;
  left: number;
  /** Right-edge coordinate — populated only when align='end'. Caller
   *  can position the popup via `right: window.innerWidth - anchor.right`
   *  so the popup's right edge stays glued to the trigger's right edge
   *  regardless of the popup's actual rendered width. */
  right?: number;
  /** Direction the popup ended up opening — useful when the caller
   *  wants to flip its own internal layout (e.g. reverse menu item
   *  order when opening upward). */
  placement: 'top' | 'bottom';
}

export interface UseAnchoredPositionOptions {
  /** Toggle. When false the hook returns null and stops listeners. */
  open: boolean;
  /** Approximate menu width — used to clamp horizontal position. */
  menuWidth?: number;
  /** Approximate menu height — used to decide whether to flip up. */
  menuHeight: number;
  /** Gap in px between the trigger edge and the menu edge. */
  gap?: number;
  /** Minimum margin from the viewport edge. Default 8. */
  edgePadding?: number;
  /** Horizontal alignment relative to the trigger.
   *  'start' → menu's left edge aligns with trigger's left edge (default).
   *  'end'   → menu's right edge aligns with trigger's right edge — right
   *            useful when the trigger sits at the far right of a row
   *            (e.g. a `⋯` more-actions button) so the popup opens
   *            leftward instead of running off screen. */
  align?: 'start' | 'end';
}

export function useAnchoredPosition(
  triggerRef: RefObject<HTMLElement | null>,
  options: UseAnchoredPositionOptions,
): AnchoredPosition | null {
  const {
    open,
    menuWidth = 200,
    menuHeight,
    gap = 4,
    edgePadding = 8,
    align = 'start',
  } = options;
  const [pos, setPos] = useState<AnchoredPosition | null>(null);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const needsFlip =
        spaceBelow < menuHeight + gap + edgePadding &&
        spaceAbove > spaceBelow;
      const top = needsFlip
        ? Math.max(edgePadding, rect.top - menuHeight - gap)
        : rect.bottom + gap;
      let left = align === 'end' ? rect.right - menuWidth : rect.left;
      const maxLeft = window.innerWidth - menuWidth - edgePadding;
      if (left > maxLeft) left = Math.max(edgePadding, maxLeft);
      if (left < edgePadding) left = edgePadding;
      const rightCoord = align === 'end'
        ? Math.max(edgePadding, window.innerWidth - rect.right)
        : undefined;
      setPos({ top, left, right: rightCoord, placement: needsFlip ? 'top' : 'bottom' });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, menuHeight, menuWidth, gap, edgePadding, align, triggerRef]);

  return pos;
}
