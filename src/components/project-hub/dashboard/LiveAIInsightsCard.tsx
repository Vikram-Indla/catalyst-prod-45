import { useProjectAIInsights } from "@/hooks/useProjectAIInsights";
import { Target, AlertTriangle, TrendingUp, Lightbulb, Sparkles, RefreshCw, Clock } from "lucide-react";

interface LiveAIInsightsCardProps {
  projectId: string;
}

export function LiveAIInsightsCard({ projectId }: LiveAIInsightsCardProps) {
  const { insights, loading, error, lastGenerated, refresh } = useProjectAIInsights(projectId);

  // LOADING STATE
  if (loading && !insights) {
    return (
      <div style={{ gridColumn: '1 / -1', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, marginBottom: 16, borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} color="#7c3aed" />
            <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 600, color: '#0F172A' }}>AI Insights</span>
          </div>
          <span style={{ fontSize: 12, color: '#64748B' }}>Analyzing project data...</span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ flex: 1, background: '#FAFAFA', borderRadius: 8, padding: 16 }}>
              <div style={{ height: 14, background: '#E2E8F0', borderRadius: 4, width: '60%', marginBottom: 12 }} className="ph-skeleton" />
              <div style={{ height: 20, background: '#E2E8F0', borderRadius: 4, width: '80%', marginBottom: 8 }} className="ph-skeleton" />
              <div style={{ height: 12, background: '#E2E8F0', borderRadius: 4, width: '50%' }} className="ph-skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ERROR STATE
  if (error && !insights) {
    return (
      <div style={{ gridColumn: '1 / -1', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, marginBottom: 16, borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} color="#7c3aed" />
            <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 600, color: '#0F172A' }}>AI Insights</span>
          </div>
          <button onClick={refresh} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            <RefreshCw size={12} /> Retry
          </button>
        </div>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <AlertTriangle size={24} color="#D97706" style={{ margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 8 }}>Unable to generate insights right now.</p>
          <button onClick={refresh} style={{ fontSize: 12, color: '#7c3aed', background: '#f5f3ff', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontWeight: 500 }}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!insights) return null;

  const data = insights;
  const trendUp = data.velocity.trendPercent >= 0;
  const trendColor = trendUp ? '#0d9488' : '#ef4444';
  const trendArrow = trendUp ? '↗' : '↘';

  const impactColors: Record<string, { bg: string; text: string }> = {
    Low: { bg: '#F1F5F9', text: '#64748B' },
    Medium: { bg: '#FEF3C7', text: '#D97706' },
    High: { bg: '#FFEDD5', text: '#EA580C' },
    Critical: { bg: '#FEE2E2', text: '#ef4444' },
  };
  const impact = impactColors[data.riskAlert.impact] || impactColors.Medium;

  return (
    <div style={{ gridColumn: '1 / -1', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, marginBottom: 16, borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} color="#7c3aed" />
          <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 600, color: '#0F172A' }}>AI Insights</span>
          {lastGenerated && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94A3B8', marginLeft: 8 }}>
              <Clock size={10} />
              Generated {new Date(lastGenerated).toLocaleTimeString()}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={refresh}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#7c3aed', background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: loading ? 0.6 : 1 }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <span style={{ fontSize: 11, fontWeight: 500, color: '#7c3aed', background: '#f3e8ff', borderRadius: 9999, padding: '2px 10px' }}>
            Powered by AI
          </span>
        </div>
      </div>

      {/* THREE SUB-CARDS */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Completion Forecast */}
        <div style={{ flex: 1, background: '#FAFAFA', borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Target size={15} color="#7c3aed" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Completion Forecast</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
            Projected: {new Date(data.completionForecast.projectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 8 }}>
            {data.completionForecast.daysFromTarget > 0
              ? `${data.completionForecast.daysFromTarget} days after target`
              : data.completionForecast.daysFromTarget < 0
              ? `${Math.abs(data.completionForecast.daysFromTarget)} days ahead of target`
              : 'On target'}
          </div>
          <span style={{ fontSize: 12, color: '#64748B', background: '#F1F5F9', borderRadius: 9999, padding: '2px 8px' }}>
            Confidence: {data.completionForecast.confidence}%
          </span>
        </div>

        {/* Risk Alert */}
        <div style={{ flex: 1, background: '#FAFAFA', borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <AlertTriangle size={15} color="#D97706" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Risk Alert</span>
          </div>
          <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
            {data.riskAlert.summary}
          </div>
          <span style={{ fontSize: 12, color: impact.text, background: impact.bg, borderRadius: 9999, padding: '2px 8px', marginTop: 8, display: 'inline-block' }}>
            Impact: {data.riskAlert.impact}
          </span>
        </div>

        {/* Velocity */}
        <div style={{ flex: 1, background: '#FAFAFA', borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <TrendingUp size={15} color="#0D9488" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Velocity</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
            Current: {data.velocity.currentPerWeek} items/week
          </div>
          <div style={{ fontSize: 13, color: trendColor, marginBottom: 4 }}>
            Trend: {trendArrow} {trendUp ? '+' : ''}{data.velocity.trendPercent}% vs last 2 weeks
          </div>
          <div style={{ fontSize: 13, color: '#64748B' }}>
            {data.velocity.weeksToComplete
              ? `At this pace: ~${data.velocity.weeksToComplete} weeks remaining`
              : 'Insufficient data for projection'}
          </div>
        </div>
      </div>

      {/* SUGGESTION BANNER */}
      <div style={{ marginTop: 16, background: '#F5F3FF', borderLeft: '3px solid #7c3aed', borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Lightbulb size={15} color="#7c3aed" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 13, color: '#334155' }}>
            <strong>Suggestion:</strong> {data.suggestion.action}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{data.suggestion.reason}</div>
        </div>
      </div>

      {/* META INFO */}
      {data._meta && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94A3B8' }}>
          <span>{data._meta.model}</span>
          <span>·</span>
          <span>{data._meta.durationMs}ms</span>
          <span>·</span>
          <span>{data._meta.dataPoints.totalItems} items analyzed</span>
        </div>
      )}
    </div>
  );
}
