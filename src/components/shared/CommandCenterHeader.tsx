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
    <div
      className={cn(
        'flex items-center justify-between px-6 py-4 border-b bg-card',
        className,
      )}
      style={{ minHeight: 72 }}
    >
      {/* Left: title + subtitle */}
      <div>
        <h1
          className="text-xl font-bold"
          style={{ color: 'var(--text-1, #0f172a)', margin: 0 }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-sm"
            style={{
              color: 'var(--text-2, #64748b)',
              margin: '2px 0 0',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Right: timestamp + actions + refresh */}
      <div className="flex items-center gap-3">
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
    </div>
  );
}

export default CommandCenterHeader;
