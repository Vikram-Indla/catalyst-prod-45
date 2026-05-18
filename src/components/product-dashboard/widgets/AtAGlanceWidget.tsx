import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBrCycleTime } from '@/hooks/useBrCycleTime';
import { useWidgetSettings } from '@/hooks/useWidgetSettings';
import { WidgetShell, WidgetIconBtn } from '../WidgetShell';

// ── SVG polyline sparkline ────────────────────────────────────────────────────

function Sparkline({
  points,
  stroke,
  testId,
}: {
  points: string;
  stroke: string;
  testId: string;
}) {
  return (
    <svg
      data-testid={testId}
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ height: 28, width: '100%', marginTop: 4, display: 'block' }}
    >
      <polyline fill="none" stroke={stroke} strokeWidth="2" points={points} />
    </svg>
  );
}

// ── Trend indicator ───────────────────────────────────────────────────────────

type TrendDir = 'better' | 'worse' | 'flat';

function TrendBadge({ text, dir }: { text: string; dir: TrendDir }) {
  const color =
    dir === 'better'
      ? token('color.text.success', '#216E4E')
      : dir === 'worse'
      ? token('color.text.danger', '#AE2A19')
      : token('color.text.subtle', '#44546F');
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        color,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        lineHeight: '16px',
      }}
    >
      {text}
    </span>
  );
}

// ── KPI cell ─────────────────────────────────────────────────────────────────

function KpiCell({
  label,
  question,
  value,
  unit,
  trend,
  trendDir,
  sparkPoints,
  sparkColor,
  sparkTestId,
  borderRight,
}: {
  label: string;
  question: string;
  value: React.ReactNode;
  unit?: string;
  trend?: string;
  trendDir?: TrendDir;
  sparkPoints: string;
  sparkColor: string;
  sparkTestId: string;
  borderRight?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: '18px 22px',
        borderRight: borderRight ? `1px solid ${token('color.border', '#DFE1E6')}` : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: token('color.text', '#172B4D'),
          display: 'block',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: token('color.text.subtle', '#44546F'),
          minHeight: 32,
          lineHeight: '16px',
          display: 'block',
        }}
      >
        {question}
      </span>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: token('color.text', '#172B4D'),
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: token('color.text.subtle', '#44546F'),
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {trend && trendDir && <TrendBadge text={trend} dir={trendDir} />}

      <Sparkline
        points={sparkPoints}
        stroke={sparkColor}
        testId={sparkTestId}
      />
    </div>
  );
}

// ── Settings panel ────────────────────────────────────────────────────────────

function SettingsPanel() {
  return (
    <div
      data-testid="widget-settings-panel"
      style={{
        padding: '12px 18px',
        borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
        background: token('color.background.neutral.subtle', '#FAFBFC'),
        fontSize: 13,
        color: token('color.text.subtle', '#44546F'),
      }}
    >
      Configure which process steps define the Business, IT, and Landing legs.
      Apply Group 1 SQL to enable <code>user_widget_settings</code> persistence.
    </div>
  );
}

// ── AtAGlanceWidget ───────────────────────────────────────────────────────────

export function AtAGlanceWidget() {
  const { user, loading } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { config, isLoading: settingsLoading } = useWidgetSettings('at-a-glance');
  const funnelStep: string = (config as Record<string, string>).funnelStep ?? 'funnel';
  const itHandoffStep: string = (config as Record<string, string>).itHandoffStep ?? 'ready_for_implementation';
  const landingStep: string = (config as Record<string, string>).landingStep ?? 'done';

  const businessCycle = useBrCycleTime({ startStep: funnelStep, endStep: itHandoffStep });
  const itCycle = useBrCycleTime({ startStep: itHandoffStep, endStep: landingStep });
  const totalCycle = useBrCycleTime({ startStep: funnelStep, endStep: landingStep });

  const { data: activeCount, isLoading: countLoading } = useQuery({
    queryKey: ['br-active-count', funnelStep],
    enabled: !loading && !!user?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('business_requests')
        .select('id')
        .neq('process_step', funnelStep)
        .is('deleted_at', null)
        .single() as unknown as { count: number; error: Error | null };
      if (error) throw error;
      return count ?? 0;
    },
  });

  const isLoading =
    settingsLoading ||
    countLoading ||
    businessCycle.isLoading ||
    itCycle.isLoading ||
    totalCycle.isLoading;

  if (isLoading) {
    return (
      <div
        data-testid="at-a-glance-skeleton"
        style={{
          height: 180,
          borderRadius: 8,
          background: 'var(--ds-background-neutral, #F4F5F7)',
          boxShadow: '0 1px 1px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)',
        }}
      />
    );
  }

  const actions = (
    <>
      <WidgetIconBtn title="Download">⤓</WidgetIconBtn>
      <WidgetIconBtn
        title={settingsOpen ? 'Close settings' : 'Widget settings'}
        onClick={e => { e.stopPropagation(); setSettingsOpen(o => !o); }}
      >
        ⚙
      </WidgetIconBtn>
    </>
  );

  return (
    <WidgetShell
      title="At a glance"
      question="The four numbers that tell you the story in three seconds"
      actions={actions}
      flush
      footerLeft="Updated just now"
      footerRight="See full report →"
    >
      {settingsOpen && <SettingsPanel />}

      <div style={{ display: 'flex' }}>
        <KpiCell
          label="Active"
          question="How many business requests are we working on right now?"
          value={<span data-testid="kpi-active-value">{activeCount ?? '—'}</span>}
          trend={activeCount != null ? `${activeCount} active in pipeline` : undefined}
          trendDir="flat"
          sparkPoints="0,18 12,16 24,20 36,15 48,12 60,14 72,10 84,9 100,6"
          sparkColor="#0C66E4"
          sparkTestId="sparkline-active"
          borderRight
        />
        <KpiCell
          label="Business Cycle"
          question="How long does a typical request take — business side?"
          value={<span data-testid="kpi-cycle-median">{businessCycle.median ?? '—'}</span>}
          unit={businessCycle.median != null ? 'days' : undefined}
          trend={businessCycle.median == null ? 'Tracking — apply audit log wiring' : undefined}
          trendDir="flat"
          sparkPoints="0,16 12,15 24,14 36,12 48,11 60,9 72,8 84,7 100,5"
          sparkColor="#AE2A19"
          sparkTestId="sparkline-business-cycle"
          borderRight
        />
        <KpiCell
          label="IT Cycle"
          question="How long does a typical request take — IT side?"
          value={<span data-testid="kpi-cycle-median">{itCycle.median ?? '—'}</span>}
          unit={itCycle.median != null ? 'days' : undefined}
          trend={itCycle.median == null ? 'Tracking — apply audit log wiring' : undefined}
          trendDir="flat"
          sparkPoints="0,20 9,19 18,17 27,16 36,18 45,15 54,13 63,11 72,9 81,7 90,6 100,5"
          sparkColor="#AE2A19"
          sparkTestId="sparkline-it-cycle"
          borderRight
        />
        <KpiCell
          label="Total Cycle"
          question="How many requests have we released in the last 30 days?"
          value={<span data-testid="kpi-cycle-median">{totalCycle.median ?? '—'}</span>}
          unit={totalCycle.median != null ? 'days (total)' : undefined}
          trend={totalCycle.median == null ? 'Tracking — apply audit log wiring' : undefined}
          trendDir="flat"
          sparkPoints="0,22 12,20 24,18 36,21 48,17 60,16 72,14 84,12 100,10"
          sparkColor="#36B37E"
          sparkTestId="sparkline-total-cycle"
        />
      </div>
    </WidgetShell>
  );
}
