/**
 * CommandCenterHeader — Catalyst Platform Page Header
 *
 * CONTRACT (Catalyst Header Spec v1.0):
 * ─────────────────────────────────────
 * minHeight:       72px
 * Padding:         20px top, 24px left/right, 16px bottom (with subtitle)
 * Bottom margin:   20px (mb-5) before page content
 * Border:          1px bottom, semantic --border / --divider token
 * Background:      bg-card (semantic)
 *
 * Title:           Sora, 24px, weight 700, tracking -0.02em, lineHeight 1.2
 * Subtitle:        Inter, 14px, 4px top margin, muted-foreground
 * Timestamp:       JetBrains Mono, 12px, text-3 token
 *
 * Right zone:      flex row, gap-3, vertically centered
 *
 * All pages MUST use this component for their top-level header.
 * Do NOT wrap in additional containers that add padding.
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ads';

interface CommandCenterHeaderProps {
  /** Bold page title (Sora font) */
  title: string;
  /** Secondary description (Inter font, muted) */
  subtitle?: string;
  /** Optional count badge next to title, e.g. "6/6" */
  count?: string | React.ReactNode;
  /** e.g. "Updated just now" (JetBrains Mono) */
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
  count,
  timestamp,
  onRefresh,
  isRefreshing,
  actions,
  className,
}: CommandCenterHeaderProps) {
  return (
    <header
      className={cn(
        'w-full flex items-start justify-between gap-4 flex-wrap border-b bg-card mb-5 flex-shrink-0 min-w-0',
        className,
      )}
      style={{
        minHeight: 72,
        padding: subtitle ? '20px 24px 16px 24px' : '20px 24px',
      }}
    >
      {/* Left: title + subtitle */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2.5">
          <h1
            className="m-0"
            style={{
              fontFamily: 'var(--cp-font-heading)',
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              color: 'var(--catalyst-text-primary, var(--text-1, hsl(var(--foreground))))',
            }}
          >
            {title}
          </h1>
          {count && (
            <span
              style={{
                fontFamily: 'var(--cp-font-mono)',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--catalyst-text-secondary, var(--text-3, hsl(var(--muted-foreground))))',
              }}
            >
              {count}
            </span>
          )}
        </div>
        {subtitle && (
          <p
            className="dark:text-[var(--ds-text-subtlest, #A1A1A1)]"
            style={{
              fontFamily: 'var(--cp-font-body)',
              fontSize: 14,
              color: 'var(--catalyst-text-secondary, var(--text-2, hsl(var(--muted-foreground))))',
              margin: '4px 0 0',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Right: timestamp + actions + refresh */}
      <div className="flex items-center gap-3 flex-shrink-0" style={{ marginTop: 2 }}>
        {timestamp && (
          <span
            style={{
              fontFamily: 'var(--cp-font-mono)',
              fontSize: 12,
              color: 'var(--text-3, hsl(var(--muted-foreground)))',
              cursor: 'default',
            }}
          >
            {timestamp}
          </span>
        )}

        {actions}

        {onRefresh && (
          <Tooltip content="Refresh all data" position="bottom">
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
          </Tooltip>
        )}
      </div>
    </header>
  );
}

export default CommandCenterHeader;
