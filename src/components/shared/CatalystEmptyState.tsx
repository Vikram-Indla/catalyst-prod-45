/**
 * CatalystEmptyState - Global empty state component with semantic token support
 * 
 * Ensures consistent empty state styling across all pages in both Light and Dark modes.
 * Uses CSS custom properties for automatic theme switching.
 */

import React from 'react';
import { LucideIcon, Plus, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CatalystEmptyStateProps {
  /** Lucide icon to display */
  icon?: LucideIcon;
  /** Main title text */
  title: string;
  /** Descriptive subtitle text */
  subtitle?: string;
  /** Primary action button label */
  ctaLabel?: string;
  /** Primary action callback */
  onAction?: () => void;
  /** Secondary action button label */
  secondaryLabel?: string;
  /** Secondary action callback */
  onSecondaryAction?: () => void;
  /** Optional className for customization */
  className?: string;
  /** Size variant: 'sm' for compact, 'default' for standard, 'lg' for full page */
  size?: 'sm' | 'default' | 'lg';
  /** Whether to show bordered container */
  bordered?: boolean;
}

export function CatalystEmptyState({
  icon: Icon = FileQuestion,
  title,
  subtitle,
  ctaLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
  className,
  size = 'default',
  bordered = false,
}: CatalystEmptyStateProps) {
  const sizeClasses = {
    sm: 'min-h-[200px] py-6',
    default: 'min-h-[300px] py-10',
    lg: 'min-h-[50vh] py-16',
  };

  const iconSizes = {
    sm: 'w-10 h-10',
    default: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  const iconInnerSizes = {
    sm: 'w-5 h-5',
    default: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-4 text-center',
        sizeClasses[size],
        bordered && 'rounded-lg',
        className
      )}
      style={{
        backgroundColor: bordered ? 'var(--empty-state-bg)' : 'transparent',
        border: bordered ? '1px dashed var(--empty-state-border)' : 'none',
      }}
    >
      <div
        className={cn('rounded-full flex items-center justify-center mb-4', iconSizes[size])}
        style={{ backgroundColor: 'var(--surface-2)' }}
      >
        <Icon
          className={iconInnerSizes[size]}
          style={{ color: 'var(--text-2)' }}
        />
      </div>

      <h3
        className={cn(
          'font-semibold mb-2',
          size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-lg'
        )}
        style={{ color: 'var(--text-1)' }}
      >
        {title}
      </h3>

      {subtitle && (
        <p
          className={cn(
            'max-w-md mb-6',
            size === 'sm' ? 'text-xs' : 'text-sm'
          )}
          style={{ color: 'var(--empty-state-text)' }}
        >
          {subtitle}
        </p>
      )}

      {(ctaLabel || secondaryLabel) && (
        <div className="flex items-center gap-3">
          {ctaLabel && onAction && (
            <Button
              onClick={onAction}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              {ctaLabel}
            </Button>
          )}
          {secondaryLabel && onSecondaryAction && (
            <Button
              variant="outline"
              onClick={onSecondaryAction}
              style={{
                borderColor: 'var(--border-color)',
                color: 'var(--text-2)',
                backgroundColor: 'var(--surface-1)',
              }}
            >
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default CatalystEmptyState;
