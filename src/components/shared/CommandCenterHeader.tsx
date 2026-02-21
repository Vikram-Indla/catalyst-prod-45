/**
 * CommandCenterHeader — Reusable dashboard/overview page header
 *
 * Spec: 72px height, 20px bold title, 14px subtitle,
 * right-aligned timestamp + action slot, 1px bottom border.
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CommandCenterHeaderProps {
  /** Bold page title */
  title: string;
  /** Secondary description */
  subtitle?: string;
  /** e.g. "Updated just now" */
  timestamp?: string;
  /** Refresh callback (shows spin icon) */
  onRefresh?: () => void;
  /** Controls spin animation */
  isRefreshing?: boolean;
  /** Extra right-side buttons (Export, etc.) */
  actions?: React.ReactNode;
  /** Optional className override */
  className?: string;
}

export function CommandCenterHeader({
  title,
  subtitle,
  timestamp,
  onRefresh,
  isRefreshing,
  actions,
  className,
}: CommandCenterHeaderProps) {
  return (
    <header
      className={cn(
        'w-full flex items-start justify-between gap-4 border-b bg-card mb-5',
        className,
      )}
      style={{ minHeight: 72, padding: subtitle ? '20px 24px 16px 24px' : '20px 24px' }}
    >
      {/* Left: title + subtitle */}
      <div className="min-w-0">
        <h1
          className="m-0"
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            color: 'var(--catalyst-text-primary, var(--text-1, #0f172a))',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-sm"
            style={{
              fontSize: 14,
              color: 'var(--catalyst-text-secondary, var(--text-2, #64748b))',
              margin: '4px 0 0',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Right: timestamp + actions + refresh */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {timestamp && (
          <span
            className="text-xs cursor-default"
            style={{ color: 'var(--text-3, #94a3b8)' }}
          >
            {timestamp}
          </span>
        )}

        {actions}

        {onRefresh && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  aria-label="Refresh data"
                >
                  <RefreshCw
                    className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Refresh all data
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </header>
  );
}

export default CommandCenterHeader;
