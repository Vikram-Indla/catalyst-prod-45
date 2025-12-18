/**
 * ExposureGapsSection — Executive table-like exposure surface
 * Compact rows, clear labels, subtle styling
 */

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOKRv2StrategyMetrics } from '@/hooks/useOKRv2StrategyMetrics';
import { useStrategyPyramidCounts } from '@/hooks/useExecutionMetrics';
import { 
  AlertTriangle, 
  Shield, 
  Target, 
  Clock, 
  ChevronRight,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ExposureGapsSectionProps {
  snapshotId?: string;
}

interface AttentionItem {
  id: string;
  type: 'objective' | 'risk' | 'gap';
  title: string;
  reason: string;
  severity: 'critical' | 'high' | 'medium';
  link: string;
}

export function ExposureGapsSection({ snapshotId }: ExposureGapsSectionProps) {
  const navigate = useNavigate();
  
  const { data: okrMetrics, isLoading: okrLoading } = useOKRv2StrategyMetrics(snapshotId);
  const { data: counts, isLoading: countsLoading } = useStrategyPyramidCounts(snapshotId);

  const { data: riskData, isLoading: risksLoading } = useQuery({
    queryKey: ['exposure-risks', snapshotId],
    queryFn: async () => {
      const { data: risks } = await supabase
        .from('risks')
        .select('id, title, impact, status, target_resolution_date')
        .not('status', 'eq', 'Closed')
        .order('impact', { ascending: false })
        .limit(10);

      const riskList = risks || [];
      const today = new Date();
      
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
      });

      const topRisks = riskList.filter(r => getSeverity(r) === 'high').slice(0, 3);

      return { 
        total: riskList.length, 
        high, 
        medium, 
        low, 
        overdue: overdue.length,
        topRisks 
      };
    },
  });

  const isLoading = okrLoading || countsLoading || risksLoading;

  const atRiskObjectives = okrMetrics?.objectives?.filter(obj => {
    const health = (obj.health || '').toLowerCase();
    return health === 'at_risk' || health === 'poor';
  }) || [];

  const misalignedEpics = counts?.misalignedEpics ?? 0;
  const misalignedFeatures = counts?.misalignedFeatures ?? 0;
  const alignmentGaps = misalignedEpics + misalignedFeatures;

  const highRisks = riskData?.high ?? 0;
  const overdueRisks = riskData?.overdue ?? 0;

  // Build "Needs Attention" list
  const attentionItems: AttentionItem[] = [];
  
  atRiskObjectives.slice(0, 2).forEach(obj => {
    attentionItems.push({
      id: obj.id,
      type: 'objective',
      title: obj.name || 'Unnamed Objective',
      reason: 'At risk',
      severity: 'high',
      link: '/enterprise/okr-hub',
    });
  });

  (riskData?.topRisks || []).slice(0, 2).forEach(risk => {
    attentionItems.push({
      id: risk.id,
      type: 'risk',
      title: risk.title || 'Unnamed Risk',
      reason: 'High severity',
      severity: 'critical',
      link: '/enterprise/risks',
    });
  });

  if (alignmentGaps > 0) {
    attentionItems.push({
      id: 'alignment-gaps',
      type: 'gap',
      title: `${alignmentGaps} Alignment Gap${alignmentGaps !== 1 ? 's' : ''}`,
      reason: `${misalignedEpics} epics, ${misalignedFeatures} features`,
      severity: alignmentGaps > 5 ? 'high' : 'medium',
      link: '/enterprise/backlog',
    });
  }

  const hasExposure = highRisks > 0 || atRiskObjectives.length > 0 || alignmentGaps > 0 || overdueRisks > 0;

  if (isLoading) {
    return (
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <div className="h-4 w-32 bg-muted/50 rounded animate-pulse" />
          <div className="h-3 w-44 bg-muted/30 rounded animate-pulse mt-1" />
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((col) => (
              <div key={col} className="rounded-md border border-border bg-muted/20 overflow-hidden animate-pulse">
                <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                  <div className="h-3.5 w-3.5 bg-muted/50 rounded" />
                  <div className="h-3 w-24 bg-muted/50 rounded" />
                </div>
                <div className="p-3 space-y-2">
                  {[1, 2, 3].map((row) => (
                    <div key={row} className="flex items-center justify-between py-0.5">
                      <div className="h-2.5 w-20 bg-muted/40 rounded" />
                      <div className="h-3 w-6 bg-muted/40 rounded" />
                    </div>
                  ))}
                </div>
                <div className="px-3 pb-3">
                  <div className="h-7 w-full bg-muted/30 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Section Header */}
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasExposure && <AlertCircle size={14} className="text-status-warning" />}
          <div>
            <h2 className="text-sm font-semibold text-foreground">Exposure & Gaps</h2>
            <p className="text-[11px] text-muted-foreground">Where could strategy fail?</p>
          </div>
        </div>
        {!hasExposure && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-status-success/10 text-status-success">
            <CheckCircle2 size={10} />
            No critical exposure
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Risk Exposure Column */}
          <div className="rounded-md border border-border bg-muted/20 overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center gap-2">
              <Shield size={13} className="text-status-danger" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Risk Exposure
              </span>
            </div>
            
            <div className="p-3 space-y-1.5">
              <TableRow label="Critical/High" value={highRisks} variant={highRisks > 0 ? 'danger' : 'muted'} />
              <TableRow label="Medium" value={riskData?.medium ?? 0} variant={(riskData?.medium ?? 0) > 0 ? 'warning' : 'muted'} />
              <TableRow label="Low" value={riskData?.low ?? 0} variant="muted" />
              
              {overdueRisks > 0 && (
                <div className="pt-1.5 mt-1.5 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock size={11} className="text-status-danger" />
                      <span className="text-[11px] text-muted-foreground">Overdue</span>
                    </div>
                    <span className="text-[12px] font-semibold tabular-nums text-status-danger">
                      {overdueRisks}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="px-3 pb-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/enterprise/risks')}
              >
                View all risks
                <ChevronRight size={12} className="ml-1" />
              </Button>
            </div>
          </div>

          {/* Alignment Gaps Column */}
          <div className="rounded-md border border-border bg-muted/20 overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center gap-2">
              <Target size={13} className="text-secondary-bronze" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Alignment Gaps
              </span>
            </div>
            
            <div className="p-3 space-y-1.5">
              <TableRow label="Orphan Themes" value={0} variant="muted" />
              <TableRow label="Unlinked Epics" value={misalignedEpics} variant={misalignedEpics > 0 ? 'bronze' : 'muted'} />
              <TableRow label="Unlinked Features" value={misalignedFeatures} variant={misalignedFeatures > 0 ? 'bronze' : 'muted'} />
              
              <div className="pt-1.5 mt-1.5 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">Total gaps</span>
                  <span className={cn(
                    "text-sm font-bold tabular-nums",
                    alignmentGaps > 0 ? "text-secondary-bronze" : "text-muted-foreground"
                  )}>
                    {alignmentGaps}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-3 pb-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/enterprise/backlog')}
              >
                View strategic backlog
                <ChevronRight size={12} className="ml-1" />
              </Button>
            </div>
          </div>

          {/* Needs Attention Column */}
          <div className="rounded-md border border-border bg-muted/20 overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center gap-2">
              <AlertTriangle size={13} className="text-status-warning" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Needs Attention
              </span>
            </div>
            
            <div className="p-3">
              {attentionItems.length === 0 ? (
                <div className="py-4 text-center">
                  <CheckCircle2 size={20} className="mx-auto mb-1.5 text-status-success" />
                  <span className="text-[11px] text-muted-foreground">No items need immediate attention</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {attentionItems.slice(0, 4).map((item) => (
                    <AttentionRow key={item.id} item={item} onClick={() => navigate(item.link)} />
                  ))}
                  {attentionItems.length > 4 && (
                    <div className="text-center pt-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        +{attentionItems.length - 4} more
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TableRow({ 
  label, 
  value, 
  variant = 'muted' 
}: { 
  label: string; 
  value: number; 
  variant?: 'muted' | 'danger' | 'warning' | 'bronze';
}) {
  const valueColors = {
    muted: 'text-muted-foreground',
    danger: 'text-status-danger',
    warning: 'text-status-warning',
    bronze: 'text-secondary-bronze',
  };

  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("text-[12px] font-semibold tabular-nums", valueColors[variant])}>
        {value}
      </span>
    </div>
  );
}

function AttentionRow({ item, onClick }: { item: AttentionItem; onClick: () => void }) {
  const severityStyles = {
    critical: 'bg-status-danger/10 text-status-danger',
    high: 'bg-status-warning/10 text-status-warning',
    medium: 'bg-secondary-bronze/10 text-secondary-bronze',
  };

  const typeIcons = {
    objective: Target,
    risk: Shield,
    gap: AlertTriangle,
  };

  const Icon = typeIcons[item.type];

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-2 py-1.5 rounded text-left flex items-center gap-2 transition-colors",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <div className={cn("w-5 h-5 rounded flex-shrink-0 flex items-center justify-center", severityStyles[item.severity])}>
        <Icon size={10} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium text-foreground truncate">{item.title}</div>
        <div className="text-[10px] text-muted-foreground">{item.reason}</div>
      </div>
      <ChevronRight size={12} className="text-muted-foreground/50 flex-shrink-0" />
    </button>
  );
}
