/**
 * Scrollable Overlay Utility
 * 
 * Provides consistent trackpad/two-finger scrolling support for dropdown overlays.
 * This utility ensures scroll gestures work correctly on macOS and touch devices
 * without affecting parent containers.
 * 
 * CAUSE → FIX MAPPING:
 * 
 * 1. Missing `overscroll-behavior: contain` → Adds overscroll-contain class
 *    WHY: Without this, scroll momentum can "leak" to parent containers
 * 
 * 2. Missing `-webkit-overflow-scrolling: touch` → Adds inline style
 *    WHY: Required for smooth momentum scrolling on Safari/WebKit
 * 
 * 3. Missing `onWheelCapture` event handler → Stops propagation
 *    WHY: Prevents parent scroll-lock handlers from intercepting gestures
 * 
 * 4. Parent `overflow: hidden` clipping → Ensured via Portal rendering
 *    WHY: Non-portaled content gets clipped by overflow-hidden ancestors
 * 
 * USAGE:
 * ```tsx
 * <div 
 *   className={cn("max-h-60 overflow-y-auto", scrollableOverlayClasses)}
 *   {...scrollableOverlayProps}
 * >
 *   {children}
 * </div>
 * ```
 */

import { WheelEvent } from 'react';

/**
 * CSS classes for scrollable overlays
 * Apply these to the scrollable container
 */
export const scrollableOverlayClasses = 'overscroll-contain';

/**
 * Style object for scrollable overlays
 * Enables smooth momentum scrolling on Safari/WebKit
 */
export const scrollableOverlayStyle: React.CSSProperties = {
  WebkitOverflowScrolling: 'touch',
};

/**
 * Event handler to stop wheel event propagation
 * Prevents parent scroll-lock handlers from intercepting trackpad gestures
 */
export const handleWheelCapture = (e: WheelEvent) => {
  e.stopPropagation();
};

/**
 * Complete props object for scrollable overlay containers
 * Spread this onto your scrollable div
 */
export const scrollableOverlayProps = {
  style: scrollableOverlayStyle,
  onWheelCapture: handleWheelCapture,
};

/**
 * Helper function to get all scrollable overlay props including className
 * @param existingClassName - Optional existing className to merge
 * @returns Object with className, style, and onWheelCapture
 */
export const getScrollableOverlayProps = (existingClassName?: string) => ({
  className: existingClassName 
    ? `${existingClassName} ${scrollableOverlayClasses}` 
    : scrollableOverlayClasses,
  ...scrollableOverlayProps,
});
