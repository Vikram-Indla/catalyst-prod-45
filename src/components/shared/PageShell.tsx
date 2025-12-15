/**
 * PageShell - Enterprise-grade page layout wrapper
 * 
 * Provides consistent layout, spacing, and dark/light mode support
 * across all pages. Works with GlobalPageHeader to ensure uniform
 * breadcrumb + title + actions across all routes.
 * 
 * LAYOUT VARIANTS:
 * - 'contained': Max-width 1280px, centered - for forms, dashboards
 * - 'wide': Max-width 1600px - for data tables, boards  
 * - 'full': No max-width constraint - for full-bleed layouts
 * 
 * Usage:
 * <PageShell>
 *   <GlobalPageHeader sectionLabel="Enterprise" pageTitle="Strategy Room" />
 *   <PageShell.Content>
 *     {your page content}
 *   </PageShell.Content>
 * </PageShell>
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  /** Layout variant controlling max-width */
  variant?: 'contained' | 'wide' | 'full';
  /** Optional className */
  className?: string;
}

interface PageShellContentProps {
  children: React.ReactNode;
  /** Optional className */
  className?: string;
  /** Layout variant - inherited from parent but can override */
  variant?: 'contained' | 'wide' | 'full';
}

/**
 * Main page wrapper - handles full height and background
 */
export function PageShell({
  children,
  variant = 'wide',
  className,
}: PageShellProps) {
  return (
    <div
      className={cn(
        'h-full flex flex-col min-w-0',
        className
      )}
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {children}
    </div>
  );
}

/**
 * Content area inside PageShell - handles padding, max-width, scrolling
 */
function PageShellContent({
  children,
  className,
  variant = 'wide',
}: PageShellContentProps) {
  const maxWidthClasses = {
    contained: 'max-w-[1280px]',
    wide: 'max-w-[1600px]',
    full: 'max-w-none',
  };

  return (
    <div className="flex-1 overflow-auto px-6 py-4 min-w-0">
      <div
        className={cn(
          'mx-auto',
          maxWidthClasses[variant],
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

// Attach Content as a sub-component
PageShell.Content = PageShellContent;

export default PageShell;
