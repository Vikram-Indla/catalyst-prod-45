/**
 * SurfaceCard - Enterprise-grade card container using theme tokens
 * 
 * Consistent styling for cards, panels, and sections across light/dark modes.
 * Uses CSS variables for automatic theme switching.
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface SurfaceCardProps {
  children: React.ReactNode;
  /** Optional title for the card header */
  title?: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Optional header right content (e.g., actions) */
  headerRight?: React.ReactNode;
  /** Card padding level */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Whether to show a top accent border */
  accent?: boolean;
  /** Optional className */
  className?: string;
  /** Whether this is an elevated surface */
  elevated?: boolean;
}

export function SurfaceCard({
  children,
  title,
  subtitle,
  headerRight,
  padding = 'md',
  accent = false,
  className,
  elevated = false,
}: SurfaceCardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden',
        accent && 'border-t-2',
        className
      )}
      style={{
        backgroundColor: elevated ? 'var(--surface-raised)' : 'var(--surface-2)',
        border: '1px solid var(--border-color)',
        borderTopColor: accent ? 'var(--accent-color)' : undefined,
        boxShadow: elevated ? 'var(--card-shadow)' : undefined,
      }}
    >
      {/* Header */}
      {(title || headerRight) && (
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            backgroundColor: 'var(--surface-1)',
            borderBottom: '1px solid var(--divider)',
          }}
        >
          <div>
            {title && (
              <h3
                className="text-sm font-semibold"
                style={{ color: 'var(--text-1)' }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                className="text-xs mt-0.5"
                style={{ color: 'var(--text-3)' }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {headerRight}
        </div>
      )}

      {/* Content */}
      <div className={paddingClasses[padding]}>
        {children}
      </div>
    </div>
  );
}

export default SurfaceCard;
