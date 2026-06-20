// @ts-nocheck
/**
 * BrPulseMapWidget — health distribution across Business Requests.
 * Shows count of BRs per health status (Healthy / At Risk / Overdue / Uncommitted).
 * Product-dashboard only (hideOnProject: true, hideOnIncident: true).
 */
import { token } from '@atlaskit/tokens';
import type { WidgetProps } from '../widget-types';
import WidgetWrapper from '../WidgetWrapper';
import { useProductDashboardData } from '@/hooks/useProductDashboardData';
import { useMemo } from 'react';
import { EmptyState } from '@/components/ads';
import { LABEL, SMALL, STRONG, H_NUM } from '../dashboardTypography';

/** Maps engine's 7-state health to the 4-category widget system. */
function toWidgetHealth(s: string | null): string {
  switch (s) {
    case 'On Track':
    case 'Delivered':
    case 'Committed':
      return 'Healthy';
    case 'Delayed':
    case 'At Risk':
      return 'At Risk';
    case 'Blocked':
      return 'Overdue';
    default:
      return 'Uncommitted';
  }
}

const HEALTH_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Healthy: {
    bg: 'var(--ds-background-accent-green-subtler, #DCFFF1)',
    text: 'var(--ds-text-accent-green-bolder, #216E4E)',
    border: 'var(--ds-border-accent-green, #1F845A)',
  },
  'At Risk': {
    bg: 'var(--ds-background-accent-orange-subtler, #FFF3D9)',
    text: 'var(--ds-text-accent-orange-bolder, #974F0C)',
    border: 'var(--ds-border-accent-orange, #C25100)',
  },
  Overdue: {
    bg: 'var(--ds-background-accent-red-subtler, #FFECEB)',
    text: 'var(--ds-text-accent-red-bolder, #AE2A19)',
    border: 'var(--ds-border-accent-red, #C9372C)',
  },
  Uncommitted: {
    bg: 'var(--ds-background-neutral-subtle, #F7F8F9)',
    text: 'var(--ds-text-subtle, #626F86)',
    border: 'var(--ds-border, #DFE1E6)',
  },
};

const STATUS_ORDER = ['Healthy', 'At Risk', 'Overdue', 'Uncommitted'];

export default function BrPulseMapWidget({
  projectId,
  projectKey,
  collapsed,
  onToggleCollapse,
}: WidgetProps) {
  const productQuery = useProductDashboardData(projectId);
  const rows = productQuery.data?.rows ?? [];

  const distribution = useMemo(() => {
    const counts: Record<string, number> = {
      Healthy: 0,
      'At Risk': 0,
      Overdue: 0,
      Uncommitted: 0,
    };
    for (const r of rows) {
      const w = toWidgetHealth(r.healthStatus);
      counts[w]++;
    }
    return counts;
  }, [rows]);

  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  const isLoading = productQuery.isLoading;

  return (
    <WidgetWrapper
      title="BR Pulse Map"
      subtitle="Health distribution across Business Requests"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
    >
      {isLoading ? (
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                flex: 1,
                height: 96,
                borderRadius: token('border.radius', '4px'),
                background: token('color.background.neutral.subtle', '#F1F2F4'),
              }}
            />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState
          size="compact"
          header="No business requests"
          description="Add business requests to this product to see health distribution."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ── Stacked bar ─────────────────────────────────────── */}
          <div
            style={{
              height: 12,
              borderRadius: 6,
              overflow: 'hidden',
              display: 'flex',
              background: token('color.background.neutral', '#F1F2F4'),
            }}
          >
            {STATUS_ORDER.filter((s) => distribution[s] > 0).map((s) => (
              <div
                key={s}
                style={{
                  width: `${(distribution[s] / total) * 100}%`,
                  background: HEALTH_COLORS[s].border,
                  transition: 'width 320ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            ))}
          </div>

          {/* ── KPI cards ───────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 8 }}>
            {STATUS_ORDER.map((s) => {
              const c = distribution[s];
              const pct = total > 0 ? Math.round((c / total) * 100) : 0;
              const palette = HEALTH_COLORS[s];
              return (
                <div
                  key={s}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: token('border.radius', '4px'),
                    background: palette.bg,
                    border: `1px solid ${palette.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      ...LABEL,
                      color: palette.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s}
                  </span>
                  <span style={{ ...H_NUM, color: palette.text, lineHeight: 1.1 }}>{c}</span>
                  <span style={{ ...LABEL, color: palette.text }}>{pct}%</span>
                </div>
              );
            })}
          </div>

          <div
            style={{
              ...SMALL,
              color: token('color.text.subtlest', '#8590A2'),
              textAlign: 'right',
            }}
          >
            {total} business request{total !== 1 ? 's' : ''} total
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}
