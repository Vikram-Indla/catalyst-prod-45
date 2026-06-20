// @ts-nocheck
/**
 * ReleaseConfidenceWidget — delivery confidence score per product.
 * Computes: % of BRs that are Healthy (confidence), avg days overdue for at-risk BRs.
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
import { LABEL, SMALL, STRONG, H_NUM } from '../dashboardTypography';

function confidenceColor(score: number): string {
  if (score >= 80) return 'var(--ds-text-accent-green-bolder, #216E4E)';
  if (score >= 50) return 'var(--ds-text-accent-orange-bolder, #974F0C)';
  return 'var(--ds-text-accent-red-bolder, #AE2A19)';
}

function confidenceBg(score: number): string {
  if (score >= 80) return 'var(--ds-background-accent-green-subtler, #DCFFF1)';
  if (score >= 50) return 'var(--ds-background-accent-orange-subtler, #FFF3D9)';
  return 'var(--ds-background-accent-red-subtler, #FFECEB)';
}

function confidenceBar(score: number): string {
  if (score >= 80) return 'var(--ds-background-accent-green-bolder, #1F845A)';
  if (score >= 50) return 'var(--ds-background-accent-orange-bolder, #C25100)';
  return 'var(--ds-background-accent-red-bolder, #C9372C)';
}

function fmtDays(days: number): string {
  if (days === 0) return '—';
  return `${days}d`;
}

export default function ReleaseConfidenceWidget({
  projectId,
  projectKey,
  collapsed,
  onToggleCollapse,
}: WidgetProps) {
  const productQuery = useProductDashboardData(projectId);
  const rows = productQuery.data?.rows ?? [];

  const stats = useMemo(() => {
    if (!rows.length) return null;
    const today = Date.now();
    let healthy = 0;
    let totalDaysOverdue = 0;
    let overdueCount = 0;
    let atRisk = 0;
    for (const r of rows) {
      const status = toWidgetHealth(r.healthStatus);
      if (status === 'Healthy') healthy++;
      if (status === 'At Risk') atRisk++;
      if (status === 'Overdue') {
        overdueCount++;
        if (r.endDate) {
          const diff = Math.max(0, Math.round((today - new Date(r.endDate).getTime()) / 86400000));
          totalDaysOverdue += diff;
        }
      }
    }
    const total = rows.length;
    const score = total > 0 ? Math.round((healthy / total) * 100) : 0;
    const avgDaysOverdue = overdueCount > 0 ? Math.round(totalDaysOverdue / overdueCount) : 0;
    return { score, healthy, atRisk, overdueCount, avgDaysOverdue, total };
  }, [rows]);

  const isLoading = productQuery.isLoading;

  return (
    <WidgetWrapper
      title="Release Confidence"
      subtitle="Delivery confidence score for this product"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
    >
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                height: 72,
                borderRadius: token('border.radius', '4px'),
                background: token('color.background.neutral.subtle', '#F1F2F4'),
              }}
            />
          ))}
        </div>
      ) : !stats || stats.total === 0 ? (
        <EmptyState
          size="compact"
          header="No data"
          description="Add business requests to compute delivery confidence."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ── Score card ──────────────────────────────────────── */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: token('border.radius', '4px'),
              background: confidenceBg(stats.score),
              border: `1px solid ${confidenceBar(stats.score)}`,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ ...LABEL, color: confidenceColor(stats.score) }}>
                Confidence score
              </span>
              <span
                style={{
                  ...H_NUM,
                  fontSize: 36,
                  lineHeight: 1,
                  color: confidenceColor(stats.score),
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {stats.score}%
              </span>
            </div>

            <div
              style={{
                flex: 1,
                height: 12,
                borderRadius: 6,
                background: token('color.background.neutral', '#F1F2F4'),
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${stats.score}%`,
                  height: '100%',
                  background: confidenceBar(stats.score),
                  borderRadius: 6,
                  transition: 'width 400ms cubic-bezier(0.4,0,0.2,1)',
                }}
              />
            </div>
          </div>

          {/* ── KPI strip ───────────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              background: token('elevation.surface.sunken', '#F7F8F9'),
              borderRadius: token('border.radius', '4px'),
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              overflow: 'hidden',
            }}
          >
            {[
              {
                label: 'Healthy',
                value: stats.healthy,
                accent: stats.healthy > 0 ? 'var(--ds-text-accent-green-bolder, #216E4E)' : undefined,
              },
              {
                label: 'At risk',
                value: stats.atRisk,
                accent: stats.atRisk > 0 ? 'var(--ds-text-accent-orange-bolder, #974F0C)' : undefined,
              },
              {
                label: 'Overdue',
                value: stats.overdueCount,
                accent: stats.overdueCount > 0 ? 'var(--ds-text-accent-red-bolder, #AE2A19)' : undefined,
              },
              {
                label: 'Avg overdue',
                value: fmtDays(stats.avgDaysOverdue),
                accent: stats.avgDaysOverdue > 0 ? 'var(--ds-text-accent-red-bolder, #AE2A19)' : undefined,
              },
            ].map((cell, i, arr) => (
              <div
                key={cell.label}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  padding: '10px 10px',
                  borderRight: i < arr.length - 1 ? `1px solid ${token('color.border', '#DFE1E6')}` : 'none',
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    ...LABEL,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {cell.label}
                </span>
                <span
                  style={{
                    ...H_NUM,
                    lineHeight: 1.1,
                    color: cell.accent ?? token('color.text', '#292A2E'),
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {cell.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}
