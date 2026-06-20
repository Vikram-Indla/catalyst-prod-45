// @ts-nocheck
/**
 * DeliveryCompositionWidget — breakdown of BRs by process step,
 * overlaid with health status. Shows the pipeline shape.
 * Product-dashboard only.
 */
import { token } from '@atlaskit/tokens';
import type { WidgetProps } from '../widget-types';
import WidgetWrapper from '../WidgetWrapper';
import { useProductDashboardData } from '@/hooks/useProductDashboardData';
import { useMemo } from 'react';

function toWidgetHealth(s: string | null): string {
  switch (s) {
    case 'On Track': case 'Delivered': case 'Committed': return 'Healthy';
    case 'Delayed': case 'At Risk': return 'At Risk';
    case 'Blocked': return 'Overdue';
    default: return 'Uncommitted';
  }
}
import { EmptyState } from '@/components/ads';
import { LABEL, BODY, SMALL } from '../dashboardTypography';

const STEP_ORDER = [
  'discovery',
  'planning',
  'in_progress',
  'in progress',
  'review',
  'done',
  'approved',
  'completed',
  'closed',
  'on hold',
  'on_hold',
  'blocked',
  'paused',
];

function formatStep(step: string): string {
  return step
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function stepSortKey(step: string): number {
  const idx = STEP_ORDER.indexOf(step.toLowerCase());
  return idx === -1 ? 99 : idx;
}

interface StepBucket {
  step: string;
  total: number;
  healthy: number;
  atRisk: number;
  overdue: number;
  uncommitted: number;
}

export default function DeliveryCompositionWidget({
  projectId,
  projectKey,
  collapsed,
  onToggleCollapse,
}: WidgetProps) {
  const productQuery = useProductDashboardData(projectId);
  const rows = productQuery.data?.rows ?? [];

  const buckets = useMemo((): StepBucket[] => {
    const byStep = new Map<string, StepBucket>();
    for (const r of rows) {
      const step = (r.processStep ?? 'Unknown').trim();
      const bucket = byStep.get(step) ?? {
        step,
        total: 0,
        healthy: 0,
        atRisk: 0,
        overdue: 0,
        uncommitted: 0,
      };
      bucket.total++;
      const health = toWidgetHealth(r.healthStatus);
      if (health === 'Healthy') bucket.healthy++;
      else if (health === 'At Risk') bucket.atRisk++;
      else if (health === 'Overdue') bucket.overdue++;
      else bucket.uncommitted++;
      byStep.set(step, bucket);
    }
    return Array.from(byStep.values()).sort(
      (a, b) => stepSortKey(a.step) - stepSortKey(b.step),
    );
  }, [rows]);

  const maxTotal = Math.max(...buckets.map((b) => b.total), 1);
  const isLoading = productQuery.isLoading;

  return (
    <WidgetWrapper
      title="Delivery Composition"
      subtitle="Business requests by process step and health"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
    >
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                height: 40,
                borderRadius: token('border.radius', '4px'),
                background: token('color.background.neutral.subtle', '#F1F2F4'),
              }}
            />
          ))}
        </div>
      ) : buckets.length === 0 ? (
        <EmptyState
          size="compact"
          header="No business requests"
          description="Add business requests to see the delivery pipeline."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* ── Column headers ─────────────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '140px 1fr 40px',
              gap: 8,
              paddingBottom: 6,
              borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
            }}
          >
            <span style={{ ...LABEL, color: token('color.text.subtlest', '#8590A2') }}>Step</span>
            <span style={{ ...LABEL, color: token('color.text.subtlest', '#8590A2') }}>
              Health breakdown
            </span>
            <span
              style={{
                ...LABEL,
                color: token('color.text.subtlest', '#8590A2'),
                textAlign: 'right',
              }}
            >
              Total
            </span>
          </div>

          {/* ── Rows ─────────────────────────────────────────────── */}
          {buckets.map((b) => {
            const overdueW = (b.overdue / maxTotal) * 100;
            const atRiskW = (b.atRisk / maxTotal) * 100;
            const healthyW = (b.healthy / maxTotal) * 100;
            const uncommittedW = (b.uncommitted / maxTotal) * 100;
            return (
              <div
                key={b.step}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr 40px',
                  gap: 8,
                  alignItems: 'center',
                  padding: '4px 0',
                }}
              >
                {/* Step name */}
                <span
                  style={{
                    ...BODY,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={formatStep(b.step)}
                >
                  {formatStep(b.step)}
                </span>

                {/* Stacked mini bar */}
                <div
                  style={{
                    height: 20,
                    borderRadius: 3,
                    background: token('color.background.neutral', '#F1F2F4'),
                    overflow: 'hidden',
                    display: 'flex',
                  }}
                >
                  {b.overdue > 0 && (
                    <div
                      style={{
                        width: `${overdueW}%`,
                        background: 'var(--ds-background-accent-red-bolder, #C9372C)',
                      }}
                    />
                  )}
                  {b.atRisk > 0 && (
                    <div
                      style={{
                        width: `${atRiskW}%`,
                        background: 'var(--ds-background-accent-orange-bolder, #C25100)',
                      }}
                    />
                  )}
                  {b.healthy > 0 && (
                    <div
                      style={{
                        width: `${healthyW}%`,
                        background: 'var(--ds-background-accent-green-bolder, #1F845A)',
                      }}
                    />
                  )}
                  {b.uncommitted > 0 && (
                    <div
                      style={{
                        width: `${uncommittedW}%`,
                        background: token('color.background.neutral.hovered', '#DCDFE4'),
                      }}
                    />
                  )}
                </div>

                {/* Total */}
                <span
                  style={{
                    ...SMALL,
                    textAlign: 'right',
                    color: token('color.text', '#292A2E'),
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {b.total}
                </span>
              </div>
            );
          })}

          {/* ── Legend ───────────────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              paddingTop: 8,
              borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
              flexWrap: 'wrap',
            }}
          >
            {[
              { label: 'Overdue', color: 'var(--ds-background-accent-red-bolder, #C9372C)' },
              { label: 'At Risk', color: 'var(--ds-background-accent-orange-bolder, #C25100)' },
              { label: 'Healthy', color: 'var(--ds-background-accent-green-bolder, #1F845A)' },
              { label: 'Uncommitted', color: token('color.background.neutral.hovered', '#DCDFE4') },
            ].map((l) => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div
                  style={{ width: 10, height: 10, borderRadius: 2, background: l.color, flexShrink: 0 }}
                />
                <span style={{ ...LABEL, color: token('color.text.subtle', '#626F86') }}>
                  {l.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}
