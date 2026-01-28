/**
 * ExposureGapsSection — CIO Cockpit exposure surface
 * Ring-fenced design using sr-* CSS classes from strategy-room.css
 * Clean 3-column executive block with equal weight cards
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
  
  const { data, isLoading, isFetching, hasData, isStale, error } = useStrategyRoomSummary(snapshotId);
  
  const displayData = data ?? EMPTY_SUMMARY;
  const showStaleIndicator = isStale && !isFetching && !!error;

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

  // Skeleton only on first load - uses sr-* classes
  if (isLoading && !hasData) {
    return (
      <section className="sr-section">
        <div className="sr-section-header">
          <div className="sr-skeleton h-4 w-32" />
        </div>
        <div className="sr-panels-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="sr-panel">
              <div className="sr-panel-header">
                <div className="sr-skeleton h-4 w-28" />
              </div>
              <div className="sr-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sr-space-2)' }}>
                <div className="sr-skeleton h-5 w-full" />
                <div className="sr-skeleton h-5 w-full" />
                <div className="sr-skeleton h-5 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const isUpdating = isFetching && hasData;

  return (
    <section className="sr-section">
      {/* Section Header */}
      <div className="sr-section-header">
        <div className="sr-section-title">
          <Shield size={14} style={{ color: 'var(--sr-status-danger)' }} />
          <span className="sr-section-title-text">Exposure & Gaps</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sr-space-2)' }}>
          {showStaleIndicator && (
            <span className="sr-section-subtitle" style={{ fontStyle: 'italic' }}>
              Data may be stale
            </span>
          )}
          {isUpdating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sr-space-1)', fontSize: 'var(--sr-text-xs)', color: 'var(--sr-text-tertiary)' }}>
              <Loader2 size={12} className="animate-spin" />
              <span>Refreshing…</span>
            </div>
          )}
        </div>
      </div>

      <div className="sr-panels-grid">
        {/* Risk Exposure Panel */}
        <div className="sr-panel">
          <div className="sr-panel-header">
            <div className="sr-panel-title">
              <Shield size={14} style={{ color: 'var(--sr-status-danger)' }} />
              <span>Risk Exposure</span>
            </div>
            <button 
              className="sr-panel-action"
              onClick={() => navigate('/enterprise/risks')}
            >
              View all <ChevronRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </button>
          </div>
          <div className="sr-panel-body">
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

            {displayData.overdueRisks > 0 && (
              <div className="sr-panel-row" style={{ borderTop: '1px solid var(--sr-border-light)', marginTop: 'var(--sr-space-2)', paddingTop: 'var(--sr-space-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sr-space-2)' }}>
                  <Clock size={14} style={{ color: 'var(--sr-status-danger)' }} />
                  <span className="sr-panel-row-label">Overdue</span>
                </div>
                <span className="sr-panel-row-value" style={{ color: 'var(--sr-status-danger)' }}>
                  {displayData.overdueRisks}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Alignment Gaps Panel */}
        <div className="sr-panel">
          <div className="sr-panel-header">
            <div className="sr-panel-title">
              <Target size={14} style={{ color: 'var(--sr-status-warning)' }} />
              <span>Alignment Gaps</span>
            </div>
            <button 
              className="sr-panel-action"
              onClick={() => navigate('/enterprise/backlog')}
            >
              View backlog <ChevronRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </button>
          </div>
          <div className="sr-panel-body">
            <DataRow label="Orphan Themes" value={0} variant="neutral" />
            <DataRow 
              label="Unlinked Epics" 
              value={displayData.misalignedEpics} 
              variant={displayData.misalignedEpics > 0 ? 'warning' : 'neutral'} 
            />
            <DataRow 
              label="Unlinked Features" 
              value={displayData.misalignedFeatures} 
              variant={displayData.misalignedFeatures > 0 ? 'warning' : 'neutral'} 
            />

            <div className="sr-panel-row" style={{ borderTop: '1px solid var(--sr-border-light)', marginTop: 'var(--sr-space-2)', paddingTop: 'var(--sr-space-2)' }}>
              <span className="sr-panel-row-label" style={{ fontWeight: 'var(--sr-font-semibold)' }}>Total gaps</span>
              <span className="sr-panel-row-value" style={{ color: displayData.alignmentGaps > 0 ? 'var(--sr-status-warning)' : 'var(--sr-text-primary)' }}>
                {displayData.alignmentGaps}
              </span>
            </div>
          </div>
        </div>

        {/* Needs Attention Panel */}
        <div className="sr-panel">
          <div className="sr-panel-header">
            <div className="sr-panel-title">
              <AlertTriangle size={14} style={{ color: 'var(--sr-status-warning)' }} />
              <span>Needs Attention</span>
            </div>
          </div>
          <div className="sr-panel-body">
            {attentionItems.length === 0 ? (
              <div style={{ padding: 'var(--sr-space-4)', textAlign: 'center' }}>
                <CheckCircle2 size={20} style={{ margin: '0 auto var(--sr-space-2)', color: 'var(--sr-status-success)' }} />
                <span style={{ fontSize: 'var(--sr-text-sm)', color: 'var(--sr-text-secondary)' }}>No items need attention</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sr-space-2)' }}>
                {attentionItems.slice(0, 4).map((item) => (
                  <AttentionRow key={item.id} item={item} onClick={() => navigate(item.link)} />
                ))}
                {attentionItems.length > 4 && (
                  <div style={{ textAlign: 'center', paddingTop: 'var(--sr-space-2)' }}>
                    <span style={{ fontSize: 'var(--sr-text-xs)', color: 'var(--sr-accent)', fontWeight: 'var(--sr-font-medium)' }}>
                      +{attentionItems.length - 4} more
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

interface DataRowProps {
  label: string;
  value: number;
  total?: number;
  variant?: 'neutral' | 'danger' | 'warning';
  showBar?: boolean;
}

function DataRow({ label, value, total = 0, variant = 'neutral', showBar }: DataRowProps) {
  const barWidth = total > 0 ? Math.round((value / total) * 100) : 0;

  const getValueColor = () => {
    switch (variant) {
      case 'danger': return 'var(--sr-status-danger)';
      case 'warning': return 'var(--sr-status-warning)';
      default: return 'var(--sr-text-primary)';
    }
  };

  const getBarColor = () => {
    switch (variant) {
      case 'danger': return 'var(--sr-status-danger)';
      case 'warning': return 'var(--sr-status-warning)';
      default: return 'var(--sr-text-tertiary)';
    }
  };

  return (
    <div className="sr-panel-row">
      <span className="sr-panel-row-label">{label}</span>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sr-space-2)' }}>
        {showBar && total > 0 && (
          <div style={{ 
            width: '56px', 
            height: '6px', 
            borderRadius: 'var(--sr-radius-sm)', 
            overflow: 'hidden', 
            backgroundColor: 'var(--sr-surface-muted)' 
          }}>
            <div 
              style={{ 
                height: '100%', 
                borderRadius: 'var(--sr-radius-sm)', 
                backgroundColor: getBarColor(),
                width: `${barWidth}%`,
                opacity: variant !== 'neutral' ? 0.8 : 0.5,
              }}
            />
          </div>
        )}
        
        <span className="sr-panel-row-value" style={{ color: getValueColor(), minWidth: '28px', textAlign: 'right' }}>
          {value}
        </span>
      </div>
    </div>
  );
}

function AttentionRow({ item, onClick }: { item: AttentionItem; onClick: () => void }) {
  const getSeverityDotColor = () => {
    switch (item.severity) {
      case 'critical': return 'var(--sr-status-danger)';
      case 'high': return 'var(--sr-status-warning)';
      default: return 'var(--sr-status-warning)';
    }
  };

  const getReasonColor = () => {
    switch (item.severity) {
      case 'critical': return 'var(--sr-status-danger-text)';
      case 'high': return 'var(--sr-status-warning-text)';
      default: return 'var(--sr-status-warning-text)';
    }
  };

  return (
    <button
      onClick={onClick}
      className="sr-tree-node"
      style={{ padding: 'var(--sr-space-2)' }}
    >
      {/* Severity dot */}
      <div style={{ 
        width: '8px', 
        height: '8px', 
        borderRadius: '50%', 
        flexShrink: 0, 
        backgroundColor: getSeverityDotColor() 
      }} />
      
      {/* Title */}
      <span className="sr-tree-label" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.title}
      </span>
      
      {/* Reason badge */}
      <span style={{ 
        fontSize: 'var(--sr-text-xs)', 
        whiteSpace: 'nowrap', 
        flexShrink: 0, 
        color: getReasonColor(),
        fontWeight: 'var(--sr-font-medium)',
      }}>
        {item.reason}
      </span>
    </button>
  );
}
