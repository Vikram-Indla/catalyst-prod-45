import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProcessSteps } from '@/modules/kanban/hooks/useProcessSteps';
import { WidgetShell, WidgetIconBtn } from '../WidgetShell';
import { StageDrillDownDrawer } from './StageDrillDownDrawer';

// ── Phase colour system ───────────────────────────────────────────────────────

const PHASE_DEMAND   = 'var(--ds-background-information-bold)';
const PHASE_APPROVAL = 'var(--ds-background-warning-bold)';
const PHASE_DELIVERY = 'var(--ds-background-discovery-bold)';
const PHASE_CLOSURE  = 'var(--ds-background-success-bold)';

function phaseColor(sortOrder: number): string {
  if (sortOrder <= 3) return PHASE_DEMAND;
  if (sortOrder <= 5) return PHASE_APPROVAL;
  if (sortOrder <= 9) return PHASE_DELIVERY;
  return PHASE_CLOSURE;
}

function phaseLabel(sortOrder: number): string {
  if (sortOrder <= 3) return 'Demand';
  if (sortOrder <= 5) return 'Approval';
  if (sortOrder <= 9) return 'Delivery';
  return 'Closure';
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface StageOverviewWidgetProps {
  onStageClick: (stageValue: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StageOverviewWidget({ onStageClick }: StageOverviewWidgetProps) {
  const { user, loading } = useAuth();
  const [openStage, setOpenStage] = useState<{ value: string; label: string } | null>(null);

  const { data: steps, isLoading: stepsLoading } = useProcessSteps();

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

  const { data: stalledRows } = useQuery({
    queryKey: ['stage-stalled-counts'],
    enabled: !loading && !!user?.id,
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 14 * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from('business_requests')
        .select('process_step, count:id.count()')
        .is('deleted_at', null)
        .lt('entered_step_at', cutoff);
      if (error) throw error;
      return (data ?? []) as Array<{ process_step: string; count: number }>;
    },
  });

  if (stepsLoading || countsLoading) {
    return (
      <div
        data-testid="stage-overview-skeleton"
        style={{
          height: 200,
          borderRadius: 8,
          background: token('color.background.neutral', 'var(--ds-background-neutral-subtle)'),
          boxShadow: '0 1px 1px var(--ds-shadow-raised), 0 0 1px var(--ds-shadow-raised)',
        }}
      />
    );
  }

  if (!steps || steps.length === 0) return null;

  const sorted = [...steps].sort((a, b) => a.sort_order - b.sort_order);
  const countMap = new Map<string, number>(
    (countRows ?? []).map(r => [r.process_step, Number(r.count)]),
  );
  const stalledMap = new Map<string, number>(
    (stalledRows ?? []).map(r => [r.process_step, Number(r.count)]),
  );

  const total = Array.from(countMap.values()).reduce((s, c) => s + c, 0);
  const totalOrOne = total === 0 ? 1 : total;

  // Biggest pile for footer insight
  const biggestStep = sorted.reduce((max, s) =>
    (countMap.get(s.value) ?? 0) > (countMap.get(max.value) ?? 0) ? s : max,
    sorted[0],
  );
  const biggestCount = biggestStep ? (countMap.get(biggestStep.value) ?? 0) : 0;

  // Legend phases present in this step set
  const phases = Array.from(
    new Set(sorted.map(s => phaseLabel(s.sort_order))),
  ).map(label => ({
    label,
    color: label === 'Demand' ? PHASE_DEMAND
      : label === 'Approval' ? PHASE_APPROVAL
      : label === 'Delivery' ? PHASE_DELIVERY
      : PHASE_CLOSURE,
  }));

  const actions = (
    <>
      <WidgetIconBtn title="Fullscreen">⛶</WidgetIconBtn>
      <WidgetIconBtn title="Download">⤓</WidgetIconBtn>
    </>
  );

  const footer = biggestCount > 0
    ? `The biggest pile is at ${biggestStep?.label} (${biggestCount}) — that's where the org needs to act.`
    : 'No active business requests.';

  return (
    <>
      <WidgetShell
        title="Where is everything sitting?"
        question={`${total} active request${total !== 1 ? 's' : ''} across ${sorted.length} stages — click any stage to see what's there`}
        actions={actions}
        footerLeft={footer}
        footerRight="Open backlog by stage →"
      >
        {/* ── Distribution bar ─────────────────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <div
            role="img"
            aria-label="Distribution across stages"
            style={{
              display: 'flex',
              height: 28,
              borderRadius: 4,
              overflow: 'hidden',
              background: token('color.background.neutral.subtle', 'var(--ds-background-neutral-subtle)'),
            }}
          >
            {sorted.map(step => {
              const count = countMap.get(step.value) ?? 0;
              const pct = Math.max((count / totalOrOne) * 100, total === 0 ? 100 / sorted.length : 2);
              const color = phaseColor(step.sort_order);
              return (
                <div
                  key={step.id}
                  title={`${step.label} · ${count}`}
                  onClick={() => { onStageClick(step.value); setOpenStage({ value: step.value, label: step.label }); }}
                  style={{
                    flex: `0 0 ${pct}%`,
                    background: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--ds-text-inverse)',
                    fontSize: 'var(--ds-font-size-100)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minWidth: 24,
                    transition: 'opacity 120ms',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0.85'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
                >
                  {count > 0 ? count : ''}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 4,
              fontSize: 'var(--ds-font-size-100)',
              color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary))'),
            }}
          >
            <span>
              <strong>{total}</strong> active
            </span>
            <div style={{ display: 'flex', gap: 16 }}>
              {phases.map(p => (
                <span
                  key={p.label}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: p.color,
                      display: 'inline-block',
                    }}
                  />
                  {p.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Stage cards grid ─────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${sorted.length}, 1fr)`,
            gap: 8,
          }}
        >
          {sorted.map((step, idx) => {
            const count = countMap.get(step.value) ?? 0;
            const stalled = stalledMap.get(step.value) ?? 0;
            const color = phaseColor(step.sort_order);
            const num = String(idx + 1).padStart(2, '0');

            return (
              <div
                key={step.id}
                data-testid={`stage-card-${step.value}`}
                onClick={() => { onStageClick(step.value); setOpenStage({ value: step.value, label: step.label }); }}
                style={{
                  padding: '8px 8px',
                  border: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral))')}`,
                  borderTop: `3px solid ${color}`,
                  borderRadius: 6,
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: token('elevation.surface', 'var(--ds-surface)'),
                  transition: 'background 120ms, border-color 120ms',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.background = token('color.background.neutral.hovered', 'var(--ds-background-neutral, var(--ds-background-neutral))');
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.background = token('elevation.surface', 'var(--ds-surface)');
                }}
              >
                <div
                  style={{
                    fontSize: 'var(--ds-font-size-100)',
                    fontWeight: 600,
                    color: token('color.text.subtlest', 'var(--ds-text-disabled)'),
                  }}
                >
                  {num}
                </div>
                <div
                  style={{
                    fontSize: 'var(--ds-font-size-100)',
                    fontWeight: 500,
                    color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary))'),
                    marginTop: 4,
                    minHeight: 28,
                    lineHeight: '14px',
                  }}
                >
                  {step.label}
                </div>
                <div
                  data-testid={`stage-count-${step.value}`}
                  style={{
                    fontSize: 'var(--ds-font-size-700)',
                    fontWeight: 700,
                    color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse))'),
                    marginTop: 4,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {count}
                </div>

                {/* Alert badge */}
                <div
                  data-testid={`stage-sparkline-${step.value}`}
                  style={{ marginTop: 4 }}
                >
                  {stalled > 0 ? (
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: 'var(--ds-font-size-50)',
                        lineHeight: '14px',
                        padding: '0px 6px',
                        borderRadius: 8,
                        fontWeight: 600,
                        background: token('color.background.danger', 'var(--ds-background-danger)'),
                        color: token('color.text.danger', 'var(--ds-text-danger)'),
                      }}
                    >
                      {stalled} stuck
                    </span>
                  ) : count > 0 ? (
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: 'var(--ds-font-size-50)',
                        lineHeight: '14px',
                        padding: '0px 6px',
                        borderRadius: 8,
                        fontWeight: 600,
                        background: token('color.background.success', 'var(--ds-background-success)'),
                        color: token('color.text.success', 'var(--ds-text-success)'),
                      }}
                    >
                      on track
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </WidgetShell>

      <StageDrillDownDrawer
        stageValue={openStage?.value ?? null}
        stageLabel={openStage?.label ?? ''}
        onClose={() => setOpenStage(null)}
      />
    </>
  );
}
