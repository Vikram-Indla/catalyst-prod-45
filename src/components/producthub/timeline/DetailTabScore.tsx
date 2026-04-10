/**
 * Detail Tab — Score (MARAM V3.1 + Catalyst V11 Carbon Precision)
 * Weighted sliders, SVG radar chart, composite score, Supabase persistence
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import type { TimelineInitiative } from '@/types/producthub/initiative';
import { toast } from 'sonner';
import { logInitiativeAudit } from '@/lib/initiativeAudit';

interface DetailTabScoreProps {
  initiative: TimelineInitiative;
}

const DIMS = [
  { key: 'sa' as const, label: 'Strategic Alignment', weight: 30, field: 'strategic_alignment' },
  { key: 'bi' as const, label: 'Business Impact', weight: 30, field: 'business_impact' },
  { key: 'tu' as const, label: 'Time & Urgency', weight: 20, field: 'time_urgency' },
  { key: 'rf' as const, label: 'Resource Feasibility', weight: 20, field: 'resource_feasibility' },
];

type ScoreKeys = 'sa' | 'bi' | 'tu' | 'rf';

/* ── SVG Pentagon Radar ── */
function RadarSVG({ scores }: { scores: Record<ScoreKeys, number> }) {
  const size = 200;
  const cx = 100, cy = 100, R = 72;
  const keys: ScoreKeys[] = ['sa', 'bi', 'tu', 'rf'];
  const labels = ['SA', 'BI', 'TU', 'RF'];
  const n = 4;

  const vertex = (i: number, r: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const polygon = (r: number) =>
    Array.from({ length: n }, (_, i) => vertex(i, r).join(',')).join(' ');

  const dataPoints = keys.map((k, i) => vertex(i, R * (scores[k] / 5)));
  const dataPolygon = dataPoints.map(p => p.join(',')).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Concentric pentagons */}
      {[0.2, 0.4, 0.6, 0.8, 1.0].map(f => (
        <polygon key={f} points={polygon(R * f)} fill="none" stroke="var(--idp-border)" strokeWidth="0.5" />
      ))}
      {/* Axis lines */}
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = vertex(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--idp-border)" strokeWidth="0.5" />;
      })}
      {/* Data polygon */}
      <polygon points={dataPolygon} fill="rgba(37,99,235,0.15)" stroke="var(--idp-primary)" strokeWidth="2" />
      {/* Data dots */}
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4} fill="var(--idp-primary)" stroke="#fff" strokeWidth="2" />
      ))}
      {/* Labels */}
      {labels.map((lbl, i) => {
        const [x, y] = vertex(i, R + 20);
        return (
          <text key={lbl} x={x} y={y} textAnchor="middle" dominantBaseline="central"
            style={{ fontSize: 10, fill: 'var(--idp-ink-tertiary)', fontWeight: 600, fontFamily: 'var(--idp-font-body)' }}>
            {lbl}
          </text>
        );
      })}
    </svg>
  );
}

export const DetailTabScore: React.FC<DetailTabScoreProps> = ({ initiative }) => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  // Fetch existing scores from ph_initiative_scores
  const { data: dbScores } = useQuery({
    queryKey: ['idp-scores', initiative.id],
    queryFn: async () => {
      const { data } = await typedQuery('ph_initiative_scores')
        .select('strategic_alignment, business_impact, time_urgency, resource_feasibility')
        .eq('initiative_id', initiative.id)
        .maybeSingle();
      return data;
    },
    staleTime: 30_000,
  });

  const [scores, setScores] = useState<Record<ScoreKeys, number>>({
    sa: 4.2, bi: 3.8, tu: 4.5, rf: 3.2,
  });

  // Seed from DB when available
  useEffect(() => {
    if (dbScores) {
      setScores({
        sa: dbScores.strategic_alignment ?? 4.2,
        bi: dbScores.business_impact ?? 3.8,
        tu: dbScores.time_urgency ?? 4.5,
        rf: dbScores.resource_feasibility ?? 3.2,
      });
    }
  }, [dbScores]);

  const composite = useMemo(
    () => +(scores.sa * 0.3 + scores.bi * 0.3 + scores.tu * 0.2 + scores.rf * 0.2).toFixed(1),
    [scores],
  );

  const badge = useMemo(() => {
    if (composite >= 4.0) return { label: 'High', color: 'var(--idp-success)', bg: 'rgba(22,163,74,0.15)' };
    if (composite >= 3.0) return { label: 'Medium', color: 'var(--idp-warning)', bg: 'rgba(217,119,6,0.15)' };
    if (composite >= 2.0) return { label: 'Low', color: 'var(--idp-primary)', bg: 'rgba(37,99,235,0.15)' };
    return { label: 'Rejected', color: 'var(--idp-danger)', bg: 'rgba(220,38,38,0.15)' };
  }, [composite]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Upsert into ph_initiative_scores
      const { error } = await typedQuery('ph_initiative_scores')
        .upsert({
          initiative_id: initiative.id,
          strategic_alignment: scores.sa,
          business_impact: scores.bi,
          time_urgency: scores.tu,
          resource_feasibility: scores.rf,
          composite_score: composite,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'initiative_id' });
      if (error) throw error;
      // Silent auto-save
      logInitiativeAudit({ initiative_id: initiative.id, action: 'updated', entity_type: 'score', new_value: String(composite) });
      queryClient.invalidateQueries({ queryKey: ['idp-scores', initiative.id] });
      queryClient.invalidateQueries({ queryKey: ['idp-activity', initiative.id] });
      queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
    } catch {
      toast.error('Failed to save score');
    } finally {
      setSaving(false);
    }
  }, [scores, composite, initiative.id, queryClient]);

  return (
    <div className="idp-score">
      <div className="idp-score-layout">
        {/* LEFT — Sliders */}
        <div className="idp-score-sliders">
          {DIMS.map(dim => (
            <div key={dim.key}>
              <div className="idp-score-slider-header">
                <span className="idp-score-slider-label">{dim.label}</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className="idp-score-slider-weight">({dim.weight}%)</span>
                  <span className="idp-score-slider-value">{scores[dim.key].toFixed(1)}</span>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={Math.round(scores[dim.key] * 10)}
                onChange={e => setScores(prev => ({ ...prev, [dim.key]: parseInt(e.target.value) / 10 }))}
                style={{ width: '100%' }}
              />
            </div>
          ))}
          <button className="idp-score-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Score'}
          </button>
        </div>

        {/* RIGHT — Radar + Composite */}
        <div className="idp-score-chart">
          <RadarSVG scores={scores} />
          <div className="idp-score-composite">{composite.toFixed(1)}</div>
          <div className="idp-score-badge" style={{ background: badge.bg, color: badge.color }}>
            {badge.label}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailTabScore;
