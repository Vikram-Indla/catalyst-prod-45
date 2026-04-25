// @ts-nocheck
/**
 * ScopeChangeWidget — original vs added-after-start scope per release.
 *
 * Rewritten Apr 19, 2026 per docs/design/BAU-Dashboard-Atlaskit-Conversion.md §5 Commit 6.
 *   - Bespoke empty-state → <EmptyState>
 *   - var(--cp-*) + Tailwind bg-[#...]/opacity → token() + rgba literals for
 *     the two-segment scope bar (Atlaskit tokens don't expose a
 *     "scope-delta" fill, so the blue/red scope segments remain as scoped
 *     literals — documented here and only used inside this widget).
 *   - Delta % text uses token('color.text.danger') / token('color.text.subtle').
 */
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardScopeChange } from '@/hooks/useDashboardWidgets';
import { token } from '@atlaskit/tokens';
import { EmptyState } from '@/components/ads';
import WidgetGearButton from '../WidgetGearButton';

/** Scope-bar palette — scoped to this widget. See file header. */
const SCOPE_ORIG = 'rgba(37, 99, 235, 0.20)';    // original scope fill (blue @ 20%)
const SCOPE_ADDED = 'rgba(220, 38, 38, 0.15)';   // added-after-start fill (red @ 15%)
const SCOPE_ADDED_BORDER = '#DC2626';

export default function ScopeChangeWidget({ projectId, projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const { data: scopes, isLoading } = useDashboardScopeChange(projectId);

  return (
    <WidgetWrapper
      title="Scope Change"
      subtitle="Items added after release start"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      span={1}
      headerBadges={<WidgetGearButton gadgetType="items" projectKey={projectKey} projectId={projectId} />}
    >
      {isLoading ? (
        <div className="animate-pulse">
          <div
            className="h-12 rounded"
            style={{ background: token('color.background.neutral.subtle', '#F1F5F9') }}
          />
        </div>
      ) : !scopes?.length ? (
        <EmptyState
          size="compact"
          header="No scope data"
          description="Scope tracking requires active releases with start dates."
        />
      ) : (
        <div className="space-y-3">
          {scopes.map((s, i) => {
            const origPct =
              s.totalItems > 0
                ? Math.round(((s.totalItems - s.addedAfterStart) / s.totalItems) * 100)
                : 100;
            const addedPct = s.totalItems > 0 ? Math.round((s.addedAfterStart / s.totalItems) * 100) : 0;
            return (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: token('color.text', '#172B4D'),
                    }}
                  >
                    {s.releaseName}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: 'var(--cp-font-mono)',
                      color:
                        s.deltaPercent > 0
                          ? token('color.text.danger', '#AE2A19')
                          : token('color.text.subtle', '#6B778C'),
                    }}
                  >
                    {s.deltaPercent > 0 ? `+${s.deltaPercent}%` : '0%'}
                  </span>
                </div>
                {/* Scope bar */}
                <div
                  className="flex"
                  style={{ height: 18, borderRadius: 3, overflow: 'hidden' }}
                >
                  <div style={{ width: `${origPct}%`, background: SCOPE_ORIG }} />
                  {addedPct > 0 && (
                    <div
                      style={{
                        width: `${addedPct}%`,
                        background: SCOPE_ADDED,
                        borderLeft: `2px solid ${SCOPE_ADDED_BORDER}`,
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
          {/* Legend */}
          <div
            className="flex items-center gap-4"
            style={{ fontSize: 11, color: token('color.text.subtle', '#6B778C') }}
          >
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block"
                style={{ width: 8, height: 8, borderRadius: 2, background: SCOPE_ORIG }}
              />
              Original scope
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: SCOPE_ADDED,
                  border: `1px solid ${SCOPE_ADDED_BORDER}`,
                }}
              />
              Added after start
            </span>
          </div>
          <div
            style={{
              fontSize: 10,
              color: token('color.text.subtlest', '#6B778C'),
              fontFamily: 'var(--cp-font-mono)',
            }}
          >
            jira_created_at &gt; ph_versions.start_date
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}
