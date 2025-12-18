/**
 * ExposureGapsSection — Executive cockpit-style exposure surface
 * Compact rows, micro-visuals, aligned cards
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
  const totalRisks = riskData?.total ?? 0;

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

  if (isLoading) {
    return (
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b border-border">
          <div className="h-3.5 w-28 bg-muted/50 rounded animate-pulse" />
        </div>
        <div className="p-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            {[1, 2, 3].map((col) => (
              <div key={col} className="rounded-md border border-border bg-card overflow-hidden animate-pulse">
                <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                  <div className="h-3 w-3 bg-muted/50 rounded" />
                  <div className="h-2.5 w-20 bg-muted/40 rounded" />
                </div>
                <div className="p-3 space-y-2">
                  {[1, 2, 3].map((row) => (
                    <div key={row} className="flex items-center justify-between">
                      <div className="h-2.5 w-16 bg-muted/30 rounded" />
                      <div className="h-3 w-5 bg-muted/40 rounded" />
                    </div>
                  ))}
                </div>
                <div className="px-3 pb-2.5">
                  <div className="h-6 w-full bg-muted/20 rounded" />
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
      {/* Section Header - compact */}
      <div className="px-4 py-2 border-b border-border">
        <h2 className="text-xs font-semibold text-foreground uppercase tracking-wide">Exposure & Gaps</h2>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          {/* Risk Exposure Column */}
          <CockpitCard
            title="Risk Exposure"
            icon={<Shield size={12} />}
            iconColor="text-status-danger"
            cta={{ label: 'View all risks', onClick: () => navigate('/enterprise/risks') }}
          >
            <div className="space-y-1">
              <DataRow 
                label="Critical/High" 
                value={highRisks} 
                total={totalRisks}
                variant={highRisks > 0 ? 'danger' : 'muted'} 
                showBar
              />
              <DataRow 
                label="Medium" 
                value={riskData?.medium ?? 0} 
                total={totalRisks}
                variant={(riskData?.medium ?? 0) > 0 ? 'warning' : 'muted'} 
                showBar
              />
              <DataRow 
                label="Low" 
                value={riskData?.low ?? 0} 
                total={totalRisks}
                variant="muted" 
                showBar
              />
            </div>

            {overdueRisks > 0 && (
              <div className="pt-2 mt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Clock size={10} className="text-status-danger" />
                    <span className="text-[10px] text-muted-foreground">Overdue</span>
                  </div>
                  <span className="text-[11px] font-semibold tabular-nums text-status-danger">
                    {overdueRisks}
                  </span>
                </div>
              </div>
            )}
          </CockpitCard>

          {/* Alignment Gaps Column */}
          <CockpitCard
            title="Alignment Gaps"
            icon={<Target size={12} />}
            iconColor="text-secondary-bronze"
            cta={{ label: 'View backlog', onClick: () => navigate('/enterprise/backlog') }}
          >
            <div className="space-y-1">
              <DataRow label="Orphan Themes" value={0} variant="muted" />
              <DataRow 
                label="Unlinked Epics" 
                value={misalignedEpics} 
                variant={misalignedEpics > 0 ? 'bronze' : 'muted'} 
              />
              <DataRow 
                label="Unlinked Features" 
                value={misalignedFeatures} 
                variant={misalignedFeatures > 0 ? 'bronze' : 'muted'} 
              />
            </div>

            <div className="pt-2 mt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground">Total gaps</span>
                <span className={cn(
                  "text-sm font-bold tabular-nums",
                  alignmentGaps > 0 ? "text-secondary-bronze" : "text-muted-foreground"
                )}>
                  {alignmentGaps}
                </span>
              </div>
            </div>
          </CockpitCard>

          {/* Needs Attention Column */}
          <CockpitCard
            title="Needs Attention"
            icon={<AlertTriangle size={12} />}
            iconColor="text-status-warning"
          >
            {attentionItems.length === 0 ? (
              <div className="py-3 text-center">
                <CheckCircle2 size={16} className="mx-auto mb-1 text-status-success" />
                <span className="text-[10px] text-muted-foreground">No items need attention</span>
              </div>
            ) : (
              <div className="space-y-0.5">
                {attentionItems.slice(0, 4).map((item) => (
                  <AttentionRow key={item.id} item={item} onClick={() => navigate(item.link)} />
                ))}
                {attentionItems.length > 4 && (
                  <div className="text-center pt-1">
                    <span className="text-[9px] text-muted-foreground">
                      +{attentionItems.length - 4} more
                    </span>
                  </div>
                )}
              </div>
            )}
          </CockpitCard>
        </div>
      </div>
    </section>
  );
}

interface CockpitCardProps {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  children: React.ReactNode;
  cta?: { label: string; onClick: () => void };
}

function CockpitCard({ title, icon, iconColor, children, cta }: CockpitCardProps) {
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden flex flex-col">
      <div className="px-3 py-1.5 border-b border-border flex items-center gap-1.5 bg-muted/30">
        <span className={iconColor}>{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
      </div>
      
      <div className="p-2.5 flex-1">{children}</div>

      {cta && (
        <div className="px-2.5 pb-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-6 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50"
            onClick={cta.onClick}
          >
            {cta.label}
            <ChevronRight size={10} className="ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

interface DataRowProps {
  label: string;
  value: number;
  total?: number;
  variant?: 'muted' | 'danger' | 'warning' | 'bronze';
  showBar?: boolean;
}

function DataRow({ label, value, total = 0, variant = 'muted', showBar }: DataRowProps) {
  const valueColors = {
    muted: 'text-muted-foreground',
    danger: 'text-status-danger',
    warning: 'text-status-warning',
    bronze: 'text-secondary-bronze',
  };

  const barColors = {
    muted: 'bg-muted-foreground/30',
    danger: 'bg-status-danger',
    warning: 'bg-status-warning',
    bronze: 'bg-secondary-bronze',
  };

  const barWidth = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2 py-0.5 group hover:bg-muted/30 rounded px-1 -mx-1 transition-colors">
      <span className="text-[10px] text-muted-foreground flex-1">{label}</span>
      {showBar && total > 0 && (
        <div className="w-12 h-1 rounded-full bg-border overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all", barColors[variant])}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      )}
      <span className={cn("text-[11px] font-semibold tabular-nums w-5 text-right", valueColors[variant])}>
        {value}
      </span>
    </div>
  );
}

function AttentionRow({ item, onClick }: { item: AttentionItem; onClick: () => void }) {
  const severityDots = {
    critical: 'bg-status-danger',
    high: 'bg-status-warning',
    medium: 'bg-secondary-bronze',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-1.5 py-1 rounded text-left flex items-center gap-2 transition-colors",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group"
      )}
    >
      <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", severityDots[item.severity])} />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-medium text-foreground truncate leading-tight">{item.title}</div>
        <div className="text-[9px] text-muted-foreground leading-tight">{item.reason}</div>
      </div>
      <ChevronRight size={10} className="text-muted-foreground/40 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
