// @ts-nocheck
/**
 * ScopeChangeWidget — original vs added-after-start scope per release.
 *
 * Apr 26, 2026 — Enterprise redesign per per-widget design brief.
 *   Mental model: "Did we plan correctly, or did the release inflate?"
 *
 * Changes vs the previous build:
 *   - Bespoke rgba(37,99,235,0.55) / rgba(220,38,38,0.65) bar fills replaced
 *     with Atlaskit canonical bolder tokens (blue / red), routed via the
 *     same palette pattern as Team Workload + Items by Status. Track is
 *     neutral so each segment anchors clearly.
 *   - Bar height 6px → 16px with 8px rounded ends, matching widget rhythm.
 *   - KPI strip is now a sunken band with separators (was three loose
 *     stat cards), matching Items by Status / Overdue / On Hold rhythm.
 *   - Verbose 2-line description removed — the dashboard-level
 *     SectionMessage already explains fiscal scope. Reclaimed vertical
 *     budget for the rows.
 *   - Lozenge no longer clips at "HIGH C…": the row's right cluster has
 *     guaranteed flex-shrink:0 and the release-name column wraps if it
 *     exceeds the available width.
 *   - Tabular-num counts so vertical edges line up across rows.
 *
 * Wiring strictly preserved:
 *   - Pressable row click → openUWV with releaseFilter:[name] for drill-in.
 *   - Header expand for cross-release UWV view.
 *   - WidgetGearButton in headerBadges.
 *   - Sort + maxReleases + thresholds from gadget settings.
 */
import type { WidgetProps } from '../widget-registry';
import WidgetWrapper from '../WidgetWrapper';
import { useDashboardScopeChange } from '@/hooks/useDashboardWidgets';
import { useGadgetSettings } from '@/hooks/useGadgetSettings';
import { token } from '@atlaskit/tokens';
import { useUWV } from '@/components/universal-work-view/UWVContext';
import { EmptyState, Lozenge } from '@/components/ads';
import WidgetGearButton from '../WidgetGearButton';

// Atlaskit canonical bolder palette — matches Team Workload + Items by Status.
const SCOPE_ORIG = 'var(--ds-background-accent-blue-bolder, #0C66E4)';
const SCOPE_ADDED = 'var(--ds-background-accent-red-bolder, #C9372C)';

/** YYYY-MM-DD → "DD Mon YY" without timezone surprises. */
function formatEndDate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d).padStart(2, '0')} ${monthNames[m - 1]} ${String(y).slice(2)}`;
}

export default function ScopeChangeWidget({
  projectId, projectKey, collapsed, onToggleCollapse,
}: WidgetProps) {
  const { settings } = useGadgetSettings('scope', projectKey);
  const { openUWV } = useUWV();

  const handleExpand = () => openUWV({
    project: projectKey,
    hubSource: ['projecthub', 'releasehub'],
    dataType: 'all',
    title: `Scope Change · ${projectKey}`,
    scope: 'all',
    dateFrom: settings.dateFrom ?? null,
    dateTo: settings.dateTo ?? null,
    dateLabel: settings.dateLabel,
    assigneeFilter: settings.assigneeFilter,
    itemTypeFilter: settings.itemTypeFilter,
    priorityFilter: settings.priorityFilter,
    releaseFilter: settings.releaseFilter,
  });

  // Resolve config (with defaults from spec)
  const maxReleases    = settings.gadgetSpecific?.maxReleases     ?? 8;
  const thresholdHigh  = settings.gadgetSpecific?.thresholdHigh   ?? 80;
  const thresholdMod   = settings.gadgetSpecific?.thresholdModerate ?? 30;
  const showOnlyActive = settings.gadgetSpecific?.showOnlyActive  ?? true;

  const { data: scopes = [], isLoading } = useDashboardScopeChange(projectId, {
    dateFrom: settings.dateFrom,
    dateTo:   settings.dateTo,
    statusFilter:   settings.statusFilter,
    releaseFilter:  settings.releaseFilter,
    assigneeFilter: settings.assigneeFilter,
    itemTypeFilter: settings.itemTypeFilter,
    priorityFilter: settings.priorityFilter,
    showOnlyActive,
  });

  // Sort: highest creep first so the worst offender lands at row 1.
  // (Was ascending; flipped per exec scan order: bad news first.)
  const sorted = [...scopes]
    .sort((a, b) => b.deltaPercent - a.deltaPercent)
    .slice(0, maxReleases);

  const releasesShown    = sorted.length;
  const highCreepCount   = sorted.filter((s) => s.deltaPercent > thresholdHigh).length;
  const plannedCorrectly = sorted.filter((s) => s.deltaPercent === 0).length;

  const handleReleaseClick = (s: typeof sorted[number]) => {
    openUWV({
      project: projectKey,
      hubSource: ['releasehub', 'projecthub'],
      title: `Scope change — ${s.releaseName} · ${formatEndDate(s.endDate)}`,
      scope: 'all',
      dateFrom: settings.dateFrom ?? null,
      dateTo: settings.dateTo ?? null,
      dateLabel: settings.dateLabel,
      releaseFilter: [s.releaseName],
      statusFilter: settings.statusFilter,
      assigneeFilter: settings.assigneeFilter,
      itemTypeFilter: settings.itemTypeFilter,
      priorityFilter: settings.priorityFilter,
    });
  };

  return (
    <WidgetWrapper
      title="Scope Change"
      subtitle="Items added after release start"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      onExpand={handleExpand}
      headerBadges={
        <WidgetGearButton gadgetType="scope" projectKey={projectKey} projectId={projectId} />
      }
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
      ) : sorted.length === 0 ? (
        <EmptyState
          size="compact"
          header="No releases match"
          description="No releases match the current filters."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ── KPI headline strip ─────────────────────────────────────── */}
          <KpiHeadline
            releasesShown={releasesShown}
            highCreep={highCreepCount}
            plannedCorrectly={plannedCorrectly}
            thresholdHigh={thresholdHigh}
          />

          {/* ── Release rows ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sorted.map((s) => (
              <ReleaseRow
                key={s.releaseId}
                release={s}
                thresholdHigh={thresholdHigh}
                thresholdMod={thresholdMod}
                onClick={() => handleReleaseClick(s)}
              />
            ))}
          </div>
        </div>
      )}
    </WidgetWrapper>
  );
}

// ─── KPI headline ──────────────────────────────────────────────────────────

function KpiHeadline({
  releasesShown,
  highCreep,
  plannedCorrectly,
  thresholdHigh,
}: {
  releasesShown: number;
  highCreep: number;
  plannedCorrectly: number;
  thresholdHigh: number;
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
      <KpiCell label="Releases" value={releasesShown} />
      <KpiCell
        label={`Added >${thresholdHigh}%`}
        value={highCreep}
        accent={highCreep > 0 ? 'var(--ds-text-accent-red-bolder, #AE2A19)' : undefined}
      />
      <KpiCell
        label="Planned correctly"
        value={plannedCorrectly}
        accent={
          plannedCorrectly > 0 ? 'var(--ds-text-accent-green-bolder, #216E4E)' : undefined
        }
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
        padding: '10px 12px',
        borderRight: last ? 'none' : `1px solid ${token('color.border', '#DFE1E6')}`,
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
}

// ─── Release row ───────────────────────────────────────────────────────────

function ReleaseRow({
  release: s,
  thresholdHigh,
  thresholdMod,
  onClick,
}: {
  release: any;
  thresholdHigh: number;
  thresholdMod: number;
  onClick: () => void;
}) {
  const total = s.originalCount + s.addedCount;
  const origPct = total === 0 ? 0 : (s.originalCount / total) * 100;
  const addedPct = total === 0 ? 0 : (s.addedCount / total) * 100;

  let lozengeAppearance: 'success' | 'moved' | 'removed';
  let lozengeLabel: string;
  if (s.deltaPercent === 0) {
    lozengeAppearance = 'success';
    lozengeLabel = 'No creep';
  } else if (s.deltaPercent > thresholdHigh) {
    lozengeAppearance = 'removed';
    lozengeLabel = 'High creep';
  } else if (s.deltaPercent > thresholdMod) {
    lozengeAppearance = 'moved';
    lozengeLabel = 'Moderate creep';
  } else {
    lozengeAppearance = 'moved';
    lozengeLabel = 'Some creep';
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          (e.currentTarget as HTMLDivElement).click();
        }
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = token(
          'color.background.neutral.subtle.hovered',
          '#F1F2F4',
        );
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '10px 8px',
        marginInline: -8,
        borderRadius: token('border.radius', '4px'),
        cursor: 'pointer',
        transition: 'background 80ms ease',
      }}
    >
      {/* Top line: release name (left, may wrap) + counts + lozenge (right) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: token('color.text', '#172B4D'),
            minWidth: 0,
            // Allow wrapping for very long release names so the right
            // cluster never gets pushed off the row. Two-line cap to keep
            // row height predictable.
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word',
            letterSpacing: '-0.005em',
            lineHeight: '18px',
          }}
        >
          {s.releaseName}{' '}
          <span style={{ color: token('color.text.subtle', '#626F86'), fontWeight: 500 }}>
            · {formatEndDate(s.endDate)}
          </span>
        </span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: token('color.text.subtle', '#44546F'),
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontWeight: 600, color: token('color.text', '#172B4D') }}>
              {s.originalCount}
            </span>{' '}
            original ·{' '}
            <span style={{ fontWeight: 600, color: token('color.text', '#172B4D') }}>
              {s.addedCount}
            </span>{' '}
            added
          </span>
          <Lozenge appearance={lozengeAppearance}>{lozengeLabel}</Lozenge>
        </div>
      </div>

      {/* Bottom line: stacked bar + delta percent label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            flex: 1,
            height: 14,
            borderRadius: 7,
            background: token('color.background.neutral', '#F1F2F4'),
            overflow: 'hidden',
            display: 'flex',
          }}
        >
          {origPct > 0 && (
            <div
              style={{
                width: `${origPct}%`,
                background: SCOPE_ORIG,
                transition: 'width 320ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              aria-label={`${s.originalCount} original`}
            />
          )}
          {addedPct > 0 && (
            <div
              style={{
                width: `${addedPct}%`,
                background: SCOPE_ADDED,
                transition: 'width 320ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              aria-label={`${s.addedCount} added after start`}
            />
          )}
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            minWidth: 64,
            textAlign: 'right',
            color:
              s.deltaPercent > thresholdHigh
                ? 'var(--ds-text-accent-red-bolder, #AE2A19)'
                : s.deltaPercent > 0
                  ? token('color.text.subtle', '#44546F')
                  : 'var(--ds-text-accent-green-bolder, #216E4E)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {s.deltaPercent > 0 ? `+${s.deltaPercent}%` : '0%'}
        </span>
      </div>
    </div>
  );
}
