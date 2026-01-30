// ============================================================================
// HOOK: useOverlayPosition — Calculate overlay position with collision avoidance
// Ensures overlays flip/shift to avoid footer and viewport edges
// ============================================================================

import { useState, useCallback, useEffect, useRef } from 'react';

interface UseOverlayPositionOptions {
  triggerRef: React.RefObject<HTMLElement>;
  isOpen: boolean;
  preferredSide?: 'top' | 'bottom';
  sideOffset?: number;
  collisionPadding?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
}

interface OverlayPosition {
  top: number;
  left: number;
  side: 'top' | 'bottom';
  maxHeight: number;
}

export const useOverlayPosition = ({
  triggerRef,
  isOpen,
  preferredSide = 'bottom',
  sideOffset = 4,
  collisionPadding = { top: 8, bottom: 68, left: 8, right: 8 } // 68px for footer
}: UseOverlayPositionOptions): OverlayPosition | null => {
  const [position, setPosition] = useState<OverlayPosition | null>(null);
  const rafRef = useRef<number>();

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !isOpen) {
      setPosition(null);
      return;
    }

    const trigger = triggerRef.current;
    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Get footer height from CSS variable or use default
    const footerHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--app-footer-h') || '60'
    );
    const safeBottom = collisionPadding.bottom ?? (footerHeight + 8);
    const safeTop = collisionPadding.top ?? 8;

    // Calculate available space above and below
    const spaceBelow = viewportHeight - rect.bottom - safeBottom;
    const spaceAbove = rect.top - safeTop;

    // Estimated overlay height (will be constrained by maxHeight)
    const estimatedOverlayHeight = 320;

    // Determine best side
    let side: 'top' | 'bottom' = preferredSide;
    if (preferredSide === 'bottom' && spaceBelow < estimatedOverlayHeight && spaceAbove > spaceBelow) {
      side = 'top';
    } else if (preferredSide === 'top' && spaceAbove < estimatedOverlayHeight && spaceBelow > spaceAbove) {
      side = 'bottom';
    }

    // Calculate position
    let top: number;
    let maxHeight: number;

    if (side === 'bottom') {
      top = rect.bottom + sideOffset;
      maxHeight = Math.min(spaceBelow - sideOffset, 400);
    } else {
      maxHeight = Math.min(spaceAbove - sideOffset, 400);
      top = rect.top - maxHeight - sideOffset;
    }

    // Ensure minimum height
    maxHeight = Math.max(maxHeight, 120);

    // Calculate left position (align with trigger, but stay in viewport)
    let left = rect.left;
    const overlayWidth = 300; // Approximate width
    if (left + overlayWidth > viewportWidth - (collisionPadding.right ?? 8)) {
      left = viewportWidth - overlayWidth - (collisionPadding.right ?? 8);
    }
    if (left < (collisionPadding.left ?? 8)) {
      left = collisionPadding.left ?? 8;
    }

    setPosition({ top, left, side, maxHeight });
  }, [triggerRef, isOpen, preferredSide, sideOffset, collisionPadding]);

  useEffect(() => {
    if (isOpen) {
      calculatePosition();
      
      // Recalculate on scroll/resize
      const handleReposition = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(calculatePosition);
      };

      window.addEventListener('scroll', handleReposition, true);
      window.addEventListener('resize', handleReposition);
      
      return () => {
        window.removeEventListener('scroll', handleReposition, true);
        window.removeEventListener('resize', handleReposition);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }
  }, [isOpen, calculatePosition]);

  return position;
};

export default useOverlayPosition;
