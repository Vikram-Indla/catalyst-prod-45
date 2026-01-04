/**
 * Prompt 1: Scale Warning Banner
 * Shows view recommendation based on resource count
 */

import { AlertTriangle, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getRecommendedView, ViewType } from '@/lib/capacity-planner/view-utils';
import { useState } from 'react';

interface ScaleWarningBannerProps {
  resourceCount: number;
  currentView: ViewType;
  onSwitchView: (view: ViewType) => void;
  className?: string;
}

export function ScaleWarningBanner({
  resourceCount,
  currentView,
  onSwitchView,
  className
}: ScaleWarningBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const { recommended, reason, performance } = getRecommendedView(resourceCount);

  // Don't show banner if already on recommended view or dismissed
  if (currentView === recommended || dismissed || resourceCount <= 50) {
    return null;
  }

  // Show warning for performance issues
  const isPerformanceCritical = 
    (currentView === 'cards' && resourceCount > 150) ||
    (currentView === 'timeline' && resourceCount > 200);

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 rounded-lg transition-all',
        isPerformanceCritical
          ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
          : 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {isPerformanceCritical ? (
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        ) : (
          <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        )}
        <span className={cn(
          'text-sm font-medium',
          isPerformanceCritical 
            ? 'text-amber-800 dark:text-amber-200'
            : 'text-blue-800 dark:text-blue-200'
        )}>
          <span className="font-bold">{resourceCount} resources:</span> {reason}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSwitchView(recommended)}
          className={cn(
            'h-7 px-3 text-xs',
            isPerformanceCritical
              ? 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900'
              : 'border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900'
          )}
        >
          Switch to {recommended.charAt(0).toUpperCase() + recommended.slice(1)}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="h-7 w-7 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
