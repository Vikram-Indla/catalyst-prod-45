// =====================================================
// DETAIL TAB — Score tab with radar chart + sliders
// =====================================================

import React, { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TimelineInitiative } from '@/types/producthub/initiative';
import { RadarChart } from './RadarChart';
import { catalystToast } from '@/lib/catalystToast';

interface DetailTabScoreProps {
  initiative: TimelineInitiative;
}

const DIMENSIONS = [
  { key: 'sa', label: 'Strategic Alignment', field: 'score_strategic_alignment' },
  { key: 'bi', label: 'Business Impact', field: 'score_business_impact' },
  { key: 'tu', label: 'Technical Urgency', field: 'score_time_urgency' },
  { key: 'rf', label: 'Risk Factor', field: 'score_resource_feasibility' },
] as const;

export const DetailTabScore: React.FC<DetailTabScoreProps> = ({ initiative }) => {
  const queryClient = useQueryClient();
  const [scores, setScores] = useState({
    sa: initiative.score_strategic_alignment ?? 0,
    bi: initiative.score_business_impact ?? 0,
    tu: initiative.score_time_urgency ?? 0,
    rf: initiative.score_resource_feasibility ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const handleChange = useCallback((key: 'sa' | 'bi' | 'tu' | 'rf', value: number) => {
    setScores(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ph_initiatives' as never)
        .update({
          score_strategic_alignment: scores.sa,
          score_business_impact: scores.bi,
          score_time_urgency: scores.tu,
          score_resource_feasibility: scores.rf,
        } as never)
        .eq('id' as never, initiative.id as never);

      if (error) throw new Error(error.message);

      await queryClient.invalidateQueries({ queryKey: ['ph-timeline-initiatives'] });
      catalystToast.success('Scores updated successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save scores';
      catalystToast.error(message);
    } finally {
      setSaving(false);
    }
  }, [scores, initiative.id, queryClient]);

  const computedScore = (scores.sa * 0.3 + scores.bi * 0.3 + scores.tu * 0.2 + scores.rf * 0.2);

  return (
    <div className="p-5 space-y-6">
      {/* Score sliders */}
      <div className="space-y-4">
        {DIMENSIONS.map(dim => (
          <div key={dim.key}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-semibold text-muted-foreground">{dim.label}</span>
              <span className="text-[12px] font-semibold text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {scores[dim.key].toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={5}
              step={0.1}
              value={scores[dim.key]}
              onChange={e => handleChange(dim.key, parseFloat(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px]
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2
                [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </div>
        ))}
      </div>

      {/* Computed total */}
      <div className="flex items-center justify-center">
        <div className="text-center">
          <div className="text-[52px] font-bold text-primary leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {computedScore.toFixed(2)}
          </div>
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-1">
            Computed Score
          </div>
        </div>
      </div>

      {/* Radar chart */}
      <RadarChart values={scores} size={200} />

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-9 bg-primary text-primary-foreground text-[13px] font-medium rounded-lg
          hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? 'Saving…' : 'Save Score'}
      </button>
    </div>
  );
};

export default DetailTabScore;
