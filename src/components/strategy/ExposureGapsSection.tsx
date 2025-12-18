/**
 * ExposureGapsSection — Risk exposure + alignment gaps surface
 * Answers "Where could strategy fail?" for executives
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

  // Fetch detailed risk data
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

  // Calculate metrics
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
  
  // Add at-risk objectives
  atRiskObjectives.slice(0, 2).forEach(obj => {
    attentionItems.push({
      id: obj.id,
      type: 'objective',
      title: obj.name || 'Unnamed Objective',
      reason: 'At risk - needs intervention',
      severity: 'high',
      link: '/enterprise/okr-hub',
    });
  });

  // Add high-severity risks
  (riskData?.topRisks || []).slice(0, 2).forEach(risk => {
    attentionItems.push({
      id: risk.id,
      type: 'risk',
      title: risk.title || 'Unnamed Risk',
      reason: 'High severity risk',
      severity: 'critical',
      link: '/enterprise/risks',
    });
  });

  // Add alignment gap indicator
  if (alignmentGaps > 0) {
    attentionItems.push({
      id: 'alignment-gaps',
      type: 'gap',
      title: `${alignmentGaps} Alignment Gap${alignmentGaps !== 1 ? 's' : ''}`,
      reason: `${misalignedEpics} epics, ${misalignedFeatures} features unlinked`,
      severity: alignmentGaps > 5 ? 'high' : 'medium',
      link: '/enterprise/backlog',
    });
  }

  const hasExposure = highRisks > 0 || atRiskObjectives.length > 0 || alignmentGaps > 0 || overdueRisks > 0;

  if (isLoading) {
    return (
      <section 
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--surface-bg)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="p-6 flex items-center justify-center">
          <div 
            className="animate-spin rounded-full h-6 w-6 border-2"
            style={{ borderColor: 'var(--border-accent)', borderTopColor: 'transparent' }}
          />
        </div>
      </section>
    );
  }

  return (
    <section 
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-bg)',
        border: `1px solid ${hasExposure ? 'var(--status-warning)' : 'var(--border-default)'}`,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header */}
      <div 
        className="px-5 py-3 flex items-center justify-between"
        style={{ 
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: hasExposure ? 'var(--status-warning-bg)' : 'transparent',
        }}
      >
        <div>
          <h2 
            className="text-[15px] font-semibold flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            {hasExposure && <AlertCircle size={16} style={{ color: 'var(--status-warning)' }} />}
            Exposure & Gaps
          </h2>
          <p 
            className="text-[12px] mt-0.5"
            style={{ color: 'var(--text-muted)' }}
          >
            Where could strategy fail?
          </p>
        </div>
        {!hasExposure && (
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
            style={{ 
              backgroundColor: 'var(--status-success-bg)',
              color: 'var(--status-success)',
            }}
          >
            <CheckCircle2 size={12} />
            No critical exposure
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Risk Summary */}
          <div 
            className="p-4 rounded-lg"
            style={{
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} style={{ color: '#B85C5C' }} />
              <span 
                className="text-[12px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                Risk Exposure
              </span>
            </div>

            <div className="space-y-2">
              <RiskRow label="Critical/High" count={highRisks} color="#B85C5C" />
              <RiskRow label="Medium" count={riskData?.medium ?? 0} color="#D4A574" />
              <RiskRow label="Low" count={riskData?.low ?? 0} color="#5C7C5C" />
              
              {overdueRisks > 0 && (
                <div 
                  className="flex items-center justify-between pt-2 mt-2"
                  style={{ borderTop: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} style={{ color: 'var(--status-danger)' }} />
                    <span 
                      className="text-[12px]"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Overdue mitigations
                    </span>
                  </div>
                  <span 
                    className="text-[13px] font-semibold tabular-nums"
                    style={{ color: 'var(--status-danger)' }}
                  >
                    {overdueRisks}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/enterprise/risks')}
              className="w-full mt-3 py-1.5 rounded-md text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
              style={{ 
                backgroundColor: 'var(--surface-hover)',
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-active)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
              }}
            >
              View all risks
              <ChevronRight size={12} />
            </button>
          </div>

          {/* Middle: Alignment Gaps */}
          <div 
            className="p-4 rounded-lg"
            style={{
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Target size={16} style={{ color: '#8B7355' }} />
              <span 
                className="text-[12px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                Alignment Gaps
              </span>
            </div>

            <div className="space-y-2">
              <GapRow 
                label="Orphan Themes" 
                count={0} 
                tooltip="Themes without linked objectives"
              />
              <GapRow 
                label="Unlinked Epics" 
                count={misalignedEpics} 
                tooltip="Epics without strategic theme"
              />
              <GapRow 
                label="Unlinked Features" 
                count={misalignedFeatures} 
                tooltip="Features without parent epic"
              />
            </div>

            <div 
              className="flex items-center justify-between pt-3 mt-3"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <span 
                className="text-[12px] font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                Total gaps
              </span>
              <span 
                className="text-[16px] font-bold tabular-nums"
                style={{ color: alignmentGaps > 0 ? '#8B7355' : 'var(--text-muted)' }}
              >
                {alignmentGaps}
              </span>
            </div>

            <button
              onClick={() => navigate('/enterprise/backlog')}
              className="w-full mt-3 py-1.5 rounded-md text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
              style={{ 
                backgroundColor: 'var(--surface-hover)',
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-active)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
              }}
            >
              View strategic backlog
              <ChevronRight size={12} />
            </button>
          </div>

          {/* Right: Needs Attention */}
          <div 
            className="p-4 rounded-lg"
            style={{
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} style={{ color: 'var(--status-warning)' }} />
              <span 
                className="text-[12px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                Needs Attention
              </span>
            </div>

            {attentionItems.length === 0 ? (
              <div 
                className="py-6 text-center"
                style={{ color: 'var(--text-muted)' }}
              >
                <CheckCircle2 size={24} className="mx-auto mb-2" style={{ color: 'var(--status-success)' }} />
                <span className="text-[12px]">No items need immediate attention</span>
              </div>
            ) : (
              <div className="space-y-2">
                {attentionItems.slice(0, 4).map((item) => (
                  <AttentionItemRow 
                    key={item.id} 
                    item={item} 
                    onClick={() => navigate(item.link)} 
                  />
                ))}
              </div>
            )}

            {attentionItems.length > 4 && (
              <div 
                className="text-center pt-2 mt-2"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <span 
                  className="text-[11px]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  +{attentionItems.length - 4} more items
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function RiskRow({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div 
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span 
          className="text-[12px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </span>
      </div>
      <span 
        className="text-[13px] font-semibold tabular-nums"
        style={{ color: count > 0 ? color : 'var(--text-muted)' }}
      >
        {count}
      </span>
    </div>
  );
}

function GapRow({ label, count, tooltip }: { label: string; count: number; tooltip: string }) {
  return (
    <div className="flex items-center justify-between" title={tooltip}>
      <span 
        className="text-[12px]"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </span>
      <span 
        className="text-[13px] font-semibold tabular-nums"
        style={{ color: count > 0 ? '#8B7355' : 'var(--text-muted)' }}
      >
        {count}
      </span>
    </div>
  );
}

function AttentionItemRow({ item, onClick }: { item: AttentionItem; onClick: () => void }) {
  const severityColors = {
    critical: 'var(--status-danger)',
    high: 'var(--status-warning)',
    medium: '#8B7355',
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
      className="w-full p-2 rounded-md text-left flex items-start gap-2 transition-colors"
      style={{ backgroundColor: 'var(--surface-hover)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--surface-active)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
      }}
    >
      <div 
        className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center mt-0.5"
        style={{ backgroundColor: `${severityColors[item.severity]}20` }}
      >
        <Icon size={12} style={{ color: severityColors[item.severity] }} />
      </div>
      <div className="flex-1 min-w-0">
        <div 
          className="text-[12px] font-medium truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          {item.title}
        </div>
        <div 
          className="text-[10px]"
          style={{ color: 'var(--text-muted)' }}
        >
          {item.reason}
        </div>
      </div>
      <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0 mt-1" />
    </button>
  );
}
