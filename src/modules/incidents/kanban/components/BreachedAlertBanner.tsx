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
    <div 
      className="mx-4 sm:mx-6 mb-4 px-4 py-3.5 flex items-center justify-between rounded-[10px]"
      style={{
        backgroundColor: 'rgba(239, 68, 68, 0.06)',
        border: '1px solid rgba(239, 68, 68, 0.15)',
      }}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5" style={{ color: '#ef4444' }} />
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold" style={{ color: '#ef4444' }}>
            {breachedCount} SLA {breachedCount === 1 ? 'Breach' : 'Breaches'}
          </span>
          <span className="text-sm" style={{ color: 'rgba(239, 68, 68, 0.8)' }}>
            Immediate attention required
          </span>
        </div>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        className="font-semibold transition-colors hover:text-white"
        style={{
          borderColor: '#ef4444',
          color: '#ef4444',
        }}
        onClick={onViewBreached}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#ef4444';
          e.currentTarget.style.color = '#ffffff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#ef4444';
        }}
      >
        View Breached Only
      </Button>
    </div>
  );
});

export default BreachedAlertBanner;
