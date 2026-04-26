// @ts-nocheck
/**
 * ReleaseHealthWidget — multi-row glance of ALL non-completed releases.
 *
 * Apr 26, 2026 — Enterprise redesign per per-widget design brief.
 *   Mental model: "Are our active releases on track?"
 *
 * Span = 4 (narrow). Layout adapts to the constrained width:
 *   - 3-up KPI headline strip — Active / On track / At risk.
 *   - One row per release: title + status lozenge on top, 14px progress
 *     bar with % on the right, "X of Y items · End Mar 26" subline. Bar
 *     fill is Atlaskit canonical brand-bold (in progress) or success-bold
 *     (done). At-risk releases get a red ring on the bar end + warning
 *     icon next to the end date.
 *   - Verbose meta inlined into a single subline so each row stays at
 *     ~64px even on narrow widgets.
 *
 * Wiring strictly preserved:
 *   - openAll → openUWV with all release fixVersions for cross-release view.
 *   - Header expand uses the same handler.
 *   - WidgetGearButton in headerBadges.
 *   - useDashboardFilter (page-level) + useGadgetSettings (per-gadget)
 *     forwarded into the hook.
 *   - Footer "View all N releases" link.
 */
import { AlertTriangle } from 'lucide-react';
import { token } from '@atlaskit/tokens';
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardReleaseHealth } from '@/hooks/useDashboardWidgets';
import { useUWV } from '@/components/universal-work-view/UWVContext';
import { EmptyState, StatusLozenge } from '@/components/ads';
import { useDashboardFilter } from '@/contexts/DashboardFilterContext';
import { useGadgetSettings } from '@/hooks/useGadgetSettings';
import WidgetGearButton from '../WidgetGearButton';

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
  const { filter } = useDashboardFilter();
  const { settings } = useGadgetSettings('release', projectKey);
  const maxRows = (settings.gadgetSpecific?.maxRows as number | undefined) ?? 6;

  const { data: releases, isLoading } = useDashboardReleaseHealth(projectId, {
    dateFrom: filter.dateFrom,
    dateTo: filter.dateTo,
    releaseFilter: settings.releaseFilter,
    statusFilter: settings.statusFilter,
    assigneeFilter: settings.assigneeFilter,
    itemTypeFilter: settings.itemTypeFilter,
    priorityFilter: settings.priorityFilter,
    maxRows,
  });
  const { openUWV } = useUWV();

  const all = releases ?? [];
  const count = all.length;
  const atRiskCount = all.filter((r: any) => r.atRisk).length;
  const onTrackCount = all.filter((r: any) => !r.atRisk).length;

  const openAll = () =>
    openUWV({
      project: projectKey,
      hubSource: ['projecthub'],
      dataType: 'epics',
      title: `Release Health · ${projectKey}`,
      fixVersions: all.map((r: any) => r.name).filter(Boolean),
    });

  const headerExtras = (
    <WidgetGearButton gadgetType="release" projectKey={projectKey} projectId={projectId} />
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
        color: token('color.link', '#0C66E4'),
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
      onExpand={openAll}
      footer={footer}
      headerBadges={headerExtras}
    >
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                height: 56,
                borderRadius: token('border.radius', '4px'),
                background: token('color.background.neutral.subtle', '#F1F5F9'),
              }}
            />
          ))}
        </div>
      ) : count === 0 ? (
        <EmptyState
          size="compact"
          header="No active releases"
          description="Create a release to track delivery progress."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* ── KPI headline strip ─────────────────────────────────────── */}
          <KpiHeadline active={count} onTrack={onTrackCount} atRisk={atRiskCount} />

          {/* ── Release rows ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {all.slice(0, maxRows).map((rel: any) => (
              <ReleaseRow key={rel.id} release={rel} />
            ))}
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}

// ─── KPI headline (3-up, narrow-friendly) ─────────────────────────────────

function KpiHeadline({
  active,
  onTrack,
  atRisk,
}: {
  active: number;
  onTrack: number;
  atRisk: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        background: token('elevation.surface.sunken', '#F7F8F9'),
        borderRadius: token('border.radius', '4px'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        overflow: 'hidden',
      }}
    >
      <KpiCell label="Active" value={active} />
      <KpiCell
        label="On track"
        value={onTrack}
        accent={onTrack > 0 ? 'var(--ds-text-accent-green-bolder, #216E4E)' : undefined}
      />
      <KpiCell
        label="At risk"
        value={atRisk}
        accent={atRisk > 0 ? 'var(--ds-text-accent-red-bolder, #AE2A19)' : undefined}
        last
      />
    </div>
  );
}

function KpiCell({
  label,
  value,
  accent,
  last,
}: {
  label: string;
  value: number;
  accent?: string;
  last?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '10px 10px',
        borderRight: last ? 'none' : `1px solid ${token('color.border', '#DFE1E6')}`,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: token('color.text.subtlest', '#626F86'),
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 24,
          fontWeight: 600,
          lineHeight: 1.1,
          color: accent ?? token('color.text', '#172B4D'),
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Release row ───────────────────────────────────────────────────────────

function ReleaseRow({ release: rel }: { release: any }) {
  const pct = Math.min(100, Math.max(0, rel.completionPct ?? 0));
  const isDone = pct >= 100;
  const atRisk = !!rel.atRisk;
  const fill = isDone
    ? 'var(--ds-background-accent-green-bolder, #1F845A)'
    : atRisk
      ? 'var(--ds-background-accent-red-bolder, #C9372C)'
      : 'var(--ds-background-accent-blue-bolder, #0C66E4)';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {/* Top line: name + status lozenge */}
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
            fontWeight: 600,
            color: token('color.text', '#172B4D'),
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            minWidth: 0,
            letterSpacing: '-0.005em',
          }}
          title={rel.name}
        >
          {rel.name}
        </span>
        <StatusLozenge status={statusCategoryFor(rel.status)}>
          {statusLabelFor(rel.status)}
        </StatusLozenge>
      </div>

      {/* Middle line: thick bar + % on the right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            flex: 1,
            height: 14,
            borderRadius: 7,
            background: token('color.background.neutral', '#F1F2F4'),
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: fill,
              borderRadius: 7,
              transition: 'width 320ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            minWidth: 44,
            textAlign: 'right',
            color: atRisk
              ? 'var(--ds-text-accent-red-bolder, #AE2A19)'
              : token('color.text', '#172B4D'),
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {pct}%
        </span>
      </div>

      {/* Bottom line: "X of Y items · End Mar 26" */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 11,
          color: token('color.text.subtle', '#626F86'),
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span>
          <span style={{ fontWeight: 600, color: token('color.text', '#172B4D') }}>
            {rel.done}
          </span>{' '}
          of {rel.total} items
        </span>
        {rel.targetDate && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: atRisk
                ? 'var(--ds-text-accent-red-bolder, #AE2A19)'
                : token('color.text.subtle', '#626F86'),
            }}
          >
            {atRisk && <AlertTriangle size={11} aria-hidden />}
            End {fmtDate(rel.targetDate)}
          </span>
        )}
      </div>
    </div>
  );
}
