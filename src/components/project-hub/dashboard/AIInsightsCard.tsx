import { Sparkles, Target, AlertTriangle, TrendingUp, Lightbulb } from 'lucide-react';

export function AIInsightsCard() {
  return (
    <div
      style={{
        gridColumn: '1 / -1',
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        padding: 20,
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, marginBottom: 16, borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} color="#7c3aed" />
          <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 600, color: '#0F172A' }}>AI Insights</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 500, color: '#7c3aed', background: '#f3e8ff', borderRadius: 9999, padding: '2px 10px' }}>
          Powered by AI
        </span>
      </div>

      {/* 3 Sub-cards */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Completion Forecast */}
        <div style={{ flex: 1, background: '#FAFAFA', borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Target size={15} color="#7c3aed" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Completion Forecast</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Projected: Mar 22, 2026</div>
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 8 }}>7 days after target (Mar 15)</div>
          <span style={{ fontSize: 12, color: '#64748B', background: '#F1F5F9', borderRadius: 9999, padding: '2px 8px' }}>Confidence: 78%</span>
        </div>

        {/* Risk Alert */}
        <div style={{ flex: 1, background: '#FAFAFA', borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <AlertTriangle size={15} color="#D97706" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Risk Alert</span>
          </div>
          <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
            3 blocked items may delay completion by ~5 days if not resolved this week
          </div>
          <span style={{ fontSize: 12, color: '#D97706', background: '#FEF3C7', borderRadius: 9999, padding: '2px 8px', marginTop: 8, display: 'inline-block' }}>Impact: Medium</span>
        </div>

        {/* Velocity */}
        <div style={{ flex: 1, background: '#FAFAFA', borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <TrendingUp size={15} color="#0D9488" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Velocity</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Current: 4.2 items/week</div>
          <div style={{ fontSize: 13, color: '#0D9488', marginBottom: 4 }}>Trend: ↗ +12% vs last 2 weeks</div>
          <div style={{ fontSize: 13, color: '#64748B' }}>At this pace: ~3.6 weeks to complete remaining</div>
        </div>
      </div>

      {/* Suggestion Banner */}
      <div style={{ marginTop: 16, background: '#F5F3FF', borderLeft: '3px solid #7c3aed', borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Lightbulb size={15} color="#7c3aed" style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 13, color: '#334155' }}>
          <strong>Suggestion:</strong> Reassign{' '}
          <a href="#" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 500 }} onClick={e => e.preventDefault()}>DMA-12</a>
          {' '}(API Rate Limiting) — blocked for 3d and assigned to a team member at full capacity.
        </span>
      </div>
    </div>
  );
}
