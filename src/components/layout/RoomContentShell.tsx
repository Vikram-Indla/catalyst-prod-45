/**
 * RoomContentShell — Standardized content wrapper for all Room pages
 * 
 * Ensures consistent:
 * - Container padding (left/right gutters)
 * - Vertical spacing between sections
 * - Max-width behavior
 * - Light/dark mode token usage
 */

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface RoomContentShellProps {
  /** Content to render inside the shell */
  children: ReactNode;
  /** Whether to use max-width constraint (default: true) */
  maxWidth?: boolean;
  /** Custom max-width value (default: 1600px) */
  maxWidthValue?: string;
  /** Whether to apply default padding (default: true) */
  withPadding?: boolean;
  /** Additional classes for the wrapper */
  className?: string;
  /** Whether content should fill available height (default: true) */
  fillHeight?: boolean;
}

export function RoomContentShell({
  children,
  maxWidth = true,
  maxWidthValue = '1600px',
  withPadding = true,
  className,
  fillHeight = true,
}: RoomContentShellProps) {
  return (
    <div
      className={cn(
        'overflow-auto min-w-0',
        fillHeight && 'flex-1',
        withPadding && 'px-5 py-5',
        className
      )}
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <div
        className={cn(
          'mx-auto',
          maxWidth && `max-w-[${maxWidthValue}]`
        )}
        style={{ maxWidth: maxWidth ? maxWidthValue : undefined }}
      >
        {children}
      </div>
    </div>
  );
}

export default RoomContentShell;
