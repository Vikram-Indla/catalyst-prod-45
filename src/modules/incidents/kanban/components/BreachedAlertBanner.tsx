/**
 * Breached Alert Banner - Prominent warning for SLA breaches
 * DARK MODE COMPLIANT per Design System V2
 */

import { memo } from 'react';
import { AlertTriangle } from 'lucide-react';
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
        "bg-[rgba(239,68,68,0.06)] dark:bg-[rgba(239,68,68,0.15)]",
        "border border-[rgba(239,68,68,0.15)] dark:border-[rgba(239,68,68,0.3)]"
      )}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-[#ef4444] dark:text-[#f87171]" />
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-[#ef4444] dark:text-[#f87171]">
            {breachedCount} SLA {breachedCount === 1 ? 'Breach' : 'Breaches'}
          </span>
          <span className="text-sm text-[rgba(239,68,68,0.8)] dark:text-[rgba(248,113,113,0.8)]">
            Immediate attention required
          </span>
        </div>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        className={cn(
          "font-semibold transition-colors",
          "border-[#ef4444] text-[#ef4444]",
          "dark:border-[#f87171] dark:text-[#f87171]",
          "hover:bg-[#ef4444] hover:text-white dark:hover:bg-[#f87171]"
        )}
        onClick={onViewBreached}
      >
        View Breached Only
      </Button>
    </div>
  );
});

export default BreachedAlertBanner;
