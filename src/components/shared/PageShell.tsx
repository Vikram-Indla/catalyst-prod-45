/**
 * PageShell - Enterprise-grade page layout wrapper
 * 
 * Provides consistent layout, spacing, and dark/light mode support
 * across all pages in /home, /enterprise, and /product routes.
 * 
 * LAYOUT VARIANTS:
 * - 'contained': Max-width 1280px, centered - for forms, dashboards
 * - 'wide': Max-width 1600px - for data tables, boards  
 * - 'full': No max-width constraint - for full-bleed layouts
 * 
 * Implements the Catalyst Master Page Specification:
 * - Responsive padding: 12px mobile, 16px tablet, 24px desktop, 32px large
 * - Minimum height fills viewport minus header
 * - All surfaces use semantic tokens for dark/light mode
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  /** Layout variant controlling max-width */
  variant?: 'contained' | 'wide' | 'full';
  /** Optional className */
  className?: string;
  /** Whether to include vertical padding (default true) */
  padded?: boolean;
  /** Whether content should fill remaining viewport height */
  fillHeight?: boolean;
  /** Optional right rail content (e.g., "My Focus" widget) */
  rightRail?: React.ReactNode;
  /** Width of right rail when present */
  rightRailWidth?: string;
}

export function PageShell({
  children,
  variant = 'wide',
  className,
  padded = true,
  fillHeight = false,
  rightRail,
  rightRailWidth = '320px',
}: PageShellProps) {
  const maxWidthClasses = {
    contained: 'max-w-[1280px]',
    wide: 'max-w-[1600px]',
    full: 'max-w-none',
  };

  return (
    <div
      className={cn(
        'w-full mx-auto',
        // Responsive padding: 12px mobile, 16px sm, 24px md, 32px lg
        'px-3 sm:px-4 md:px-6 lg:px-8',
        maxWidthClasses[variant],
        padded && 'py-4 md:py-6',
        // Fill remaining height minus header (56px top nav)
        fillHeight && 'min-h-[calc(100vh-56px)] flex flex-col',
        className
      )}
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {rightRail ? (
        <div 
          className="flex gap-6" 
          style={{ 
            display: 'grid',
            gridTemplateColumns: `1fr ${rightRailWidth}`,
          }}
        >
          {/* Main content area expands to use available width */}
          <div className="min-w-0 flex flex-col">
            {children}
          </div>
          {/* Right rail with fixed width */}
          <aside 
            className="shrink-0 hidden xl:block"
            style={{ width: rightRailWidth }}
          >
            {rightRail}
          </aside>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export default PageShell;
