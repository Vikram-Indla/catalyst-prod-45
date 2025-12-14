/**
 * PageHeader — Standardized Page Header Component
 * Based on Capacity Planning header pattern (source of truth)
 * 
 * Row 1 (44px): Title only, olive green color, font-semibold
 * Row 2 (52px): Toolbar controls, border-bottom when toolbar is present
 */

import React, { ReactNode } from 'react';

interface PageHeaderProps {
  /** Page title - displayed in olive/secondary-green color */
  title: string;
  /** Optional toolbar content - when provided, shows Row 2 with divider */
  toolbar?: ReactNode;
  /** Additional classes for the wrapper */
  className?: string;
}

export function PageHeader({ title, toolbar, className }: PageHeaderProps) {
  return (
    <div className={className}>
      {/* Row 1: Title - 44px height */}
      <div 
        className="flex items-center px-6"
        style={{ height: '44px' }}
      >
        <h1 className="text-xl font-semibold text-secondary-green m-0">
          {title}
        </h1>
      </div>

      {/* Row 2: Toolbar - 52px height, only rendered if toolbar provided */}
      {toolbar && (
        <div 
          className="flex items-center px-6 border-b"
          style={{ 
            height: '52px',
            borderColor: 'hsl(var(--border))'
          }}
        >
          {toolbar}
        </div>
      )}
    </div>
  );
}
