// @ts-nocheck
/**
 * ItemsByStatusWidget — 4-bucket status distribution.
 *
 * Apr 26, 2026 — Enterprise redesign per design critique.
 *   - Stripped 3 of 4 chart variants (Stacked / V-Bar / Donut). H-Bar is the
 *     only view because (a) users rarely re-toggle, (b) the toggle row was
 *     out-competing the actual data for visual attention, (c) one canonical
 *     view is the right call for an executive dashboard.
 *   - Replaced subtler-pastel palette with Atlaskit BOLDER category tokens.
 *     Bolder hex values exist as fallbacks for browsers that don't yet have
 *     the ADS variable resolved at paint time.
 *   - Bars: 6px → 16px tall, fully rounded ends (8px radius), and a darker
 *     track so the bar stands out against the card surface.
 *   - Added KPI headline strip above the bars: total + Done/Blocked at a
 *     glance, executive-formatted (large monospace number, contextual
 *     pill tail).
 *   - Each row shows category-bolder fill + count + percentage + hover row
 *     background. Empty/zero rows render a "—" placeholder so the eye
 *     doesn't have to count missing buckets.
 *   - Blocked breakdown lives in its own subtle Section beneath the chart
 *     with red-accent left border for scanning.
 *
 * Status fill colours kept as `var(--ds-*)` raw strings — Atlaskit's
 * `token()` resolver is render-time only; module-scope constants must
 * use the CSS variable form (paint-time, theme-aware via the provider).
 */
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import WidgetGearButton from '../WidgetGearButton';
import { useDashboardStatusCounts } from '@/hooks/useDashboardWidgets';
import { useGadgetSettings } from '@/hooks/useGadgetSettings';
import { token } from '@atlaskit/tokens';
import { Lozenge, EmptyState } from '@/components/ads';
import { useUWV } from '@/components/universal-work-view/UWVContext';

/**
 * Status palette — Atlaskit BOLDER category tokens. Bolder reads with
 * authority on a thick bar; the previous subtler variants washed out at
 * 16px height. Track stays neutral-subtle so each fill anchors clearly.
 */
const C = {
  todo: {
    fill: 'var(--ds-background-accent-gray-bolder, #626F86)',
    track: 'var(--ds-background-neutral, #F1F2F4)',
    label: 'var(--ds-text-subtle, #44546F)',
  },
  inProgress: {
    fill: 'var(--ds-background-accent-blue-bolder, #0C66E4)',
    track: 'var(--ds-background-neutral, #F1F2F4)',
    label: 'var(--ds-text-accent-blue-bolder, #0055CC)',
  },
  blocked: {
    fill: 'var(--ds-background-accent-red-bolder, #C9372C)',
    track: 'var(--ds-background-neutral, #F1F2F4)',
    label: 'var(--ds-text-accent-red-bolder, #AE2A19)',
  },
  done: {
    fill: 'var(--ds-background-accent-green-bolder, #1F845A)',
    track: 'var(--ds-background-neutral, #F1F2F4)',
    label: 'var(--ds-text-accent-green-bolder, #216E4E)',
  },
} as const;

type Bucket = {
  key: 'done' | 'todo' | 'inProgress' | 'blocked';
  label: string;
  count: number;
};

export default function ItemsByStatusWidget({
  projectId, projectKey, collapsed, onToggleCollapse,
}: WidgetProps) {
  const { settings } = useGadgetSettings('items', projectKey);
  const blockedStatuses: string[] =
    settings.gadgetSpecific?.blockedStatuses ??
    ['on hold', 'blocked', 'awaiting info', 'impediment'];

  const { data: counts, isLoading } = useDashboardStatusCounts(projectId, {
    dateFrom:       settings.dateFrom,
    dateTo:         settings.dateTo,
    releaseFilter:  settings.releaseFilter,
    assigneeFilter: settings.assigneeFilter,
    itemTypeFilter: settings.itemTypeFilter,
    priorityFilter: settings.priorityFilter,
    blockedStatuses,
  });
  const {
    todo = 0, inProgress = 0, done = 0, blocked = 0, total = 0,
    blockedDetail = { onHold: 0, awaitingInfo: 0, blocked: 0 },
  } = counts ?? {};

  const { openUWV } = useUWV();

  const handleExpand = () => openUWV({
    project: projectKey,
    hubSource: ['projecthub'],
    dataType: 'all',
    title: `Items by Status · ${projectKey}`,
    scope: settings.dateFrom ? 'custom' : 'all',
    dateFrom: settings.dateFrom ?? null,
    dateTo: settings.dateTo ?? null,
    dateLabel: settings.dateLabel,
    assigneeFilter: settings.assigneeFilter,
    itemTypeFilter: settings.itemTypeFilter,
    priorityFilter: settings.priorityFilter,
    releaseFilter: settings.releaseFilter,
  });

  // Canonical status order — Done leads (it's the headline KPI), then
  // active work (To Do, In Progress), then exceptions (Blocked) at the tail.
  const buckets: Bucket[] = [
    { key: 'done',       label: 'Done',        count: done },
    { key: 'todo',       label: 'To Do',       count: todo },
    { key: 'inProgress', label: 'In Progress', count: inProgress },
    { key: 'blocked',    label: 'Blocked',     count: blocked },
  ];

  const donePct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <WidgetWrapper
      title="Items by Status"
      subtitle="Status distribution"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      onExpand={handleExpand}
      headerBadges={
        <>
          <Lozenge appearance="default">{String(total)}</Lozenge>
          <WidgetGearButton gadgetType="items" projectKey={projectKey} projectId={projectId} />
        </>
      }
      footer={
        <button
          type="button"
          onClick={() =>
            openUWV({
              project:    projectKey,
              hubSource:  ['projecthub'],
              dataType:   'epics',
              title:      `All items · ${projectKey}`,
              dateFrom:   settings.dateFrom ?? null,
              dateTo:     settings.dateTo ?? null,
            })
          }
          style={{
            background: 'transparent', border: 0, cursor: 'pointer',
            fontSize: 12, color: token('color.link', '#0C66E4'),
            padding: 0, display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          View all ↗
        </button>
      }
    >
      {isLoading ? (
        <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 24,
                borderRadius: 4,
                background: token('color.background.neutral.subtle', '#F1F5F9'),
              }}
            />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState size="compact" header="No items found" description="No tracked items for this project yet." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ── KPI headline strip ─────────────────────────────────────── */}
          <KpiHeadline total={total} donePct={donePct} blocked={blocked} inProgress={inProgress} />

          {/* ── Thick H-bars ────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {buckets.map((b) => (
              <BarRow key={b.key} bucket={b} total={total} />
            ))}
          </div>

          {/* ── Blocked breakdown ──────────────────────────────────────── */}
          {blocked > 0 && <BlockedBreakdown detail={blockedDetail} blocked={blocked} />}
        </div>
      )}
    </WidgetWrapper>
  );
}

// ─── KPI headline ──────────────────────────────────────────────────────────
//
// Three-up summary band: total items, Done %, Blocked count. Reads at
// glance — the headline an exec wants before scanning the bars.

function KpiHeadline({
  total,
  donePct,
  blocked,
  inProgress,
}: {
  total: number;
  donePct: number;
  blocked: number;
  inProgress: number;
}) {
  const cell = (label: string, value: React.ReactNode, accent?: string) => (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '10px 12px',
        borderRight: `1px solid ${token('color.border', '#DFE1E6')}`,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: token('color.text.subtlest', '#626F86'),
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
      {cell('Total', total)}
      {cell('Done', `${donePct}%`, 'var(--ds-text-accent-green-bolder, #216E4E)')}
      {cell('Active', inProgress)}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          padding: '10px 12px',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: token('color.text.subtlest', '#626F86'),
          }}
        >
          Blocked
        </span>
        <span
          style={{
            fontSize: 24,
            fontWeight: 600,
            lineHeight: 1.1,
            color:
              blocked > 0
                ? 'var(--ds-text-accent-red-bolder, #AE2A19)'
                : token('color.text', '#172B4D'),
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {blocked}
        </span>
      </div>
    </div>
  );
}

// ─── Bar row ───────────────────────────────────────────────────────────────
//
// 32px row, 16px-thick bar with rounded ends. Right-aligned count + pct.
// Subtle row hover state. Empty buckets render an em-dash so the eye
// can audit the four canonical categories without counting.

function BarRow({ bucket: b, total }: { bucket: Bucket; total: number }) {
  const ratio = total > 0 ? b.count / total : 0;
  const pct = Math.round(ratio * 100);
  // Minimum visible bar width when count > 0 but ratio is tiny (e.g. 2/408)
  const widthPct = b.count === 0 ? 0 : Math.max(2, ratio * 100);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        height: 36,
        paddingInline: 8,
        marginInline: -8,
        borderRadius: token('border.radius', '4px'),
        transition: 'background 80ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F1F2F4');
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <span
        style={{
          width: 96,
          fontSize: 13,
          fontWeight: 500,
          color: C[b.key].label,
          letterSpacing: '-0.005em',
        }}
      >
        {b.label}
      </span>
      <div
        // Track
        style={{
          flex: 1,
          height: 16,
          borderRadius: 8,
          background: C[b.key].track,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${widthPct}%`,
            background: C[b.key].fill,
            borderRadius: 8,
            transition: 'width 320ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
      <span
        style={{
          minWidth: 48,
          textAlign: 'right',
          fontSize: 14,
          fontWeight: 600,
          color: token('color.text', '#172B4D'),
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {b.count > 0 ? b.count : <span style={{ color: token('color.text.disabled', '#B3B9C4'), fontWeight: 400 }}>—</span>}
      </span>
      <span
        style={{
          minWidth: 40,
          textAlign: 'right',
          fontSize: 12,
          fontWeight: 500,
          color: token('color.text.subtle', '#626F86'),
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {b.count > 0 ? `${pct}%` : ''}
      </span>
    </div>
  );
}

// ─── Blocked breakdown ─────────────────────────────────────────────────────
//
// Subtle red-accent left border + neutral surface so it reads as "look
// here, but don't panic." Numbers right-aligned; label left.

function BlockedBreakdown({
  detail,
  blocked,
}: {
  detail: { onHold: number; awaitingInfo: number; blocked: number };
  blocked: number;
}) {
  const rows = [
    { label: 'Awaiting Info', count: detail.awaitingInfo },
    { label: 'On Hold',       count: detail.onHold },
    { label: 'Blocked',       count: detail.blocked },
  ].filter((r) => r.count > 0);

  return (
    <div
      style={{
        background: token('elevation.surface.sunken', '#F7F8F9'),
        borderInlineStart: `3px solid var(--ds-border-accent-red, #C9372C)`,
        borderRadius: token('border.radius', '4px'),
        padding: '10px 12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--ds-text-accent-red-bolder, #AE2A19)',
          }}
        >
          Blocked breakdown
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: token('color.text', '#172B4D'),
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {blocked} total
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rows.map((r) => (
          <div
            key={r.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 0',
            }}
          >
            <Lozenge appearance="removed">{r.label}</Lozenge>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: token('color.text', '#172B4D'),
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {r.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
