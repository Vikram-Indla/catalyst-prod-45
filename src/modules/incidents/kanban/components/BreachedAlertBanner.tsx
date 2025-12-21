/**
 * Breached Alert Banner - Prominent warning for SLA breaches
 */

import { memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className="mx-4 sm:mx-6 mb-4 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <span className="font-semibold text-red-700 dark:text-red-400">
            {breachedCount} SLA {breachedCount === 1 ? 'Breach' : 'Breaches'}
          </span>
          <span className="text-red-600 dark:text-red-500 ml-2 text-sm">
            Immediate attention required
          </span>
        </div>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
        onClick={onViewBreached}
      >
        View Breached Only
      </Button>
    </div>
  );
});

export default BreachedAlertBanner;
