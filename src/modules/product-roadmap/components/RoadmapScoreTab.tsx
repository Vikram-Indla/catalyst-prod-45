/**
 * Score Tab for Roadmap Detail Panel
 * 4 sliders + canvas radar chart + save button
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import type { RoadmapDemand } from '../types/roadmap';

interface RoadmapScoreTabProps {
  item: RoadmapDemand;
}

const DIMENSIONS = [
  { key: 'business_value', label: 'Strategic Alignment', short: 'SA' },
  { key: 'business_score', label: 'Business Impact', short: 'BI' },
  { key: 'executive_urgency', label: 'Technical Urgency', short: 'TU' },
  { key: 'complexity_score', label: 'Risk Factor', short: 'RF' },
] as const;

export function RoadmapScoreTab({ item }: RoadmapScoreTabProps) {
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [scores, setScores] = useState({
    business_value: (item as any).business_value ?? 0,
    business_score: (item as any).business_score ?? 0,
    executive_urgency: (item as any).executive_urgency ?? 0,
    complexity_score: (item as any).complexity_score ?? 0,
  });

  // Reset scores when item changes
  useEffect(() => {
    setScores({
      business_value: (item as any).business_value ?? 0,
      business_score: (item as any).business_score ?? 0,
      executive_urgency: (item as any).executive_urgency ?? 0,
      complexity_score: (item as any).complexity_score ?? 0,
    });
  }, [item.id]);

  const computedScore = (
    (scores.business_value * 0.3) +
    (scores.business_score * 0.3) +
    (scores.executive_urgency * 0.2) +
    (scores.complexity_score * 0.2)
  );

  // Draw radar chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 200;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const maxR = 75;
    const dims = DIMENSIONS.length;
    const angleStep = (2 * Math.PI) / dims;
    const startAngle = -Math.PI / 2;

    ctx.clearRect(0, 0, size, size);

    // Grid levels (1-5)
    for (let level = 1; level <= 5; level++) {
      const r = (level / 5) * maxR;
      ctx.beginPath();
      for (let i = 0; i <= dims; i++) {
        const angle = startAngle + i * angleStep;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Axis lines
    for (let i = 0; i < dims; i++) {
      const angle = startAngle + i * angleStep;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + maxR * Math.cos(angle), cy + maxR * Math.sin(angle));
      ctx.strokeStyle = '#d4d4d8';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Axis labels
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = '#71717a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelR = maxR + 16;
    DIMENSIONS.forEach((dim, i) => {
      const angle = startAngle + i * angleStep;
      const lx = cx + labelR * Math.cos(angle);
      const ly = cy + labelR * Math.sin(angle);
      ctx.fillText(dim.short, lx, ly);
    });

    // Data polygon
    const values = [scores.business_value, scores.business_score, scores.executive_urgency, scores.complexity_score];
    ctx.beginPath();
    values.forEach((val, i) => {
      const r = (val / 5) * maxR;
      const angle = startAngle + i * angleStep;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(37, 99, 235, 0.15)';
    ctx.fill();
    ctx.strokeStyle = 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Data points
    values.forEach((val, i) => {
      const r = (val / 5) * maxR;
      const angle = startAngle + i * angleStep;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))';
      ctx.fill();
      ctx.strokeStyle = 'var(--ds-surface, var(--ds-surface, #ffffff))';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [scores]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await typedQuery('business_requests')
        .update({
          business_value: scores.business_value,
          business_score: scores.business_score,
          executive_urgency: scores.executive_urgency,
          complexity_score: scores.complexity_score,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-demands'] });
    },
  });

  const handleSliderChange = useCallback((key: string, value: number) => {
    setScores(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div>
      {/* Computed score header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
          Computed Score
        </div>
        <div style={{ fontSize: '40px', fontWeight: 700, color: 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))', fontVariantNumeric: 'tabular-nums' }}>
          {computedScore.toFixed(1)}
        </div>
        <div style={{ fontSize: '12px', color: '#71717a' }}>
          {computedScore >= 4.0 ? 'High Priority' : computedScore >= 3.0 ? 'Medium Priority' : computedScore >= 2.0 ? 'Low Priority' : 'Unscored'}
        </div>
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        {DIMENSIONS.map(dim => {
          const val = scores[dim.key as keyof typeof scores];
          return (
            <div key={dim.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#52525b' }}>{dim.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))', fontVariantNumeric: 'tabular-nums' }}>
                  {Number(val).toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={5}
                step={0.1}
                value={val}
                onChange={e => handleSliderChange(dim.key, parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  borderRadius: '9999px',
                  background: `linear-gradient(to right, var(--ds-text-brand, #2563eb) 0%, var(--ds-text-brand, #2563eb) ${(val / 5) * 100}%, #e4e4e7 ${(val / 5) * 100}%, #e4e4e7 100%)`,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Radar chart */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
        <canvas ref={canvasRef} style={{ width: 200, height: 200 }} />
      </div>

      {/* Save button */}
      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        style={{
          width: '100%',
          height: '50px',
          backgroundColor: saveMutation.isPending ? '#93c5fd' : 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))',
          color: 'var(--ds-surface, var(--ds-surface, #ffffff))',
          fontSize: '14px',
          fontWeight: 600,
          borderRadius: '8px',
          border: 'none',
          cursor: saveMutation.isPending ? 'not-allowed' : 'pointer',
          transition: 'background-color 150ms',
        }}
        onMouseEnter={e => { if (!saveMutation.isPending) e.currentTarget.style.backgroundColor = 'var(--ds-background-brand-bold-hovered, var(--ds-background-brand-bold-hovered, #1d4ed8))'; }}
        onMouseLeave={e => { if (!saveMutation.isPending) e.currentTarget.style.backgroundColor = 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))'; }}
      >
        {saveMutation.isPending ? 'Saving…' : saveMutation.isSuccess ? '✓ Saved' : 'Save Score'}
      </button>

      {saveMutation.isError && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--ds-text-danger, var(--ds-text-danger, #ef4444))', textAlign: 'center' }}>
          Failed to save. Please try again.
        </div>
      )}
    </div>
  );
}

export default RoadmapScoreTab;
