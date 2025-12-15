/**
 * PageContainer - Global page layout container with responsive sizing
 * 
 * Provides consistent max-width constraints and responsive padding
 * to eliminate the "massive empty space" issue on wide screens.
 * 
 * Implements the Catalyst Master Page Specification:
 * - Full-bleed background with constrained content
 * - Responsive padding: 16px mobile, 24px tablet, 32px desktop
 * - Fluid content up to max-width (1440-1600px)
 * - min-height ensures content fills viewport minus header
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  /** Container variant: 'standard' for forms/detail pages, 'wide' for dashboards/tables, 'full' for no constraint */
  variant?: 'standard' | 'wide' | 'full';
  className?: string;
  /** Whether to add vertical padding */
  padded?: boolean;
  /** Whether to fill remaining viewport height (for table/list pages) */
  fillHeight?: boolean;
}

export function PageContainer({
  children,
  variant = 'wide',
  className,
  padded = true,
  fillHeight = false,
}: PageContainerProps) {
  const maxWidthClasses = {
    standard: 'max-w-[1280px]',
    wide: 'max-w-[1600px]',
    full: 'max-w-none',
  };

  return (
    <div
      className={cn(
        'w-full mx-auto',
        // Responsive padding: 16px mobile, 24px tablet, 32px desktop
        'px-4 md:px-6 lg:px-8',
        maxWidthClasses[variant],
        padded && 'py-4 md:py-6',
        // Fill remaining height minus header (56px top nav)
        fillHeight && 'min-h-[calc(100vh-56px)] flex flex-col',
        className
      )}
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {children}
    </div>
  );
}

export default PageContainer;
