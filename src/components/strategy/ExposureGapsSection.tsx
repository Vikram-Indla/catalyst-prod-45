/**
 * ExposureGapsSection — CIO Cockpit exposure surface
 * Clean 3-column executive block with equal weight cards
 * Compact rows, thin bars, improved scannability
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

  // Skeleton only on first load
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
          className="px-4 py-1.5"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="h-3 w-28 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
        </div>
        <div className="p-2.5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            {['c1', 'c2', 'c3'].map((key) => (
              <div 
                key={key}
                className="rounded-md min-h-[120px] animate-pulse"
                style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
              />
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
        className="px-4 py-1.5 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <Shield size={12} style={{ color: 'var(--status-danger)' }} />
          <h2 
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-secondary)' }}
          >
            Exposure & Gaps
          </h2>
        </div>
        {isUpdating && (
          <div className="flex items-center gap-1">
            <Loader2 size={10} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Updating…</span>
          </div>
        )}
      </div>

      <div className="p-2.5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          {/* Risk Exposure Column */}
          <CockpitCard
            title="Risk Exposure"
            icon={<Shield size={11} />}
            iconColor="text-status-danger"
            cta={{ label: 'View all', onClick: () => navigate('/enterprise/risks') }}
          >
            <div className="space-y-0.5">
              <DataRow 
                label="Critical/High" 
                value={displayData.highRisks} 
                total={displayData.totalRisks}
                variant={displayData.highRisks > 0 ? 'danger' : 'muted'} 
                showBar
              />
              <DataRow 
                label="Medium" 
                value={displayData.mediumRisks} 
                total={displayData.totalRisks}
                variant={displayData.mediumRisks > 0 ? 'warning' : 'muted'} 
                showBar
              />
              <DataRow 
                label="Low" 
                value={displayData.lowRisks} 
                total={displayData.totalRisks}
                variant="muted" 
                showBar
              />
            </div>

            {displayData.overdueRisks > 0 && (
              <div className="pt-1.5 mt-1.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Clock size={9} className="text-status-danger" />
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Overdue</span>
                  </div>
                  <span className="text-[10px] font-semibold tabular-nums text-status-danger">
                    {displayData.overdueRisks}
                  </span>
                </div>
              </div>
            )}
          </CockpitCard>

          {/* Alignment Gaps Column */}
          <CockpitCard
            title="Alignment Gaps"
            icon={<Target size={11} />}
            iconColor="text-secondary-bronze"
            cta={{ label: 'View backlog', onClick: () => navigate('/enterprise/backlog') }}
          >
            <div className="space-y-0.5">
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

            <div className="pt-1.5 mt-1.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>Total gaps</span>
                <span className={cn(
                  "text-sm font-bold tabular-nums",
                  displayData.alignmentGaps > 0 ? "text-secondary-bronze" : ""
                )} style={displayData.alignmentGaps === 0 ? { color: 'var(--text-muted)' } : {}}>
                  {displayData.alignmentGaps}
                </span>
              </div>
            </div>
          </CockpitCard>

          {/* Needs Attention Column */}
          <CockpitCard
            title="Needs Attention"
            icon={<AlertTriangle size={11} />}
            iconColor="text-status-warning"
          >
            {attentionItems.length === 0 ? (
              <div className="py-2 text-center">
                <CheckCircle2 size={14} className="mx-auto mb-0.5 text-status-success" />
                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>No items need attention</span>
              </div>
            ) : (
              <div className="space-y-0.5">
                {attentionItems.slice(0, 4).map((item) => (
                  <AttentionRow key={item.id} item={item} onClick={() => navigate(item.link)} />
                ))}
                {attentionItems.length > 4 && (
                  <div className="text-center pt-0.5">
                    <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>
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
        minHeight: '120px',
      }}
    >
      <div 
        className="px-2.5 py-1.5 flex items-center gap-1.5"
        style={{ 
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--surface-3)'
        }}
      >
        <span className={iconColor}>{icon}</span>
        <span 
          className="text-[9px] font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-muted)' }}
        >
          {title}
        </span>
      </div>
      
      <div className="p-2 flex-1">{children}</div>

      {cta && (
        <div className="px-2 pb-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-5 text-[9px] hover:bg-[var(--surface-hover)] focus-visible:ring-1"
            style={{ color: 'var(--text-muted)' }}
            onClick={cta.onClick}
          >
            {cta.label}
            <ChevronRight size={9} className="ml-0.5" />
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
      <span className="text-[9px] flex-1" style={{ color: 'var(--text-muted)' }}>{label}</span>
      {showBar && total > 0 && (
        <div 
          className="w-10 h-[3px] rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--border-default)' }}
        >
          <div 
            className="h-full rounded-full transition-all"
            style={{ width: `${barWidth}%`, backgroundColor: barColors[variant], opacity: variant === 'muted' ? 0.3 : 1 }}
          />
        </div>
      )}
      <span 
        className="text-[10px] font-semibold tabular-nums w-4 text-right"
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
      className="w-full px-1 py-1 rounded text-left flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group"
      style={{ backgroundColor: 'transparent' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
      }}
    >
      <div 
        className="w-1 h-1 rounded-full flex-shrink-0"
        style={{ backgroundColor: severityColors[item.severity] }}
      />
      <div className="flex-1 min-w-0">
        <div 
          className="text-[9px] font-medium truncate group-hover:text-[var(--text-primary)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {item.title}
        </div>
        <div className="text-[8px] leading-tight" style={{ color: 'var(--text-muted)' }}>
          {item.reason}
        </div>
      </div>
      <ChevronRight 
        size={9} 
        className="opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" 
        style={{ color: 'var(--text-muted)' }}
      />
    </button>
  );
}
