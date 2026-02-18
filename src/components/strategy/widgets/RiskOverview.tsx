/**
 * RiskOverview — Widget 12: Risk Radar with LIVE data from existing risks module
 * Row 5, span 4
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useRisks } from '@/hooks/risks/useRisks';
import { RoamBadge } from '@/components/risks/RoamBadge';
import { CHART_COLORS } from '@/constants/risks';
import type { RoamStatus } from '@/types/risks';

const SEVERITY_RANK: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

const ROAM_COLORS: Record<string, string> = {
  Resolved: '#94A3B8',
  Owned: '#2563EB',
  Accepted: '#0D9488',
  Mitigated: '#D97706',
};

export function RiskOverview() {
  const navigate = useNavigate();
  const { risks, isLoading, error } = useRisks();

  const openRisks = useMemo(() =>
    (risks || []).filter(r => r.status === 'Open'),
    [risks]
  );

  const criticalHighCount = useMemo(() =>
    openRisks.filter(r => r.critical_path === 'Yes' || r.impact === 'Critical' || r.impact === 'High').length,
    [openRisks]
  );

  const mitigatedCount = useMemo(() =>
    openRisks.filter(r => r.resolution_method === 'Mitigated').length,
    [openRisks]
  );

  const overdueCount = useMemo(() =>
    openRisks.filter(r => r.target_resolution_date && new Date(r.target_resolution_date) < new Date()).length,
    [openRisks]
  );

  const roamCounts = useMemo(() => ({
    Resolved: openRisks.filter(r => r.resolution_method === 'Resolved').length,
    Owned: openRisks.filter(r => r.resolution_method === 'Owned').length,
    Accepted: openRisks.filter(r => r.resolution_method === 'Accepted').length,
    Mitigated: openRisks.filter(r => r.resolution_method === 'Mitigated').length,
  }), [openRisks]);

  const roamTotal = Object.values(roamCounts).reduce((a, b) => a + b, 0);

  const impactCounts = useMemo(() => ({
    Critical: openRisks.filter(r => r.impact === 'Critical').length,
    High: openRisks.filter(r => r.impact === 'High').length,
    Medium: openRisks.filter(r => r.impact === 'Medium').length,
    Low: openRisks.filter(r => r.impact === 'Low').length,
  }), [openRisks]);

  const topRisks = useMemo(() => {
    return [...openRisks]
      .sort((a, b) => {
        const aRank = SEVERITY_RANK[a.impact || 'Low'] ?? 3;
        const bRank = SEVERITY_RANK[b.impact || 'Low'] ?? 3;
        if (aRank !== bRank) return aRank - bRank;

        const today = new Date().toISOString().split('T')[0];
        const aOverdue = a.target_resolution_date && a.target_resolution_date < today ? 0 : 1;
        const bOverdue = b.target_resolution_date && b.target_resolution_date < today ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;

        const aDate = a.target_resolution_date || '9999-12-31';
        const bDate = b.target_resolution_date || '9999-12-31';
        return aDate.localeCompare(bDate);
      })
      .slice(0, 3);
  }, [openRisks]);

  if (isLoading) return null; // WidgetCard handles loading state

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--catalyst-text-tertiary)' }}>
        <p style={{ fontSize: 12 }}>Unable to load risks</p>
        <button onClick={() => window.location.reload()} style={{ fontSize: 11, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>
          Retry
        </button>
      </div>
    );
  }

  if (openRisks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <ShieldCheck size={32} style={{ color: '#0D9488' }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: '#0D9488' }}>No open risks</span>
      </div>
    );
  }

  const IMPACT_COLORS: Record<string, string> = {
    Critical: '#EF4444', High: '#EF4444', Medium: '#D97706', Low: '#0D9488',
  };

  return (
    <div>
      {/* A) KPI Strip */}
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {[
          { label: 'OPEN', value: openRisks.length, color: '#2563EB', pulse: false },
          { label: 'CRITICAL', value: criticalHighCount, color: '#EF4444', pulse: false },
          { label: 'MITIGATED', value: mitigatedCount, color: '#D97706', pulse: false },
          { label: 'OVERDUE', value: overdueCount, color: '#EF4444', pulse: overdueCount > 0 },
        ].map(kpi => (
          <div key={kpi.label} className="text-center relative" style={{
            border: '1px solid var(--catalyst-border-default, #E2E8F0)', borderRadius: 6, padding: '6px 10px',
          }}>
            {kpi.pulse && (
              <span style={{
                position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: '#EF4444',
                animation: 'pulse 2s infinite',
              }} />
            )}
            <div style={{ fontSize: 16, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--catalyst-text-tertiary)' }}>
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* B) ROAM Distribution Bar */}
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--catalyst-text-secondary)', marginBottom: 4 }}>ROAM Status</div>
      <div className="flex overflow-hidden mb-1" style={{ height: 12, borderRadius: 9999 }}>
        {roamTotal > 0 && (['Resolved', 'Owned', 'Accepted', 'Mitigated'] as const).map(method => {
          const count = roamCounts[method];
          if (count === 0) return null;
          return (
            <div key={method} style={{ width: `${(count / roamTotal) * 100}%`, background: ROAM_COLORS[method], transition: 'width 600ms ease-out' }} />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 mb-3" style={{ fontSize: 9, color: 'var(--catalyst-text-tertiary)' }}>
        {(['Resolved', 'Owned', 'Accepted', 'Mitigated'] as const).map(m => (
          <span key={m} className="flex items-center gap-1">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: ROAM_COLORS[m] }} />
            {m} ({roamCounts[m]})
          </span>
        ))}
      </div>

      {/* C) Impact Heatstrip */}
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--catalyst-text-secondary)', marginBottom: 4 }}>By Impact</div>
      <div className="flex gap-1 mb-3">
        {(['Critical', 'High', 'Medium', 'Low'] as const).map(level => {
          const count = impactCounts[level];
          const color = count > 0 ? IMPACT_COLORS[level] : 'var(--catalyst-text-tertiary, #94A3B8)';
          return (
            <div key={level} className="flex-1" style={{
              borderLeft: `3px solid ${IMPACT_COLORS[level]}`,
              padding: '4px 8px', borderRadius: 4,
              background: 'var(--catalyst-bg-surface-0)',
            }}>
              <div style={{ fontSize: 9, color: 'var(--catalyst-text-tertiary)' }}>{level}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color }}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* D) Top Risks List */}
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--catalyst-text-secondary)', marginBottom: 4 }}>Top Risks</div>
      <div>
        {topRisks.map((risk, i) => {
          const isOverdue = risk.target_resolution_date && new Date(risk.target_resolution_date) < new Date();
          return (
            <div
              key={risk.id}
              className="flex items-start gap-2"
              style={{
                padding: '6px 0',
                borderBottom: i < topRisks.length - 1 ? '1px solid var(--catalyst-border-default, #E2E8F0)' : 'none',
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%', marginTop: 3, flexShrink: 0,
                background: IMPACT_COLORS[risk.impact || 'Low'] || '#94A3B8',
              }} />
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 11, color: 'var(--catalyst-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, marginRight: 4 }}>R-{String(risk.risk_number).padStart(3, '0')}</span>
                  {risk.title}
                </div>
                <div style={{ fontSize: 9, color: 'var(--catalyst-text-tertiary)' }}>
                  {risk.occurrence || '—'} occurrence · {risk.relationship || 'Enterprise'}
                  {isOverdue && <span style={{ color: '#EF4444', marginLeft: 4 }}>⚠ Overdue</span>}
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <RoamBadge status={risk.resolution_method as RoamStatus} />
              </div>
            </div>
          );
        })}
      </div>

      {openRisks.length > 3 && (
        <button
          onClick={() => navigate('/strategyhub/risks')}
          style={{ fontSize: 10, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, padding: 0 }}
          onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
          onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
        >
          +{openRisks.length - 3} more risks →
        </button>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
