/**
 * PageContainer - Global page layout container with responsive sizing
 * 
 * Provides consistent max-width constraints and responsive padding
 * to eliminate the "massive empty space" issue on wide screens.
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  /** Container variant: 'standard' for forms/detail pages, 'wide' for dashboards/tables */
  variant?: 'standard' | 'wide' | 'full';
  className?: string;
  /** Whether to add vertical padding */
  padded?: boolean;
}

export function PageContainer({
  children,
  variant = 'wide',
  className,
  padded = true,
}: PageContainerProps) {
  const maxWidthClasses = {
    standard: 'max-w-[1280px]',
    wide: 'max-w-[1440px]',
    full: 'max-w-none',
  };

  return (
    <div
      className={cn(
        'w-full mx-auto px-4 md:px-6 lg:px-8',
        maxWidthClasses[variant],
        padded && 'py-4 md:py-6',
        className
      )}
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {children}
    </div>
  );
}

export default PageContainer;
