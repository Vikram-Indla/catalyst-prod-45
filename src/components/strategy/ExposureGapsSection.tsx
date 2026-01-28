/**
 * ExposureGapsSection — CIO Cockpit exposure surface
 * Uses ring-fenced --sr-* CSS tokens (V8 design system)
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

  // Skeleton only on first load
  if (isLoading && !hasData) {
    return (
      <section className="sr-section">
        <div className="sr-section-header">
          <Shield size={14} style={{ color: 'var(--sr-status-critical)' }} />
          <span>Exposure & Gaps</span>
        </div>
        <div className="sr-panels-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="sr-panel">
              <div className="sr-skeleton" style={{ height: '20px', width: '120px', marginBottom: 'var(--sr-space-3)' }} />
              <div className="sr-skeleton" style={{ height: '100px' }} />
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
      <div className="sr-section-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sr-space-2)' }}>
          <Shield size={14} style={{ color: 'var(--sr-status-critical)' }} />
          <span>Exposure & Gaps</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sr-space-2)' }}>
          {showStaleIndicator && (
            <span style={{ fontSize: 'var(--sr-font-size-xs)', color: 'var(--sr-text-muted)', fontStyle: 'italic' }}>
              Data may be stale
            </span>
          )}
          {isUpdating && (
            <div className="sr-refreshing">
              <div className="sr-refreshing-spinner" />
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
              <Shield size={14} style={{ color: 'var(--sr-status-critical)' }} />
              <span>Risk Exposure</span>
            </div>
            <a 
              className="sr-panel-link"
              onClick={() => navigate('/enterprise/risks')}
              style={{ cursor: 'pointer' }}
            >
              View all <ChevronRight size={12} style={{ display: 'inline' }} />
            </a>
          </div>
          
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
            <div className="sr-panel-row" style={{ borderTop: '1px solid var(--sr-border)', marginTop: 'var(--sr-space-2)', paddingTop: 'var(--sr-space-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sr-space-2)' }}>
                <Clock size={14} style={{ color: 'var(--sr-status-critical)' }} />
                <span className="sr-panel-row-label">Overdue</span>
              </div>
              <span style={{ fontSize: 'var(--sr-font-size-base)', fontWeight: 'var(--sr-font-weight-semibold)', color: 'var(--sr-status-critical)' }}>
                {displayData.overdueRisks}
              </span>
            </div>
          )}
        </div>

        {/* Alignment Gaps Panel */}
        <div className="sr-panel">
          <div className="sr-panel-header">
            <div className="sr-panel-title">
              <Target size={14} style={{ color: 'var(--sr-status-at-risk)' }} />
              <span>Alignment Gaps</span>
            </div>
            <a 
              className="sr-panel-link"
              onClick={() => navigate('/enterprise/backlog')}
              style={{ cursor: 'pointer' }}
            >
              View backlog <ChevronRight size={12} style={{ display: 'inline' }} />
            </a>
          </div>
          
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

          <div className="sr-panel-row" style={{ borderTop: '1px solid var(--sr-border)', marginTop: 'var(--sr-space-2)', paddingTop: 'var(--sr-space-2)' }}>
            <span style={{ fontSize: 'var(--sr-font-size-base)', fontWeight: 'var(--sr-font-weight-semibold)', color: 'var(--sr-text-muted)' }}>Total gaps</span>
            <span style={{ 
              fontSize: 'var(--sr-font-size-base)', 
              fontWeight: 'var(--sr-font-weight-semibold)',
              color: displayData.alignmentGaps > 0 ? 'var(--sr-status-at-risk)' : 'var(--sr-text-primary)'
            }}>
              {displayData.alignmentGaps}
            </span>
          </div>
        </div>

        {/* Needs Attention Panel */}
        <div className="sr-panel">
          <div className="sr-panel-header">
            <div className="sr-panel-title">
              <AlertTriangle size={14} style={{ color: 'var(--sr-status-at-risk)' }} />
              <span>Needs Attention</span>
            </div>
          </div>
          
          {attentionItems.length === 0 ? (
            <div style={{ padding: 'var(--sr-space-4)', textAlign: 'center' }}>
              <CheckCircle2 size={20} style={{ color: 'var(--sr-status-healthy)', margin: '0 auto var(--sr-space-2)' }} />
              <span style={{ fontSize: 'var(--sr-font-size-base)', color: 'var(--sr-text-muted)' }}>No items need attention</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sr-space-2)' }}>
              {attentionItems.slice(0, 4).map((item) => (
                <AttentionRow key={item.id} item={item} onClick={() => navigate(item.link)} />
              ))}
              {attentionItems.length > 4 && (
                <div style={{ textAlign: 'center', paddingTop: 'var(--sr-space-2)' }}>
                  <span style={{ fontSize: 'var(--sr-font-size-sm)', color: 'var(--sr-accent)', fontWeight: 'var(--sr-font-weight-medium)' }}>
                    +{attentionItems.length - 4} more
                  </span>
                </div>
              )}
            </div>
          )}
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
      case 'danger': return 'var(--sr-status-critical)';
      case 'warning': return 'var(--sr-status-at-risk)';
      default: return 'var(--sr-text-primary)';
    }
  };

  const getBarClass = () => {
    switch (variant) {
      case 'danger': return 'danger';
      case 'warning': return 'warning';
      default: return '';
    }
  };

  return (
    <div className="sr-panel-row">
      <span className="sr-panel-row-label">{label}</span>
      
      <div className="sr-panel-row-value">
        {showBar && total > 0 && (
          <div className="sr-panel-bar">
            <div 
              className={cn("sr-panel-bar-fill", getBarClass())}
              style={{ width: `${barWidth}%`, opacity: variant !== 'neutral' ? 0.8 : 0.5 }}
            />
          </div>
        )}
        
        <span style={{ 
          fontSize: 'var(--sr-font-size-base)', 
          fontWeight: 'var(--sr-font-weight-semibold)', 
          minWidth: '28px', 
          textAlign: 'right',
          color: getValueColor()
        }}>
          {value}
        </span>
      </div>
    </div>
  );
}

function AttentionRow({ item, onClick }: { item: AttentionItem; onClick: () => void }) {
  const getSeverityClass = () => {
    switch (item.severity) {
      case 'critical': return 'critical';
      case 'high': return 'at-risk';
      default: return 'at-risk';
    }
  };

  return (
    <div className="sr-attention-item" onClick={onClick}>
      <div className={cn("sr-attention-dot", getSeverityClass())} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="sr-attention-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </div>
      </div>
      <span style={{ 
        fontSize: 'var(--sr-font-size-sm)', 
        fontWeight: 'var(--sr-font-weight-medium)',
        color: item.severity === 'critical' ? 'var(--sr-status-critical)' : 'var(--sr-status-at-risk)',
        whiteSpace: 'nowrap',
        flexShrink: 0
      }}>
        {item.reason}
      </span>
    </div>
  );
}
