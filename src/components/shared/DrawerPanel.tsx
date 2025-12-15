/**
 * DrawerPanel - Unified drawer panel container
 * 
 * Provides consistent styling for drawer tab content panels
 * with proper dark/light mode support and spacing.
 * 
 * Used by Business Request Drawer tabs and other entity drawers.
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface DrawerPanelProps {
  children: React.ReactNode;
  /** Panel title (optional) */
  title?: string;
  /** Title icon (optional) */
  icon?: React.ReactNode;
  /** Right-side actions for the header (optional) */
  actions?: React.ReactNode;
  /** Whether the panel should fill available height */
  fillHeight?: boolean;
  /** Additional className */
  className?: string;
  /** Whether to show a border around the panel */
  bordered?: boolean;
}

export function DrawerPanel({
  children,
  title,
  icon,
  actions,
  fillHeight = false,
  className,
  bordered = true,
}: DrawerPanelProps) {
  return (
    <div
      className={cn(
        'rounded-xl shadow-sm overflow-hidden',
        fillHeight && 'flex flex-col flex-1 min-h-0',
        bordered && 'border',
        className
      )}
      style={{ 
        backgroundColor: 'var(--surface-1)',
        borderColor: bordered ? 'var(--border-color)' : 'transparent',
      }}
    >
      {title && (
        <div 
          className="flex items-center justify-between px-5 py-3.5 shrink-0"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-2">
            {icon && (
              <span style={{ color: 'var(--accent-color)' }}>
                {icon}
              </span>
            )}
            <span 
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--accent-color)' }}
            >
              {title}
            </span>
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className={cn(
        fillHeight && 'flex-1 min-h-0 overflow-y-auto',
        !title && 'p-5'
      )}>
        {children}
      </div>
    </div>
  );
}

interface DrawerSectionProps {
  children: React.ReactNode;
  /** Section title */
  title?: string;
  /** Additional className */
  className?: string;
}

export function DrawerSection({
  children,
  title,
  className,
}: DrawerSectionProps) {
  return (
    <div 
      className={cn('rounded-xl p-5 space-y-4 shadow-sm border', className)}
      style={{ 
        backgroundColor: 'var(--surface-1)',
        borderColor: 'var(--border-color)',
      }}
    >
      {title && (
        <h3 
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--accent-color)' }}
        >
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

export default DrawerPanel;
