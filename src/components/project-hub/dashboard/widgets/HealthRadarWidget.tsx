// @ts-nocheck
/**
 * HealthRadarWidget — list of at-risk and overdue BRs sorted by severity.
 * Product-dashboard only.
 */
import { token } from '@atlaskit/tokens';
import type { WidgetProps } from '../widget-types';
import WidgetWrapper from '../WidgetWrapper';
import { useProductDashboardData } from '@/hooks/useProductDashboardData';
import { useMemo } from 'react';
import { EmptyState } from '@/components/ads';
import { LABEL, BODY, STRONG, SMALL } from '../dashboardTypography';

const HEALTH_BADGE: Record<string, { bg: string; text: string }> = {
  Overdue: {
    bg: 'var(--ds-background-accent-red-bolder)',
    text: 'var(--ds-surface)',
  },
  'At Risk': {
    bg: 'var(--ds-background-accent-orange-bolder)',
    text: 'var(--ds-surface)',
  },
  Healthy: {
    bg: 'var(--ds-background-accent-green-bolder)',
    text: 'var(--ds-surface)',
  },
  Uncommitted: {
    bg: 'var(--ds-background-neutral)',
    text: 'var(--ds-text-subtle)',
  },
};

const SEVERITY_ORDER = ['Overdue', 'At Risk', 'Healthy', 'Uncommitted'];

function toWidgetHealth(s: string | null): string {
  switch (s) {
    case 'On Track': case 'Delivered': case 'Committed': return 'Healthy';
    case 'Delayed': case 'At Risk': return 'At Risk';
    case 'Blocked': return 'Overdue';
    default: return 'Uncommitted';
  }
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

export default function HealthRadarWidget({
  projectId,
  projectKey,
  collapsed,
  onToggleCollapse,
}: WidgetProps) {
  const productQuery = useProductDashboardData(projectId);
  const rows = productQuery.data?.rows ?? [];

  const atRiskRows = useMemo(() => {
    return rows
      .map((r) => ({ ...r, healthStatus: toWidgetHealth(r.healthStatus) }))
      .filter((r) => r.healthStatus === 'Overdue' || r.healthStatus === 'At Risk')
      .sort(
        (a, b) =>
          SEVERITY_ORDER.indexOf(a.healthStatus) - SEVERITY_ORDER.indexOf(b.healthStatus),
      )
      .slice(0, 10);
  }, [rows]);

  const isLoading = productQuery.isLoading;
  const atRiskCount = atRiskRows.length;
  const overdueCount = atRiskRows.filter((r) => r.healthStatus === 'Overdue').length;

  return (
    <WidgetWrapper
      title="Release Health"
      subtitle={`At-risk business requests · ${atRiskCount} need attention`}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
    >
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                height: 48,
                borderRadius: token('border.radius', '4px'),
                background: token('color.background.neutral.subtle', 'var(--ds-background-neutral)'),
              }}
            />
          ))}
        </div>
      ) : atRiskCount === 0 ? (
        <EmptyState
          size="compact"
          header="All clear"
          description="No business requests are overdue or at risk."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* ── Summary strip ─────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: '8px 12px',
              background: overdueCount > 0
                ? 'var(--ds-background-accent-red-subtler)'
                : 'var(--ds-background-accent-orange-subtler)',
              borderRadius: token('border.radius', '4px'),
              border: overdueCount > 0
                ? '1px solid var(--ds-border-accent-red)'
                : '1px solid var(--ds-border-accent-orange)',
            }}
          >
            {overdueCount > 0 && (
              <span
                style={{
                  ...SMALL,
                  color: 'var(--ds-text-accent-red-bolder)',
                  fontWeight: 600,
                }}
              >
                {overdueCount} overdue
              </span>
            )}
            {atRiskCount - overdueCount > 0 && (
              <span
                style={{
                  ...SMALL,
                  color: 'var(--ds-text-accent-orange-bolder)',
                  fontWeight: 600,
                }}
              >
                {atRiskCount - overdueCount} at risk
              </span>
            )}
          </div>

          {/* ── BR rows ───────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {atRiskRows.map((r) => {
              const badge = HEALTH_BADGE[r.healthStatus] ?? HEALTH_BADGE.Uncommitted;
              return (
                <div
                  key={r.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: token('border.radius', '4px'),
                    background: token('elevation.surface', 'var(--ds-surface)'),
                    border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
                  }}
                >
                  {/* Health badge */}
                  <span
                    style={{
                      ...LABEL,
                      padding: '0px 8px',
                      borderRadius: 3,
                      background: badge.bg,
                      color: badge.text,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {r.healthStatus}
                  </span>

                  {/* Title */}
                  <span
                    style={{
                      ...BODY,
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={r.title}
                  >
                    {r.title}
                  </span>

                  {/* End date */}
                  <span
                    style={{
                      ...LABEL,
                      color: r.healthStatus === 'Overdue'
                        ? 'var(--ds-text-accent-red-bolder)'
                        : token('color.text.subtlest', 'var(--ds-text-disabled)'),
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {fmtDate(r.endDate)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}
