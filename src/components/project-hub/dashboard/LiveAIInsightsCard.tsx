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
      <div className="bg-[var(--cp-float)] dark:bg-[#1A1A1A]" style={{ gridColumn: '1 / -1', border: '1px solid var(--divider)', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, marginBottom: 16, borderBottom: '1px solid var(--cp-bd-zone)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} color="var(--cp-blue)" />
            <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--fg-1)' }}>AI Insights</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Analyzing project data...</span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[var(--bg-1)] dark:bg-[#1A1A1A]" style={{ flex: 1, borderRadius: 8, padding: 16 }}>
              <div className="bg-[var(--divider)] ph-skeleton" style={{ height: 14, borderRadius: 4, width: '60%', marginBottom: 12 }} />
              <div className="bg-[var(--divider)] ph-skeleton" style={{ height: 20, borderRadius: 4, width: '80%', marginBottom: 8 }} />
              <div className="bg-[var(--divider)] ph-skeleton" style={{ height: 12, borderRadius: 4, width: '50%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ERROR STATE
  if (error && !insights) {
    return (
      <div className="bg-[var(--cp-float)] dark:bg-[#1A1A1A]" style={{ gridColumn: '1 / -1', border: '1px solid var(--divider)', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, marginBottom: 16, borderBottom: '1px solid var(--cp-bd-zone)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} color="var(--cp-blue)" />
            <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--fg-1)' }}>AI Insights</span>
          </div>
          <button onClick={refresh} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--cp-purple)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            <RefreshCw size={12} /> Retry
          </button>
        </div>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <AlertTriangle size={24} color="var(--sem-warning)" style={{ margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 8 }}>Unable to generate insights right now.</p>
          <button onClick={refresh} className="bg-[var(--cp-purple-wash)]" style={{ fontSize: 12, color: 'var(--cp-purple)', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontWeight: 500 }}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!insights) return null;

  const data = insights;

  const balanceColors: Record<string, { bg: string; text: string }> = {
    Balanced: { bg: 'var(--tint-green-soft, #ECFDF5)', text: '#059669' },
    Uneven: { bg: '#FEF3C7', text: '#D97706' },
    Overloaded: { bg: '#FEE2E2', text: '#ef4444' },
  };
  const balance = balanceColors[data.teamWorkload?.balance] || balanceColors.Balanced;

  return (
    <div className="bg-[var(--cp-float)] dark:bg-[#1A1A1A]" style={{ gridColumn: '1 / -1', border: '1px solid var(--divider)', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, marginBottom: 16, borderBottom: '1px solid var(--cp-bd-zone)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} color="var(--cp-blue)" />
          <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--fg-1)' }}>AI Insights</span>
          {lastGenerated && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--fg-4)', marginLeft: 8 }}>
              <Clock size={10} />
              Generated {new Date(lastGenerated).toLocaleTimeString()}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={refresh}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--cp-purple)', background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: loading ? 0.6 : 1 }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <span className="bg-[var(--cp-purple-wash)]" style={{ fontSize: 11, fontWeight: 500, color: 'var(--cp-purple)', borderRadius: 9999, padding: '2px 10px' }}>
            Powered by AI
          </span>
        </div>
      </div>

      {/* THREE SUB-CARDS */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Completion Forecast */}
        <div className="bg-[var(--bg-1)] dark:bg-[#1A1A1A]" style={{ flex: 1, borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Target size={15} color="var(--cp-blue)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)' }}>Completion Forecast</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 4 }}>
            Projected: {new Date(data.completionForecast.projectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 8 }}>
            {data.completionForecast.daysFromTarget > 0
              ? `${data.completionForecast.daysFromTarget} days after target`
              : data.completionForecast.daysFromTarget < 0
              ? `${Math.abs(data.completionForecast.daysFromTarget)} days ahead of target`
              : 'On target'}
          </div>
          <span className="bg-[var(--cp-bd-zone)]" style={{ fontSize: 12, color: 'var(--fg-3)', borderRadius: 9999, padding: '2px 8px' }}>
            Confidence: {data.completionForecast.confidence}%
          </span>
        </div>

        {/* Blockers Summary */}
        <div className="bg-[var(--bg-1)] dark:bg-[#1A1A1A]" style={{ flex: 1, borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <AlertTriangle size={15} color="var(--sem-warning)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)' }}>Blockers Summary</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 4 }}>
            {data.blockersSummary?.totalBlocked || 0} blocked item{(data.blockersSummary?.totalBlocked || 0) !== 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
            {data.blockersSummary?.summary || 'No blocked items.'}
          </div>
          {data.blockersSummary?.topBlockers?.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--fg-3)' }}>
              {data.blockersSummary.topBlockers.slice(0, 2).map((b: string, i: number) => (
                <div key={i} style={{ marginBottom: 2 }}>• {b}</div>
              ))}
            </div>
          )}
        </div>

        {/* Team Workload */}
        <div className="bg-[var(--bg-1)] dark:bg-[#1A1A1A]" style={{ flex: 1, borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <TrendingUp size={15} color="var(--sem-success)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)' }}>Team Workload</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 4 }}>
            {data.teamWorkload?.totalAssigned || 0} items assigned
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 4 }}>
            Busiest: {data.teamWorkload?.busiestMember || 'N/A'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: balance.text, background: balance.bg, borderRadius: 9999, padding: '2px 8px' }}>
              {data.teamWorkload?.balance || 'Balanced'}
            </span>
            {(data.teamWorkload?.unassignedCount || 0) > 0 && (
              <span style={{ fontSize: 12, color: 'var(--sem-warning)' }}>
                {data.teamWorkload.unassignedCount} unassigned
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SUGGESTION BANNER */}
      <div className="bg-[var(--cp-purple-wash)]" style={{ marginTop: 16, borderLeft: '3px solid var(--cp-purple)', borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Lightbulb size={15} color="var(--cp-blue)" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>
            <strong>Suggestion:</strong> {data.suggestion.action}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>{data.suggestion.reason}</div>
        </div>
      </div>

      {/* META INFO */}
      {data._meta && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--fg-4)' }}>
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
