// @ts-nocheck
/**
 * ReleaseHealthWidget — multi-row glance of ALL non-completed releases.
 *
 * Rebuilt Apr 25, 2026 per Forge G7 brief:
 *   - Shows every active release (not just one)
 *   - Each row: name · StatusLozenge · 6px progress · X of Y · end date
 *   - Percentages in JetBrains Mono
 *   - Footer: "View all N releases" → opens ReleaseHealthUWV overlay
 *   - Settings gear stub in header
 *
 * GUARDRAILS:
 *   - StatusLozenge: grey/blue/green only
 *   - Hex literals only (no HSL)
 *   - Progress fill: #0052CC (in progress) | #006644 (done) | #DFE1E6 (track)
 *   - Empty state via <EmptyState>
 */
import { Settings as SettingsIcon, AlertTriangle } from 'lucide-react';
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardReleaseHealth } from '@/hooks/useDashboardWidgets';
import { useUWV } from '@/components/universal-work-view/UWVContext';
import { EmptyState, StatusLozenge } from '@/components/ads';

const MONO_STACK = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

function statusCategoryFor(status?: string | null): 'default' | 'inProgress' | 'success' {
  const s = (status ?? '').toLowerCase();
  if (s === 'done' || s === 'completed' || s === 'released') return 'success';
  if (s === 'in_progress' || s === 'in progress' || s === 'active') return 'inProgress';
  return 'default';
}

function statusLabelFor(status?: string | null): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'done' || s === 'completed' || s === 'released') return 'DONE';
  if (s === 'in_progress' || s === 'in progress' || s === 'active') return 'IN PROGRESS';
  return 'TO DO';
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

export default function ReleaseHealthWidget({
  projectId,
  projectKey,
  collapsed,
  onToggleCollapse,
}: WidgetProps) {
  const { data: releases, isLoading } = useDashboardReleaseHealth(projectId);
  const { openUWV } = useUWV();

  const count = releases?.length ?? 0;

  const openAll = () =>
    openUWV({
      project: projectKey,
      projectId: projectId,
      hubSource: ['releasehub'],
      dataType: 'releases',
      title: `Release Health · ${projectKey}`,
    });

  const headerExtras = (
    <button
      type="button"
      aria-label="Release Health settings"
      onClick={(e) => e.stopPropagation()}
      style={{
        background: 'transparent',
        border: 0,
        padding: 4,
        cursor: 'pointer',
        borderRadius: 3,
        display: 'flex',
        alignItems: 'center',
        color: '#42526E',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#F4F5F7')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <SettingsIcon size={14} />
    </button>
  );

  const footer = (
    <button
      type="button"
      onClick={openAll}
      style={{
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        fontSize: 12,
        color: '#0052CC',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      View all {count > 0 ? `${count} ` : ''}
      {count === 1 ? 'release' : 'releases'} ↗
    </button>
  );

  return (
    <WidgetWrapper
      title="Release Health"
      subtitle="Active releases"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      span={1}
      footer={footer}
      headerBadges={headerExtras}
    >
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          <div style={{ height: 14, width: '60%', background: '#F1F2F4', borderRadius: 3 }} />
          <div style={{ height: 6, background: '#F1F2F4', borderRadius: 3 }} />
          <div style={{ height: 14, width: '50%', background: '#F1F2F4', borderRadius: 3 }} />
        </div>
      ) : count === 0 ? (
        <EmptyState
          size="compact"
          header="No active releases"
          description="Create a release to track delivery progress."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(releases ?? []).slice(0, 6).map((rel: any) => {
            const pct = rel.completionPct ?? 0;
            const isDone = pct >= 100;
            const fill = isDone ? '#006644' : '#0052CC';
            return (
              <div
                key={rel.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  paddingBottom: 8,
                  borderBottom: '1px solid #F1F2F4',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 650,
                      color: '#172B4D',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      minWidth: 0,
                    }}
                    title={rel.name}
                  >
                    {rel.name}
                  </span>
                  <StatusLozenge status={statusCategoryFor(rel.status)}>
                    {statusLabelFor(rel.status)}
                  </StatusLozenge>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      borderRadius: 3,
                      background: '#DFE1E6',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, pct))}%`,
                        height: '100%',
                        background: fill,
                        transition: 'width 200ms ease',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: MONO_STACK,
                      fontSize: 11,
                      color: '#42526E',
                      minWidth: 36,
                      textAlign: 'right',
                    }}
                  >
                    {pct}%
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    color: '#6B778C',
                  }}
                >
                  <span>
                    {rel.done} of {rel.total} items done
                  </span>
                  {rel.targetDate && (
                    <span
                      style={{
                        color: rel.atRisk ? '#974F0C' : '#6B778C',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {rel.atRisk && <AlertTriangle size={10} />}
                      End: {fmtDate(rel.targetDate)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WidgetWrapper>
  );
}
