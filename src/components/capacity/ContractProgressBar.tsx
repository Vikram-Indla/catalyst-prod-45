/**
 * Contract Progress Bar Component
 * Displays contract time remaining with visual progress indicator
 * Catalyst V5 compliant
 */

import { cn } from '@/lib/utils';
import type { ContractStatus } from '@/hooks/useResourceProfiles';
import { AlertTriangle } from 'lucide-react';

interface ContractProgressBarProps {
  contractStatus: ContractStatus;
  endDate: string | null | undefined;
  className?: string;
  showLabel?: boolean;
}

export function ContractProgressBar({
  contractStatus,
  endDate,
  className,
  showLabel = true
}: ContractProgressBarProps) {
  // Calculate progress percentage (assuming 1 year = 100%)
  const getProgressPercent = () => {
    if (!contractStatus.daysRemaining) return 100;
    return Math.min(100, Math.max(5, (contractStatus.daysRemaining / 365) * 100));
  };

  const progressColors = {
    healthy: 'bg-[#0d9488]', // Teal
    warning: 'bg-gradient-to-r from-[#0d9488] to-[#ca8a04]', // Teal to Gold
    critical: 'bg-[#be123c]', // Rose
    expired: 'bg-muted-foreground/30',
    permanent: 'bg-muted-foreground/40'
  };

  const formattedDate = endDate
    ? new Date(endDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'No Limit';

  if (contractStatus.status === 'permanent') {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <span>∞</span>
        <span>Permanent</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-[10px]">
          <span className={cn(
            "flex items-center gap-1",
            contractStatus.status === 'critical' ? 'text-[#be123c] font-medium' : 'text-muted-foreground'
          )}>
            {contractStatus.status === 'critical' && (
              <AlertTriangle className="w-3 h-3" />
            )}
            {contractStatus.status === 'critical' ? 'Expiring Soon!' : 'Contract'}
          </span>
          <span className="text-muted-foreground">
            {contractStatus.status === 'expired' ? 'Expired' : `Ends ${formattedDate}`}
          </span>
        </div>
      )}

      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            progressColors[contractStatus.status],
            contractStatus.status === 'critical' && 'animate-pulse'
          )}
          style={{ width: `${getProgressPercent()}%` }}
        />
      </div>
    </div>
  );
}
