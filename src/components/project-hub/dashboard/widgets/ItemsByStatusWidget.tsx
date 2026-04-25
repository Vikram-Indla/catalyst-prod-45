// @ts-nocheck
/**
 * ItemsByStatusWidget — 4-bucket status distribution with switchable charts.
 *
 * Buckets:  Done · To Do · In Progress · Blocked
 * Charts:   Stacked · H-Bar · V-Bar · Donut (pure CSS + inline SVG, no Chart.js)
 *
 * Status fill colours kept as hex literals — Atlaskit exposes no semantic
 * fill tokens for distribution bars (matches StatusLozenge guardrail).
 * Every other surface uses token().
 */
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import WidgetGearButton from '../WidgetGearButton';
import { useDashboardStatusCounts } from '@/hooks/useDashboardWidgets';
import { useGadgetSettings } from '@/hooks/useGadgetSettings';
import { token } from '@atlaskit/tokens';
import ProgressBar from '@atlaskit/progress-bar';
import { Lozenge, EmptyState } from '@/components/ads';
import { useUWV } from '@/components/universal-work-view/UWVContext';

/**
 * Status fill triple — Apr 25, 2026 palette swap.
 *   Old: To Do gray · In Progress blue · Blocked YELLOW (#FFF0B3) · Done green
 *   New: To Do gray · In Progress blue · Blocked RED (Jira's actual blocked
 *        category color) · Done green.
 *
 * Uses raw `var(--ds-*)` strings instead of `token('color.x')` because this
 * constant evaluates at module-load time (before AdsThemeProvider wraps the
 * tree). Atlaskit's `token()` is only safe inside render trees; at module
 * scope it can throw "token is not defined" when the resolver isn't ready.
 * The CSS variables resolve at paint time, theme-aware via the provider —
 * same end result, zero module-init cost.
 */
const C = {
  todo: {
    fill: 'var(--ds-background-accent-gray-subtler, #DCDFE4)',
    text: 'var(--ds-text, #172B4D)',
  },
  inProgress: {
    fill: 'var(--ds-background-accent-blue-subtler, #CCE0FF)',
    text: 'var(--ds-text-accent-blue, #0055CC)',
  },
  blocked: {
    fill: 'var(--ds-background-accent-red-subtler, #FFD5D2)',
    text: 'var(--ds-text-accent-red, #AE2A19)',
  },
  done: {
    fill: 'var(--ds-background-accent-green-subtler, #BAF3DB)',
    text: 'var(--ds-text-accent-green, #216E4E)',
  },
} as const;

type ChartType = 'stacked' | 'hbar' | 'vbar' | 'donut';

// ─── Chart-toggle SVG icons ────────────────────────────────────────────────
function IconStacked() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <rect x="1" y="2"  width="10" height="2" rx="0.5" />
      <rect x="1" y="5"  width="10" height="2" rx="0.5" />
      <rect x="1" y="8"  width="10" height="2" rx="0.5" />
    </svg>
  );
}
function IconHBar() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="1" y1="3"  x2="10" y2="3" />
      <line x1="1" y1="6"  x2="7"  y2="6" />
      <line x1="1" y1="9"  x2="4"  y2="9" />
    </svg>
  );
}
function IconVBar() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <rect x="1"  y="6" width="2" height="5" />
      <rect x="5"  y="3" width="2" height="8" />
      <rect x="9"  y="1" width="2" height="10" />
    </svg>
  );
}
function IconDonut() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6" cy="6" r="4.5" />
      <circle cx="6" cy="6" r="1.5" />
    </svg>
  );
}

const CHART_OPTIONS: { type: ChartType; label: string; Icon: () => JSX.Element }[] = [
  { type: 'stacked', label: 'Stacked', Icon: IconStacked },
  { type: 'hbar',    label: 'H-Bar',   Icon: IconHBar },
  { type: 'vbar',    label: 'V-Bar',   Icon: IconVBar },
  { type: 'donut',   label: 'Donut',   Icon: IconDonut },
];

export default function ItemsByStatusWidget({
  projectId, projectKey, collapsed, onToggleCollapse,
}: WidgetProps) {
  const { settings, save } = useGadgetSettings('items', projectKey);
  const chartType: ChartType = (settings.gadgetSpecific?.chartType ?? 'stacked') as ChartType;
  const blockedStatuses: string[] =
    settings.gadgetSpecific?.blockedStatuses ??
    ['on hold', 'blocked', 'awaiting info', 'impediment'];

  // Note: statusFilter is intentionally NOT forwarded — this widget *is* the
  // status segmentation. A user-selected status would zero out other buckets.
  // (The Status field is disabled in GadgetSettingsPanel for gadgetType='items'.)
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

  function saveChartType(t: ChartType) {
    save({ ...settings, gadgetSpecific: { ...settings.gadgetSpecific, chartType: t } });
  }

  // Bucket order: done → todo → inProgress → blocked
  const buckets = [
    { key: 'done' as const,       label: 'Done',        count: done },
    { key: 'todo' as const,       label: 'To Do',       count: todo },
    { key: 'inProgress' as const, label: 'In Progress', count: inProgress },
    { key: 'blocked' as const,    label: 'Blocked',     count: blocked },
  ];

  return (
    <WidgetWrapper
      title="Items by Status"
      subtitle="Status distribution"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      span={1}
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
        <div className="animate-pulse">
          <div
            style={{
              height: 28, borderRadius: 3,
              background: token('color.background.neutral.subtle', '#F1F5F9'),
            }}
          />
        </div>
      ) : total === 0 ? (
        <EmptyState size="compact" header="No items found" description="No tracked items for this project yet." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* ── Chart-type toggle ──────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 4 }}>
            {CHART_OPTIONS.map(({ type, label, Icon }) => {
              const active = chartType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => saveChartType(type)}
                  style={{
                    height: 24, padding: '0 8px', fontSize: 11, cursor: 'pointer',
                    borderRadius: 3,
                    border: active
                      ? `1px solid ${token('color.border.selected', '#4C9AFF')}`
                      : `1px solid ${token('color.border', '#DFE1E6')}`,
                    background: active
                      ? token('color.background.selected', '#DEEBFF')
                      : token('color.background.input', '#FAFBFC'),
                    color: active
                      ? token('color.text.selected', '#0052CC')
                      : token('color.text.subtle', '#6B778C'),
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <Icon />
                  {label}
                </button>
              );
            })}
          </div>

          {/* ── Chart body ─────────────────────────────────────────────── */}
          {chartType === 'stacked' && <StackedChart buckets={buckets} total={total} />}
          {chartType === 'hbar'    && <HBarChart    buckets={buckets} total={total} />}
          {chartType === 'vbar'    && <VBarChart    buckets={buckets} />}
          {chartType === 'donut'   && <DonutChart   buckets={buckets} total={total} />}

          {/* ── Blocked breakdown ──────────────────────────────────────── */}
          {blocked > 0 && (
            <div
              style={{
                borderTop: `0.5px solid ${token('color.border', '#DFE1E6')}`,
                marginTop: 12,
                paddingTop: 10,
              }}
            >
              <div
                style={{
                  fontSize: 11, fontWeight: 500,
                  color: token('color.text.danger', '#AE2A19'),
                  marginBottom: 8,
                }}
              >
                Blocked breakdown
              </div>

              {[
                { label: 'On Hold',       count: blockedDetail.onHold },
                { label: 'Awaiting Info', count: blockedDetail.awaitingInfo },
                { label: 'Blocked',       count: blockedDetail.blocked },
              ]
                .filter((r) => r.count > 0)
                .map((r) => (
                  <div
                    key={r.label}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '5px 0',
                      borderBottom: `0.5px solid ${token('color.border', '#F4F5F7')}`,
                    }}
                  >
                    <Lozenge appearance="removed">{r.label}</Lozenge>
                    <span
                      style={{
                        fontSize: 12, fontWeight: 500,
                        color: token('color.text', '#172B4D'),
                      }}
                    >
                      {r.count}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </WidgetWrapper>
  );
}

// ─── Chart subcomponents ───────────────────────────────────────────────────

type Bucket = { key: 'done' | 'todo' | 'inProgress' | 'blocked'; label: string; count: number };

function StackedChart({ buckets, total }: { buckets: Bucket[]; total: number }) {
  return (
    <>
      <div style={{ display: 'flex', height: 28, borderRadius: 3, overflow: 'hidden' }}>
        {buckets.filter((b) => b.count > 0).map((b) => (
          <div
            key={b.key}
            style={{
              width: `${(b.count / total) * 100}%`, minWidth: 28,
              background: C[b.key].fill, color: C[b.key].text,
              fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {b.count}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11 }}>
        {buckets.map((b) => (
          <span key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 8, height: 8, borderRadius: 2, background: C[b.key].fill,
                display: 'inline-block',
              }}
            />
            <span
              style={{
                color: b.key === 'blocked'
                  ? token('color.text.warning', '#974F0C')
                  : token('color.text.subtle', '#6B778C'),
              }}
            >
              {b.label} {b.count}
            </span>
          </span>
        ))}
      </div>
    </>
  );
}

function HBarChart({ buckets, total }: { buckets: Bucket[]; total: number }) {
  const appearance = (k: Bucket['key']): 'success' | 'default' =>
    k === 'done' ? 'success' : 'default';
  return (
    <div>
      {buckets.map((b) => {
        const ratio = total > 0 ? b.count / total : 0;
        return (
          <div
            key={b.key}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
            }}
          >
            <span
              style={{
                width: 76, fontSize: 11, textAlign: 'right',
                color: b.key === 'blocked'
                  ? token('color.text.warning', '#974F0C')
                  : token('color.text.subtle', '#6B778C'),
              }}
            >
              {b.label}
            </span>
            <div style={{ flex: 1, position: 'relative' }}>
              <ProgressBar value={ratio} appearance={appearance(b.key)} />
              {b.key === 'blocked' && (
                <div
                  style={{
                    position: 'absolute', top: 0, left: 0, bottom: 0,
                    width: `${ratio * 100}%`,
                    background: C.blocked.fill,
                    borderRadius: 3,
                    pointerEvents: 'none',
                  }}
                />
              )}
            </div>
            <span
              style={{
                width: 28, fontSize: 11, fontWeight: 500,
                color: token('color.text', '#172B4D'),
                textAlign: 'right',
              }}
            >
              {b.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function VBarChart({ buckets }: { buckets: Bucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-end', gap: 12,
        height: 100, justifyContent: 'center',
      }}
    >
      {buckets.map((b) => (
        <div
          key={b.key}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
        >
          <div
            style={{
              width: 32,
              height: Math.max(4, Math.round((b.count / max) * 80)),
              background: C[b.key].fill,
              borderRadius: '3px 3px 0 0',
            }}
          />
          <span
            style={{ fontSize: 11, fontWeight: 500, color: token('color.text', '#172B4D') }}
          >
            {b.count}
          </span>
          <span
            style={{
              fontSize: 10,
              color: b.key === 'blocked'
                ? token('color.text.warning', '#974F0C')
                : token('color.text.subtle', '#6B778C'),
            }}
          >
            {b.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ buckets, total }: { buckets: Bucket[]; total: number }) {
  const r = 38;
  const circumference = 2 * Math.PI * r; // ≈ 238.76
  let cumulative = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={110} height={110} viewBox="0 0 100 100">
        {buckets.map((b) => {
          if (b.count === 0) return null;
          const dash   = (b.count / total) * circumference;
          const offset = -cumulative;
          cumulative  += dash;
          return (
            <circle
              key={b.key}
              cx={50} cy={50} r={r}
              fill="none"
              stroke={C[b.key].fill}
              strokeWidth={14}
              strokeDasharray={`${dash} ${circumference}`}
              strokeDashoffset={offset}
              transform="rotate(-90 50 50)"
            />
          );
        })}
        <text
          x={50} y={47} textAnchor="middle"
          style={{ fontSize: 18, fontWeight: 600 }}
          fill={token('color.text', '#172B4D')}
        >
          {total}
        </text>
        <text
          x={50} y={57} textAnchor="middle"
          style={{ fontSize: 9 }}
          fill={token('color.text.subtle', '#6B778C')}
        >
          items
        </text>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {buckets.map((b) => (
          <div
            key={b.key}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: C[b.key].fill, display: 'inline-block',
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: b.key === 'blocked'
                  ? token('color.text.warning', '#974F0C')
                  : token('color.text.subtle', '#6B778C'),
              }}
            >
              {b.label}
            </span>
            <span
              style={{
                fontSize: 13, fontWeight: 600,
                color: token('color.text', '#172B4D'),
                marginLeft: 'auto',
              }}
            >
              {b.count}
            </span>
            <span
              style={{ fontSize: 10, color: token('color.text.subtlest', '#97A0AF') }}
            >
              {total > 0 ? `${Math.round((b.count / total) * 100)}%` : '0%'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
