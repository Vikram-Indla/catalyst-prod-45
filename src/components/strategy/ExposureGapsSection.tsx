/**
 * ExposureGapsSection — CIO Cockpit exposure surface
 * Clean 3-column executive block with equal weight cards
 * Compact rows, thin bars, improved scannability
 * 
 * Typography Lock Rules (parity with Strategic Pulse):
 * - Section title: text-xs font-semibold text-secondary
 * - Card headings: text-xs uppercase tracking-wide text-secondary
 * - Values: text-base font-medium text-primary (or colored for warnings)
 * - Supporting rows: text-sm text-secondary
 */

import { useNavigate } from 'react-router-dom';
import { useStrategyRoomSummary, EMPTY_SUMMARY } from '@/hooks/useStrategyRoomSummary';
import { 
  AlertTriangle, 
  Shield, 
  Target, 
  Clock, 
  ChevronRight,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

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
  
  const { data, isLoading, isFetching, hasData } = useStrategyRoomSummary(snapshotId);
  
  const displayData = data ?? EMPTY_SUMMARY;

  const attentionItems = useMemo((): AttentionItem[] => {
    const items: AttentionItem[] = [];
    
    (displayData.atRiskObjectives || []).slice(0, 2).forEach(obj => {
      items.push({
        id: `obj-${obj.id}`,
        type: 'objective',
        title: obj.name || 'Unnamed Objective',
        reason: 'At risk',
        severity: 'high',
        link: '/enterprise/okr-hub',
      });
    });

    (displayData.topRisks || []).slice(0, 2).forEach(risk => {
      items.push({
        id: `risk-${risk.id}`,
        type: 'risk',
        title: risk.title || 'Unnamed Risk',
        reason: 'High severity',
        severity: 'critical',
        link: '/enterprise/risks',
      });
    });

    if (displayData.alignmentGaps > 0) {
      items.push({
        id: 'alignment-gaps',
        type: 'gap',
        title: `${displayData.alignmentGaps} Alignment Gap${displayData.alignmentGaps !== 1 ? 's' : ''}`,
        reason: `${displayData.misalignedEpics} epics, ${displayData.misalignedFeatures} features`,
        severity: displayData.alignmentGaps > 5 ? 'high' : 'medium',
        link: '/enterprise/backlog',
      });
    }

    return items;
  }, [displayData.atRiskObjectives, displayData.topRisks, displayData.alignmentGaps, displayData.misalignedEpics, displayData.misalignedFeatures]);

  // Skeleton only on first load - matches final layout dimensions
  if (isLoading && !hasData) {
    return (
      <section 
        className="rounded-lg overflow-hidden"
        style={{ 
          backgroundColor: 'var(--surface-bg)', 
          border: '1px solid var(--border-default)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div 
          className="px-4 py-2.5"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="p-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {['c1', 'c2', 'c3'].map((key) => (
              <div 
                key={key}
                className="rounded-md p-3"
                style={{ 
                  backgroundColor: 'var(--surface-2)', 
                  border: '1px solid var(--border-subtle)',
                  minHeight: '140px',
                }}
              >
                <Skeleton className="h-3 w-24 mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const isUpdating = isFetching && hasData;

  return (
    <section 
      className="rounded-lg overflow-hidden"
      style={{ 
        backgroundColor: 'var(--surface-bg)', 
        border: '1px solid var(--border-default)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Section Header */}
      <div 
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <Shield size={14} style={{ color: 'var(--status-danger)' }} />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary">
            Exposure & Gaps
          </h2>
        </div>
        {isUpdating && (
          <div className="flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin text-secondary" />
            <span className="text-xs text-secondary">Refreshing…</span>
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Risk Exposure Column */}
          <CockpitCard
            title="Risk Exposure"
            icon={<Shield size={14} />}
            iconColor="text-status-danger"
            cta={{ label: 'View all', onClick: () => navigate('/enterprise/risks') }}
          >
            <div className="space-y-1">
              <DataRow 
                label="Critical/High" 
                value={displayData.highRisks} 
                total={displayData.totalRisks}
                variant={displayData.highRisks > 0 ? 'danger' : 'neutral'} 
                showBar
              />
              <DataRow 
                label="Medium" 
                value={displayData.mediumRisks} 
                total={displayData.totalRisks}
                variant={displayData.mediumRisks > 0 ? 'warning' : 'neutral'} 
                showBar
              />
              <DataRow 
                label="Low" 
                value={displayData.lowRisks} 
                total={displayData.totalRisks}
                variant="neutral" 
                showBar
              />
            </div>

            {displayData.overdueRisks > 0 && (
              <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-status-danger" />
                    <span className="text-sm text-secondary">Overdue</span>
                  </div>
                  <span className="text-base font-semibold tabular-nums text-status-danger">
                    {displayData.overdueRisks}
                  </span>
                </div>
              </div>
            )}
          </CockpitCard>

          {/* Alignment Gaps Column */}
          <CockpitCard
            title="Alignment Gaps"
            icon={<Target size={14} />}
            iconColor="text-secondary-bronze"
            cta={{ label: 'View backlog', onClick: () => navigate('/enterprise/backlog') }}
          >
            <div className="space-y-1">
              <DataRow label="Orphan Themes" value={0} variant="neutral" />
              <DataRow 
                label="Unlinked Epics" 
                value={displayData.misalignedEpics} 
                variant={displayData.misalignedEpics > 0 ? 'bronze' : 'neutral'} 
              />
              <DataRow 
                label="Unlinked Features" 
                value={displayData.misalignedFeatures} 
                variant={displayData.misalignedFeatures > 0 ? 'bronze' : 'neutral'} 
              />
            </div>

            <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-secondary">Total gaps</span>
                <span className={cn(
                  "text-xl font-bold tabular-nums",
                  displayData.alignmentGaps > 0 ? "text-secondary-bronze" : "text-primary"
                )}>
                  {displayData.alignmentGaps}
                </span>
              </div>
            </div>
          </CockpitCard>

          {/* Needs Attention Column */}
          <CockpitCard
            title="Needs Attention"
            icon={<AlertTriangle size={14} />}
            iconColor="text-status-warning"
          >
            {attentionItems.length === 0 ? (
              <div className="py-3 text-center">
                <CheckCircle2 size={18} className="mx-auto mb-1 text-status-success" />
                <span className="text-sm text-secondary">No items need attention</span>
              </div>
            ) : (
              <div className="space-y-1">
                {attentionItems.slice(0, 4).map((item) => (
                  <AttentionRow key={item.id} item={item} onClick={() => navigate(item.link)} />
                ))}
                {attentionItems.length > 4 && (
                  <div className="text-center pt-1">
                    <span className="text-xs text-secondary">
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
        border: '1px solid var(--border-subtle)',
        minHeight: '140px',
      }}
    >
      {/* Card header: text-xs uppercase tracking-wide text-secondary */}
      <div 
        className="px-3 py-2 flex items-center gap-2"
        style={{ 
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--surface-3)'
        }}
      >
        <span className={iconColor}>{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-secondary">
          {title}
        </span>
      </div>
      
      <div className="p-3 flex-1">{children}</div>

      {cta && (
        <div className="px-3 pb-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs text-secondary hover:bg-[var(--surface-hover)] focus-visible:ring-1"
            onClick={cta.onClick}
          >
            {cta.label}
            <ChevronRight size={12} className="ml-1" />
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
  variant?: 'neutral' | 'danger' | 'warning' | 'bronze';
  showBar?: boolean;
}

function DataRow({ label, value, total = 0, variant = 'neutral', showBar }: DataRowProps) {
  // Values use text-primary for neutral, colored for status variants
  const valueColors: Record<string, string> = {
    neutral: 'var(--text-primary)',
    danger: 'var(--status-danger)',
    warning: 'var(--status-warning)',
    bronze: 'var(--secondary-bronze)',
  };

  const barColors: Record<string, string> = {
    neutral: 'var(--text-secondary)',
    danger: 'var(--status-danger)',
    warning: 'var(--status-warning)',
    bronze: 'var(--secondary-bronze)',
  };

  const barWidth = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div 
      className="flex items-center gap-2 py-1 rounded px-1.5 -mx-1.5 transition-colors hover:bg-[var(--surface-hover)]"
    >
      {/* Label: text-sm text-secondary */}
      <span className="text-sm text-secondary flex-1">{label}</span>
      
      {showBar && total > 0 && (
        <div 
          className="w-12 h-1 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--border-default)' }}
        >
          <div 
            className="h-full rounded-full transition-all"
            style={{ 
              width: `${barWidth}%`, 
              backgroundColor: barColors[variant], 
              opacity: variant === 'neutral' ? 0.4 : 1 
            }}
          />
        </div>
      )}
      
      {/* Value: text-base font-medium */}
      <span 
        className="text-base font-medium tabular-nums w-6 text-right"
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
      className="w-full px-1.5 py-1.5 rounded text-left flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group hover:bg-[var(--surface-hover)]"
    >
      <div 
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: severityColors[item.severity] }}
      />
      <div className="flex-1 min-w-0">
        {/* Title: text-sm font-medium text-primary */}
        <div className="text-sm font-medium text-primary truncate group-hover:text-[var(--brand-primary)]">
          {item.title}
        </div>
        {/* Reason: text-xs text-secondary */}
        <div className="text-xs text-secondary leading-tight">
          {item.reason}
        </div>
      </div>
      <ChevronRight 
        size={12} 
        className="opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0 text-secondary" 
      />
    </button>
  );
}
