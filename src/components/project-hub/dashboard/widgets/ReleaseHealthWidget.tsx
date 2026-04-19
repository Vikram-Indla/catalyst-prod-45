// @ts-nocheck
/**
 * ReleaseHealthWidget — active release progress glance.
 *
 * Rewritten Apr 19, 2026 per docs/design/BAU-Dashboard-Atlaskit-Conversion.md §5 Commit 6.
 *   - Bespoke empty-state → <EmptyState>
 *   - Bespoke IN PROGRESS pill → <StatusLozenge status="inProgress">
 *   - Bespoke <div> progress fill → <ProgressBar>
 *   - var(--cp-*) / inline hex → token()
 */
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardReleaseHealth } from '@/hooks/useDashboardWidgets';
import { ExternalLink, AlertTriangle } from 'lucide-react';
import { token } from '@atlaskit/tokens';
import { EmptyState, StatusLozenge, ProgressBar } from '@/components/ads';

export default function ReleaseHealthWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { data: releases, isLoading } = useDashboardReleaseHealth(projectId);
  const rel = releases?.[0];

  const footer = (
    <a
      href={`/release-hub?project=${projectKey}`}
      style={{
        fontSize: 12,
        fontWeight: 500,
        color: token('color.link', '#0052CC'),
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      View in ReleaseHub <ExternalLink size={11} />
    </a>
  );

  return (
    <WidgetWrapper
      title="Release Health"
      subtitle="Active release progress"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      span={1}
      footer={footer}
    >
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          <div
            className="h-4 rounded"
            style={{ width: '60%', background: token('color.background.neutral.subtle', '#F1F5F9') }}
          />
          <div
            className="h-2 rounded"
            style={{ background: token('color.background.neutral.subtle', '#F1F5F9') }}
          />
        </div>
      ) : !rel ? (
        <EmptyState
          size="compact"
          header="No active releases"
          description="Create a release to track delivery progress."
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span
              style={{
                fontSize: 13,
                fontWeight: 650,
                color: token('color.text', '#172B4D'),
              }}
            >
              {rel.name}
            </span>
            <StatusLozenge status="inProgress">IN PROGRESS</StatusLozenge>
          </div>
          <div style={{ fontSize: 12, color: token('color.text.subtle', '#6B778C') }}>
            {rel.done} of {rel.total} items done
          </div>
          {/* Progress bar — Atlaskit determinate */}
          <ProgressBar
            value={Math.min(1, Math.max(0, (rel.completionPct ?? 0) / 100))}
            aria-label={`${rel.completionPct}% complete`}
          />
          <div className="flex items-center justify-between" style={{ fontSize: 11 }}>
            <span style={{ color: token('color.text.subtle', '#6B778C') }}>
              {rel.completionPct}% complete
            </span>
            {rel.targetDate && (
              <span
                style={{
                  color: rel.atRisk
                    ? token('color.text.warning', '#974F0C')
                    : token('color.text.subtle', '#6B778C'),
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {rel.atRisk && <AlertTriangle size={10} />}
                End:{' '}
                {new Date(rel.targetDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}
