import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveDemandProcessSteps } from '@/hooks/useDemandProcessSteps';
import { StageDrillDownDrawer } from './StageDrillDownDrawer';

interface StageOverviewWidgetProps {
  onStageClick: (stageValue: string) => void;
}

function StageSparkline({ testId }: { testId: string }) {
  return (
    <div
      data-testid={testId}
      style={{
        height: 28,
        display: 'flex',
        alignItems: 'flex-end',
        gap: 2,
        opacity: 0.35,
        marginTop: token('space.075', '6px'),
      }}
    >
      {[40, 55, 48, 62, 58, 70, 65, 60, 72, 68, 75, 80].map((h, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${h}%`,
            background: token('color.background.information.bold', '#0C66E4'),
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}

export function StageOverviewWidget({ onStageClick }: StageOverviewWidgetProps) {
  const { user, loading } = useAuth();
  const [openStage, setOpenStage] = useState<{ value: string; label: string } | null>(null);
  const { data: steps, isLoading: stepsLoading } = useActiveDemandProcessSteps();

  const { data: countRows, isLoading: countsLoading } = useQuery({
    queryKey: ['stage-br-counts'],
    enabled: !loading && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('process_step, count:id.count()')
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []) as Array<{ process_step: string; count: number }>;
    },
  });

  if (stepsLoading || countsLoading) {
    return (
      <div
        data-testid="stage-overview-skeleton"
        style={{
          height: 100,
          borderRadius: 6,
          background: token('color.background.neutral', '#F4F5F7'),
        }}
      />
    );
  }

  if (!steps || steps.length === 0) {
    return null;
  }

  const countMap = new Map<string, number>(
    (countRows ?? []).map(r => [r.process_step, Number(r.count)]),
  );

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: token('space.100', '8px'),
          flexWrap: 'wrap',
        }}
      >
        {steps.map(step => (
          <div
            key={step.id}
            data-testid={`stage-card-${step.value}`}
            onClick={() => { onStageClick(step.value); setOpenStage({ value: step.value, label: step.label }); }}
            style={{
              flex: '1 1 120px',
              minWidth: 0,
              padding: token('space.150', '12px'),
              background: token('elevation.surface.raised', '#FFFFFF'),
              borderRadius: 6,
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: token('color.text.subtlest', '#8993A4'),
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {step.label}
            </span>
            <span
              data-testid={`stage-count-${step.value}`}
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: token('color.text', '#172B4D'),
                lineHeight: 1,
                marginTop: token('space.050', '4px'),
              }}
            >
              {countMap.get(step.value) ?? 0}
            </span>
            <StageSparkline testId={`stage-sparkline-${step.value}`} />
          </div>
        ))}
      </div>

      <StageDrillDownDrawer
        stageValue={openStage?.value ?? null}
        stageLabel={openStage?.label ?? ''}
        onClose={() => setOpenStage(null)}
      />
    </>
  );
}
