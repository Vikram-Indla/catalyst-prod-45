/**
 * Breached Alert Banner - Prominent warning for SLA breaches
 * DARK MODE COMPLIANT per Design System V2
 */

import { memo } from 'react';
import { AlertTriangle } from '@/lib/atlaskit-icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BreachedAlertBannerProps {
  breachedCount: number;
  onViewBreached: () => void;
}

export const BreachedAlertBanner = memo(function BreachedAlertBanner({
  breachedCount,
  onViewBreached,
}: BreachedAlertBannerProps) {
  if (breachedCount === 0) return null;

  return (
    <div 
      className={cn(
        "mx-4 sm:mx-6 mb-4 px-4 py-3.5 flex items-center justify-between rounded-[10px]",
        "bg-[var(--ds-background-danger, rgba(239,68,68,0.06))] dark:bg-[var(--ds-background-danger, rgba(239,68,68,0.15))]",
        "border border-[var(--ds-background-danger, rgba(239,68,68,0.15))] dark:border-[var(--ds-background-danger, rgba(239,68,68,0.3))]"
      )}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-[var(--ds-text-danger)] dark:text-[var(--ds-background-danger)]" />
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-[var(--ds-text-danger)] dark:text-[var(--ds-background-danger)]">
            {breachedCount} SLA {breachedCount === 1 ? 'Breach' : 'Breaches'}
          </span>
          <span className="text-sm text-[var(--ds-background-danger, rgba(239,68,68,0.8))] dark:text-[rgba(248,113,113,0.8)]">
            Immediate attention required
          </span>
        </div>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        className={cn(
          "font-semibold transition-colors",
          "border-[var(--ds-text-danger)] text-[var(--ds-text-danger)]",
          "dark:border-[var(--ds-background-danger)] dark:text-[var(--ds-background-danger)]",
          "hover:bg-[var(--ds-text-danger)] hover:text-white dark:hover:bg-[var(--ds-background-danger)]"
        )}
        onClick={onViewBreached}
      >
        View Breached Only
      </Button>
    </div>
  );
});

export default BreachedAlertBanner;
