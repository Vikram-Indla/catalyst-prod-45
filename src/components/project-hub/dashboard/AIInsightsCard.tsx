import { Sparkles, Target, AlertTriangle, TrendingUp, Lightbulb } from 'lucide-react';

export function AIInsightsCard() {
  return (
    <div
      className="bg-[var(--cp-float)] dark:bg-[#232019]"
      style={{
        gridColumn: '1 / -1',
        border: '1px solid var(--divider)',
        borderRadius: 8,
        padding: 20,
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, marginBottom: 16, borderBottom: '1px solid var(--cp-bd-zone)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} color="var(--cp-blue)" />
          <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--fg-1)' }}>AI Insights</span>
        </div>
        <span className="bg-[var(--cp-purple-wash)]" style={{ fontSize: 11, fontWeight: 500, color: 'var(--cp-purple)', borderRadius: 9999, padding: '2px 10px' }}>
          Powered by AI
        </span>
      </div>

      {/* 3 Sub-cards */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Completion Forecast */}
        <div className="bg-[var(--bg-1)] dark:bg-[#2C2823]" style={{ flex: 1, borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Target size={15} color="var(--cp-blue)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)' }}>Completion Forecast</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 4 }}>Projected: Mar 22, 2026</div>
          <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 8 }}>7 days after target (Mar 15)</div>
          <span className="bg-[var(--cp-bd-zone)]" style={{ fontSize: 12, color: 'var(--fg-3)', borderRadius: 9999, padding: '2px 8px' }}>Confidence: 78%</span>
        </div>

        {/* Risk Alert */}
        <div className="bg-[var(--bg-1)] dark:bg-[#2C2823]" style={{ flex: 1, borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <AlertTriangle size={15} color="var(--sem-warning)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)' }}>Risk Alert</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
            3 blocked items may delay completion by ~5 days if not resolved this week
          </div>
          <span className="bg-[var(--sem-warning-bg)]" style={{ fontSize: 12, color: 'var(--sem-warning)', borderRadius: 9999, padding: '2px 8px', marginTop: 8, display: 'inline-block' }}>Impact: Medium</span>
        </div>

        {/* Velocity */}
        <div className="bg-[var(--bg-1)] dark:bg-[#2C2823]" style={{ flex: 1, borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <TrendingUp size={15} color="var(--sem-success)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)' }}>Velocity</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 4 }}>Current: 4.2 items/week</div>
          <div style={{ fontSize: 13, color: 'var(--sem-success)', marginBottom: 4 }}>Trend: ↗ +12% vs last 2 weeks</div>
          <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>At this pace: ~3.6 weeks to complete remaining</div>
        </div>
      </div>

      {/* Suggestion Banner */}
      <div className="bg-[var(--cp-purple-wash)]" style={{ marginTop: 16, borderLeft: '3px solid var(--cp-purple)', borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Lightbulb size={15} color="var(--cp-blue)" style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>
          <strong>Suggestion:</strong> Reassign{' '}
          <a href="#" style={{ color: 'var(--cp-blue)', textDecoration: 'none', fontWeight: 500 }} onClick={e => e.preventDefault()}>DMA-12</a>
          {' '}(API Rate Limiting) — blocked for 3d and assigned to a team member at full capacity.
        </span>
      </div>
    </div>
  );
}
