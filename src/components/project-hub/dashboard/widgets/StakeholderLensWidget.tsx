// @ts-nocheck
/**
 * StakeholderLensWidget — breakdown of health per product manager / owner.
 * Shows who owns the most at-risk BRs.
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
import { LABEL, BODY, SMALL, STRONG } from '../dashboardTypography';

interface OwnerStat {
  name: string;
  total: number;
  healthy: number;
  atRisk: number;
  overdue: number;
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

export default function StakeholderLensWidget({
  projectId,
  projectKey,
  collapsed,
  onToggleCollapse,
}: WidgetProps) {
  const productQuery = useProductDashboardData(projectId);
  const rows = productQuery.data?.rows ?? [];

  const ownerStats = useMemo((): OwnerStat[] => {
    const byOwner = new Map<string, OwnerStat>();
    for (const r of rows) {
      const name = r.projectManagerName ?? r.poName ?? 'Unassigned';
      const stat = byOwner.get(name) ?? { name, total: 0, healthy: 0, atRisk: 0, overdue: 0 };
      stat.total++;
      const health = toWidgetHealth(r.healthStatus);
      if (health === 'Healthy') stat.healthy++;
      else if (health === 'At Risk') stat.atRisk++;
      else if (health === 'Overdue') stat.overdue++;
      byOwner.set(name, stat);
    }
    return Array.from(byOwner.values())
      .sort((a, b) => b.overdue + b.atRisk - (a.overdue + a.atRisk))
      .slice(0, 8);
  }, [rows]);

  const isLoading = productQuery.isLoading;

  return (
    <WidgetWrapper
      title="Stakeholder Lens"
      subtitle="Health distribution by owner"
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
                height: 44,
                borderRadius: token('border.radius', '4px'),
                background: token('color.background.neutral.subtle', 'var(--ds-background-neutral, #F1F2F4)'),
              }}
            />
          ))}
        </div>
      ) : ownerStats.length === 0 ? (
        <EmptyState
          size="compact"
          header="No owners assigned"
          description="Assign project managers to business requests to see the stakeholder breakdown."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ownerStats.map((owner) => {
            const atRiskTotal = owner.atRisk + owner.overdue;
            return (
              <div
                key={owner.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: token('border.radius', '4px'),
                  background: token('elevation.surface', 'var(--ds-surface, #FFFFFF)'),
                  border: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: atRiskTotal > 0
                      ? 'var(--ds-background-accent-orange-subtle, #FFECEB)'
                      : 'var(--ds-background-neutral, #F1F2F4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      ...LABEL,
                      fontSize: 'var(--ds-font-size-50)',
                      fontWeight: 700,
                      color: atRiskTotal > 0
                        ? 'var(--ds-text-accent-orange-bolder, #974F0C)'
                        : token('color.text.subtle', 'var(--ds-text-subtlest, #626F86)'),
                    }}
                  >
                    {initials(owner.name)}
                  </span>
                </div>

                {/* Name */}
                <span
                  style={{
                    ...BODY,
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={owner.name}
                >
                  {owner.name}
                </span>

                {/* Health chips */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {owner.overdue > 0 && (
                    <span
                      style={{
                        ...LABEL,
                        padding: '2px 6px',
                        borderRadius: 3,
                        background: 'var(--ds-background-accent-red-bolder, #C9372C)',
                        color: 'var(--ds-text-inverse, #FFFFFF)',
                      }}
                    >
                      {owner.overdue} overdue
                    </span>
                  )}
                  {owner.atRisk > 0 && (
                    <span
                      style={{
                        ...LABEL,
                        padding: '2px 6px',
                        borderRadius: 3,
                        background: 'var(--ds-background-accent-orange-bolder, #C25100)',
                        color: 'var(--ds-text-inverse, #FFFFFF)',
                      }}
                    >
                      {owner.atRisk} at risk
                    </span>
                  )}
                  {atRiskTotal === 0 && (
                    <span
                      style={{
                        ...LABEL,
                        padding: '2px 6px',
                        borderRadius: 3,
                        background: 'var(--ds-background-accent-green-bolder, #1F845A)',
                        color: 'var(--ds-text-inverse, #FFFFFF)',
                      }}
                    >
                      {owner.healthy} healthy
                    </span>
                  )}
                </div>

                {/* Total */}
                <span
                  style={{
                    ...SMALL,
                    color: token('color.text.subtlest', 'var(--ds-text-disabled, #8590A2)'),
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {owner.total} BR{owner.total !== 1 ? 's' : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </WidgetWrapper>
  );
}
