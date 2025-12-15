/**
 * PageHeader - Enterprise-grade page header component
 * 
 * Implements the Catalyst Master Page Specification:
 * - Row 1: H1 title (text-only, no icons) + optional count badge
 * - Row 2: Toolbar with controls
 * - Single divider ONLY after toolbar (not above)
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** Page title (text only, no icons) */
  title: string;
  /** Optional count badge next to title */
  count?: number;
  /** Optional subtitle */
  subtitle?: string;
  /** Toolbar content (filters, search, view toggles) */
  toolbar?: React.ReactNode;
  /** Optional right-side actions */
  actions?: React.ReactNode;
  /** Optional className */
  className?: string;
}

export function PageHeader({
  title,
  count,
  subtitle,
  toolbar,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('shrink-0', className)}>
      {/* Row 1: Title + Actions */}
      <div
        className="flex items-center justify-between h-11 px-0"
        style={{ minHeight: 'var(--title-row-h, 44px)' }}
      >
        <div className="flex items-center gap-3">
          <h1
            className="text-xl font-semibold"
            style={{ color: 'hsl(var(--secondary-green))' }}
          >
            {title}
          </h1>
          {count !== undefined && (
            <span
              className="text-sm font-medium px-2 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--surface-3)',
                color: 'var(--text-2)',
              }}
            >
              {count}
            </span>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {/* Optional subtitle */}
      {subtitle && (
        <p
          className="text-sm mb-2"
          style={{ color: 'var(--text-2)' }}
        >
          {subtitle}
        </p>
      )}

      {/* Row 2: Toolbar (with divider below) */}
      {toolbar && (
        <div
          className="flex items-center gap-3 h-[52px]"
          style={{
            minHeight: 'var(--toolbar-row-h, 52px)',
            borderBottom: '1px solid var(--divider)',
          }}
        >
          {toolbar}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
