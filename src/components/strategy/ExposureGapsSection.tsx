/**
 * ExposureGapsSection — Executive cockpit-style exposure surface
 * Compact rows, micro-visuals, aligned cards
 * Uses keepPreviousData pattern to prevent blanking on snapshot switch
 */

import { useRef } from 'react';
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
  CheckCircle2,
  RefreshCw
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
  
  // Store last valid data to prevent blanking
  const lastValidDataRef = useRef<{
    atRiskObjectives: any[];
    misalignedEpics: number;
    misalignedFeatures: number;
    riskData: { total: number; high: number; medium: number; low: number; overdue: number; topRisks: any[] };
  } | null>(null);
  
  const { data: okrMetrics, isLoading: okrLoading, isFetching: okrFetching } = useOKRv2StrategyMetrics(snapshotId);
  const { data: counts, isLoading: countsLoading, isFetching: countsFetching } = useStrategyPyramidCounts(snapshotId);

  const { data: riskData, isLoading: risksLoading, isFetching: risksFetching } = useQuery({
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
    staleTime: 60 * 1000, // 60 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });

  const isInitialLoading = okrLoading || countsLoading || risksLoading;
  const isRefreshing = (okrFetching || countsFetching || risksFetching) && !isInitialLoading;

  const atRiskObjectives = okrMetrics?.objectives?.filter(obj => {
    const health = (obj.health || '').toLowerCase();
    return health === 'at_risk' || health === 'poor';
  }) || [];

  const misalignedEpics = counts?.misalignedEpics ?? 0;
  const misalignedFeatures = counts?.misalignedFeatures ?? 0;

  // Update last valid data when we have real data
  if (!isInitialLoading && riskData) {
    lastValidDataRef.current = {
      atRiskObjectives,
      misalignedEpics,
      misalignedFeatures,
      riskData,
    };
  }

  // Use last valid data during initial load, or current data
  const displayData = isInitialLoading && lastValidDataRef.current 
    ? lastValidDataRef.current 
    : {
        atRiskObjectives,
        misalignedEpics,
        misalignedFeatures,
        riskData: riskData ?? { total: 0, high: 0, medium: 0, low: 0, overdue: 0, topRisks: [] },
      };

  const alignmentGaps = displayData.misalignedEpics + displayData.misalignedFeatures;
  const highRisks = displayData.riskData.high;
  const overdueRisks = displayData.riskData.overdue;
  const totalRisks = displayData.riskData.total;

  // Build "Needs Attention" list
  const attentionItems: AttentionItem[] = [];
  
  displayData.atRiskObjectives.slice(0, 2).forEach(obj => {
    attentionItems.push({
      id: obj.id,
      type: 'objective',
      title: obj.name || 'Unnamed Objective',
      reason: 'At risk',
      severity: 'high',
      link: '/enterprise/okr-hub',
    });
  });

  (displayData.riskData.topRisks || []).slice(0, 2).forEach(risk => {
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
      reason: `${displayData.misalignedEpics} epics, ${displayData.misalignedFeatures} features`,
      severity: alignmentGaps > 5 ? 'high' : 'medium',
      link: '/enterprise/backlog',
    });
  }

  // Only show skeleton on true initial load with no cached data
  if (isInitialLoading && !lastValidDataRef.current) {
    return (
      <section 
        className="rounded-lg overflow-hidden"
        style={{ 
          backgroundColor: 'var(--surface-bg)', 
          border: '1px solid var(--border-default)' 
        }}
      >
        <div 
          className="px-4 py-2"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="h-3.5 w-28 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
        </div>
        <div className="p-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            {[1, 2, 3].map((col) => (
              <div 
                key={col} 
                className="rounded-md overflow-hidden min-h-[140px]"
                style={{ 
                  backgroundColor: 'var(--muted)', 
                  border: '1px solid var(--border)' 
                }}
              >
                <div 
                  className="px-3 py-2 flex items-center gap-2"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <div className="h-3 w-3 rounded animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.15 }} />
                  <div className="h-2.5 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.15 }} />
                </div>
                <div className="p-3 space-y-2">
                  {[1, 2, 3].map((row) => (
                    <div key={row} className="flex items-center justify-between">
                      <div className="h-2.5 w-16 rounded animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.15 }} />
                      <div className="h-3 w-5 rounded animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.15 }} />
                    </div>
                  ))}
                </div>
                <div className="px-3 pb-2.5">
                  <div className="h-6 w-full rounded animate-pulse" style={{ backgroundColor: 'var(--muted-foreground)', opacity: 0.15 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      className="rounded-lg overflow-hidden"
      style={{ 
        backgroundColor: 'var(--surface-bg)', 
        border: '1px solid var(--border-default)' 
      }}
    >
      {/* Section Header */}
      <div 
        className="px-4 py-2 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <h2 
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-primary)' }}
        >
          Exposure & Gaps
        </h2>
        {isRefreshing && (
          <div className="flex items-center gap-1.5">
            <RefreshCw size={10} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Refreshing…</span>
          </div>
        )}
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
                value={displayData.riskData.medium} 
                total={totalRisks}
                variant={displayData.riskData.medium > 0 ? 'warning' : 'muted'} 
                showBar
              />
              <DataRow 
                label="Low" 
                value={displayData.riskData.low} 
                total={totalRisks}
                variant="muted" 
                showBar
              />
            </div>

            {overdueRisks > 0 && (
              <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Clock size={10} className="text-status-danger" />
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Overdue</span>
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
                value={displayData.misalignedEpics} 
                variant={displayData.misalignedEpics > 0 ? 'bronze' : 'muted'} 
              />
              <DataRow 
                label="Unlinked Features" 
                value={displayData.misalignedFeatures} 
                variant={displayData.misalignedFeatures > 0 ? 'bronze' : 'muted'} 
              />
            </div>

            <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Total gaps</span>
                <span className={cn(
                  "text-sm font-bold tabular-nums",
                  alignmentGaps > 0 ? "text-secondary-bronze" : ""
                )} style={alignmentGaps === 0 ? { color: 'var(--text-muted)' } : {}}>
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
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>No items need attention</span>
              </div>
            ) : (
              <div className="space-y-0.5">
                {attentionItems.slice(0, 4).map((item) => (
                  <AttentionRow key={item.id} item={item} onClick={() => navigate(item.link)} />
                ))}
                {attentionItems.length > 4 && (
                  <div className="text-center pt-1">
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
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
    <div 
      className="rounded-md overflow-hidden flex flex-col"
      style={{ 
        backgroundColor: 'var(--surface-2)', 
        border: '1px solid var(--border-subtle)' 
      }}
    >
      <div 
        className="px-3 py-1.5 flex items-center gap-1.5"
        style={{ 
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--surface-3)'
        }}
      >
        <span className={iconColor}>{icon}</span>
        <span 
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-muted)' }}
        >
          {title}
        </span>
      </div>
      
      <div className="p-2.5 flex-1">{children}</div>

      {cta && (
        <div className="px-2.5 pb-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-6 text-[10px] hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--text-muted)' }}
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
  const valueColors: Record<string, string> = {
    muted: 'var(--text-muted)',
    danger: 'var(--status-danger)',
    warning: 'var(--status-warning)',
    bronze: 'var(--secondary-bronze)',
  };

  const barColors: Record<string, string> = {
    muted: 'var(--text-muted)',
    danger: 'var(--status-danger)',
    warning: 'var(--status-warning)',
    bronze: 'var(--secondary-bronze)',
  };

  const barWidth = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div 
      className="flex items-center gap-2 py-0.5 rounded px-1 -mx-1 transition-colors"
      style={{ backgroundColor: 'transparent' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
      }}
    >
      <span className="text-[10px] flex-1" style={{ color: 'var(--text-muted)' }}>{label}</span>
      {showBar && total > 0 && (
        <div 
          className="w-12 h-1 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--border-default)' }}
        >
          <div 
            className="h-full rounded-full transition-all"
            style={{ width: `${barWidth}%`, backgroundColor: barColors[variant], opacity: variant === 'muted' ? 0.3 : 1 }}
          />
        </div>
      )}
      <span 
        className="text-[11px] font-semibold tabular-nums w-5 text-right"
        style={{ color: valueColors[variant] }}
      >
        {value}
      </span>
    </div>
  );
}

function AttentionRow({ item, onClick }: { item: AttentionItem; onClick: () => void }) {
  const severityColors: Record<string, string> = {
    critical: 'var(--status-danger)',
    high: 'var(--status-warning)',
    medium: 'var(--secondary-bronze)',
  };

  return (
    <button
      onClick={onClick}
      className="w-full px-1.5 py-1.5 rounded text-left flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group"
      style={{ backgroundColor: 'transparent' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
      }}
    >
      <div 
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: severityColors[item.severity] }}
      />
      <div className="flex-1 min-w-0">
        <div 
          className="text-[10px] font-medium truncate leading-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {item.title}
        </div>
        <div 
          className="text-[9px] leading-tight"
          style={{ color: 'var(--text-muted)' }}
        >
          {item.reason}
        </div>
      </div>
      <ChevronRight 
        size={10} 
        className="flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" 
        style={{ color: 'var(--text-muted)' }}
      />
    </button>
  );
}
