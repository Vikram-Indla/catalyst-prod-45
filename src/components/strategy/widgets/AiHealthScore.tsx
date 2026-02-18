/**
 * AiHealthScore — Widget 7: AI health ring + recommendations
 * Row 4, span 3
 * DATA SOURCE: es_health_scores + es_ai_recommendations
 */

import { Sparkles, RefreshCw } from 'lucide-react';
import { CircularGauge } from '../shared/CircularGauge';
import { useHealthScore, useAiRecommendations } from '@/hooks/strategy/useStrategyData';

function getStatusLabel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Excellent', color: '#0D9488' };
  if (score >= 70) return { label: 'Good', color: '#7C3AED' };
  if (score >= 50) return { label: 'At Risk', color: '#D97706' };
  return { label: 'Critical', color: '#EF4444' };
}

export function AiHealthScore() {
  const { data: health, isLoading: hL, isError: hErr, refetch: hRefetch } = useHealthScore();
  const { data: recommendations, isLoading: rL } = useAiRecommendations();

  const isLoading = hL || rL;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center animate-pulse">
        <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--catalyst-bg-hover)' }} />
        <div className="mt-3" style={{ width: 60, height: 16, background: 'var(--catalyst-bg-hover)', borderRadius: 4 }} />
        <div className="w-full mt-4 space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 20, background: 'var(--catalyst-bg-hover)', borderRadius: 4 }} />
          ))}
        </div>
      </div>
    );
  }

  if (hErr) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--catalyst-text-tertiary)' }}>
        <span style={{ fontSize: 12 }}>Unable to load health data</span>
        <button onClick={() => hRefetch()} style={{ fontSize: 11, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>
          <RefreshCw size={12} className="inline mr-1" /> Retry
        </button>
      </div>
    );
  }

  const score = Number(health?.composite_score) || 0;
  const status = getStatusLabel(score);
  const topRecs = recommendations?.slice(0, 3) || [];

  return (
    <div className="flex flex-col items-center">
      <CircularGauge value={score} size={100} strokeWidth={10} color="#7C3AED" label="/ 100" animated />

      {/* Status badge */}
      <span className="mt-2 mb-4" style={{
        fontSize: 11, fontWeight: 600, color: status.color,
        background: `${status.color}1A`, borderRadius: 9999, padding: '2px 10px',
      }}>
        ● {status.label}
      </span>

      {/* Recommendations */}
      <div className="w-full space-y-2">
        {topRecs.length > 0 ? topRecs.map((rec) => (
          <div key={rec.id} className="flex gap-2" style={{ fontSize: 10, color: 'var(--catalyst-text-secondary)', lineHeight: 1.4 }}>
            <Sparkles size={10} style={{ color: '#7C3AED', flexShrink: 0, marginTop: 2 }} />
            <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
              {rec.description || rec.title}
            </span>
          </div>
        )) : (
          <div style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)', textAlign: 'center' }}>
            No recommendations at this time
          </div>
        )}
      </div>
    </div>
  );
}
