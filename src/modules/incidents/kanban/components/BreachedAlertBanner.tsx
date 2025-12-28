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
    <div className="mx-4 sm:mx-6 mb-4 px-[18px] py-3.5 flex items-center justify-between rounded-[10px]"
      style={{
        backgroundColor: 'var(--status-danger-bg)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--status-danger-border)',
      }}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-6 w-6" style={{ color: 'var(--status-danger)' }} />
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold" style={{ color: 'var(--status-danger)' }}>
            {breachedCount} SLA {breachedCount === 1 ? 'Breach' : 'Breaches'}
          </span>
          <span className="text-sm opacity-90" style={{ color: 'var(--status-danger)' }}>
            Immediate attention required
          </span>
        </div>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        className="font-semibold transition-colors"
        style={{
          borderColor: 'var(--status-danger)',
          color: 'var(--status-danger)',
        }}
        onClick={onViewBreached}
      >
        View Breached Only
      </Button>
    </div>
  );
});

export default BreachedAlertBanner;
