import { AlertTriangle, ExternalLink, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PremiumCard, PremiumCardHeader, PremiumCardContent } from '@/components/ui/premium-card';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RiskExposureWidgetProps {
  snapshotId?: string;
}

interface RiskData {
  high: number;
  medium: number;
  low: number;
  total: number;
  overdue: number;
}

export function StrategicGoalsWidget({ snapshotId }: RiskExposureWidgetProps) {
  const navigate = useNavigate();
  
  const { data: riskData, isLoading } = useQuery<RiskData>({
    queryKey: ['risk-exposure', snapshotId],
    queryFn: async () => {
      const { data: risks } = await supabase
        .from('risks')
        .select('impact, target_resolution_date, status')
        .not('status', 'eq', 'Closed');

      const riskList = risks || [];
      const today = new Date();
      
      // Calculate severity based on impact string (Critical, High, Medium, Low)
      const getSeverity = (r: { impact?: string | null }) => {
        const impact = (r.impact || '').toLowerCase();
        if (impact === 'critical' || impact === 'high' || impact === '5' || impact === '4') return 'high';
        if (impact === 'medium' || impact === '3') return 'medium';
        return 'low';
      };

      const high = riskList.filter(r => getSeverity(r) === 'high').length;
      const medium = riskList.filter(r => getSeverity(r) === 'medium').length;
      const low = riskList.filter(r => getSeverity(r) === 'low').length;
      
      const overdue = riskList.filter(r => {
        if (!r.target_resolution_date) return false;
        return new Date(r.target_resolution_date) < today;
      }).length;

      return { high, medium, low, total: riskList.length, overdue };
    },
    enabled: !!snapshotId,
  });

  const handleOpenRisks = () => navigate('/enterprise/risks');

  if (isLoading) {
    return (
      <PremiumCard className="h-full flex flex-col">
        <PremiumCardHeader title="Risk Exposure" />
        <PremiumCardContent className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
        </PremiumCardContent>
      </PremiumCard>
    );
  }

  const { high = 0, medium = 0, low = 0, total = 0, overdue = 0 } = riskData || {};

  const headerAction = (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0"
      onClick={handleOpenRisks}
      title="Open Risks"
    >
      <ExternalLink className="h-3.5 w-3.5" style={{ color: 'var(--text-3)' }} />
    </Button>
  );

  return (
    <PremiumCard className="h-full flex flex-col">
      <PremiumCardHeader title="Risk Exposure" action={headerAction} />
      <PremiumCardContent className="flex-1 py-2">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[100px] gap-2">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'hsl(var(--secondary-green) / 0.1)' }}
            >
              <ShieldAlert className="w-4 h-4" style={{ color: 'hsl(var(--secondary-green))' }} />
            </div>
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-1)' }}>
              No risks logged
            </p>
            <Button variant="outline" size="sm" className="h-7 text-[12px]" onClick={handleOpenRisks}>
              Open Risks
            </Button>
          </div>
        ) : (
          <div className="space-y-0">
            {/* Severity rows */}
            <div 
              className="flex items-center justify-between py-2"
              style={{ borderBottom: '1px solid var(--divider)' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-[14px] font-medium" style={{ color: 'var(--text-1)' }}>High</span>
              </div>
              <span className="text-[16px] font-bold" style={{ color: high > 0 ? 'hsl(var(--destructive))' : 'var(--text-3)' }}>
                {high}
              </span>
            </div>
            <div 
              className="flex items-center justify-between py-2"
              style={{ borderBottom: '1px solid var(--divider)' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-[14px] font-medium" style={{ color: 'var(--text-1)' }}>Medium</span>
              </div>
              <span className="text-[16px] font-bold" style={{ color: medium > 0 ? 'hsl(var(--warning))' : 'var(--text-3)' }}>
                {medium}
              </span>
            </div>
            <div 
              className="flex items-center justify-between py-2"
              style={{ borderBottom: '1px solid var(--divider)' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-[14px] font-medium" style={{ color: 'var(--text-1)' }}>Low</span>
              </div>
              <span className="text-[16px] font-bold" style={{ color: 'var(--text-3)' }}>
                {low}
              </span>
            </div>

            {/* Overdue mitigations */}
            {overdue > 0 && (
              <div 
                className="flex items-center justify-between py-2 mt-1"
                style={{ borderTop: '1px solid var(--divider)' }}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'hsl(var(--destructive))' }} />
                  <span className="text-[13px]" style={{ color: 'var(--text-2)' }}>Overdue mitigations</span>
                </div>
                <span className="text-[14px] font-bold" style={{ color: 'hsl(var(--destructive))' }}>
                  {overdue}
                </span>
              </div>
            )}
          </div>
        )}
      </PremiumCardContent>
    </PremiumCard>
  );
}
