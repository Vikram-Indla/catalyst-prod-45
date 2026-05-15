import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBrCycleTime } from '@/hooks/useBrCycleTime';
import { useWidgetSettings } from '@/hooks/useWidgetSettings';

// ── Sparkline placeholder ────────────────────────────────────────────────────

function Sparkline({ testId }: { testId: string }) {
  return (
    <div
      data-testid={testId}
      style={{
        height: 32,
        display: 'flex',
        alignItems: 'flex-end',
        gap: 2,
        opacity: 0.4,
      }}
    >
      {[40, 55, 48, 62, 58, 70, 65].map((h, i) => (
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

// ── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  unit,
  sparklineId,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  sparklineId: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: token('space.150', '12px'),
        background: token('elevation.surface.raised', '#FFFFFF'),
        borderRadius: 6,
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        display: 'flex',
        flexDirection: 'column',
        gap: token('space.050', '4px'),
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
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
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
              fontSize: 12,
              color: token('color.text.subtle', '#505258'),
            }}
          >
            {unit}
          </span>
        )}
      </div>
      <Sparkline testId={sparklineId} />
    </div>
  );
}

// ── Inline settings panel ────────────────────────────────────────────────────

function InlineSettingsPanel() {
  return (
    <div
      data-testid="widget-settings-panel"
      style={{
        marginTop: token('space.100', '8px'),
        padding: token('space.150', '12px'),
        background: token('color.background.neutral.subtle', '#FAFBFC'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: 6,
        fontSize: 12,
        color: token('color.text.subtle', '#505258'),
      }}
    >
      <p style={{ margin: 0 }}>
        Widget settings — configure which steps define Business / IT / Landing legs.
        Full settings panel ships with Group 4 Row 3.
      </p>
    </div>
  );
}

// ── AtAGlanceWidget ──────────────────────────────────────────────────────────

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

  const { data: activeCount } = useQuery({
    queryKey: ['br-active-count', funnelStep],
    enabled: !loading && !!user?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('business_requests')
        .select('*', { count: 'exact', head: true } as Parameters<typeof supabase.from>[1])
        .neq('process_step', funnelStep)
        .is('deleted_at', null)
        .single();
      if (error) throw error;
      return count ?? 0;
    },
  });

  const isLoading = settingsLoading || businessCycle.isLoading || itCycle.isLoading || totalCycle.isLoading;

  if (isLoading) {
    return (
      <div
        data-testid="at-a-glance-skeleton"
        style={{
          height: 120,
          borderRadius: 6,
          background: token('color.background.neutral', '#F4F5F7'),
        }}
      />
    );
  }

  return (
    <div>
      {/* Widget header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: token('space.100', '8px'),
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: token('color.text', '#172B4D'),
          }}
        >
          At a glance
        </span>
        <button
          type="button"
          aria-label="Settings"
          onClick={() => setSettingsOpen(o => !o)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: token('color.text.subtlest', '#8993A4'),
            padding: 4,
            borderRadius: 4,
            lineHeight: 1,
          }}
        >
          ⚙
        </button>
      </div>

      {settingsOpen && <InlineSettingsPanel />}

      {/* KPI row */}
      <div style={{ display: 'flex', gap: token('space.100', '8px') }}>
        <KpiCard
          label="Active"
          value={<span data-testid="kpi-active-value">{activeCount ?? '—'}</span>}
          unit="BRs"
          sparklineId="sparkline-active"
        />
        <KpiCard
          label="Business Cycle"
          value={
            <span data-testid="kpi-cycle-median">
              {businessCycle.median ?? '—'}
            </span>
          }
          unit="days"
          sparklineId="sparkline-business-cycle"
        />
        <KpiCard
          label="IT Cycle"
          value={
            <span data-testid="kpi-cycle-median">
              {itCycle.median ?? '—'}
            </span>
          }
          unit="days"
          sparklineId="sparkline-it-cycle"
        />
        <KpiCard
          label="Total Cycle"
          value={
            <span data-testid="kpi-cycle-median">
              {totalCycle.median ?? '—'}
            </span>
          }
          unit="days"
          sparklineId="sparkline-total-cycle"
        />
      </div>
    </div>
  );
}
