/**
 * StarredHubList — the consolidated, typed render for the Starred hub.
 *
 * Renders every star (not just work items) grouped by category — Surfaces ·
 * Work items · Containers · Knowledge — with one badge per row and no clutter:
 *   - work-item rows carry their STATUS lozenge + mono key (matches the
 *     notifications panel language); the icon already conveys the type, so no
 *     redundant type badge, no timestamp noise.
 *   - surface/container/knowledge rows carry a TYPE badge.
 *
 * Work-item rows use the canonical JiraIssueTypeIcon with the real issue_type
 * (no 'Task' fallback — zero-assumption: unknown type renders no icon, never a
 * lie). Filter chips scope by category; category headers show a count.
 */
import React from 'react';
import {
  Star, Kanban, ListTodo, LayoutDashboard, Filter, Map,
  Folder, Box, FileText, Target, ArrowRightLeft, Flag,
} from '@/lib/atlaskit-icons';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import type { StarredItemType } from '@/hooks/home/useStarredItems';
import type { StarredHubRow, StarCategory } from '@/hooks/home/useStarredHub';

const STAR_GOLD = 'var(--ds-icon-warning, #E2B203)';
const BLUE_BG = 'var(--ds-background-information, #E9F2FE)';
const BLUE_FG = 'var(--ds-icon-information, #1868DB)';
const BLUE_TXT = 'var(--ds-text-information, #0055CC)';
const GREEN_BG = 'var(--ds-background-success, #DCFFF1)';
const GREEN_FG = 'var(--ds-icon-success, #22A06B)';
const GREEN_TXT = 'var(--ds-text-success, #216E4E)';
const ORANGE_BG = 'var(--ds-background-accent-orange-subtler, #FFF3D6)';
const ORANGE_FG = 'var(--ds-icon-accent-orange, #974F0C)';
const ORANGE_TXT = 'var(--ds-text-accent-orange, #5F3811)';
const NEUTRAL_BG = 'var(--ds-background-neutral, #F1F2F4)';
const TEXT = 'var(--ds-text, #172B4D)';
const TEXT_SUBTLE = 'var(--ds-text-subtle, #44546F)';
const TEXT_SUBTLEST = 'var(--ds-text-subtlest, #626F86)';
const TEXT_INVERSE = 'var(--ds-text-inverse, #FFFFFF)';
const BORDER = 'var(--ds-border, #DFE1E6)';
const HOVER = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
const LINK = 'var(--ds-text-information, #0055CC)';
const BODY_FONT = 'var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif';
const MONO_FONT = 'var(--ds-font-family-code, "Atlassian Mono"), ui-monospace, monospace';

const CATEGORY_ORDER: StarCategory[] = ['surface', 'work_item', 'container', 'knowledge'];
const CATEGORY_TITLE: Record<StarCategory, string> = {
  surface: 'Surfaces', work_item: 'Work items', container: 'Containers', knowledge: 'Knowledge',
};
const CATEGORY_PALETTE: Record<Exclude<StarCategory, 'work_item'>, { bg: string; fg: string; txt: string }> = {
  surface: { bg: BLUE_BG, fg: BLUE_FG, txt: BLUE_TXT },
  container: { bg: GREEN_BG, fg: GREEN_FG, txt: GREEN_TXT },
  knowledge: { bg: ORANGE_BG, fg: ORANGE_FG, txt: ORANGE_TXT },
};

const SURFACE_ICON: Partial<Record<StarredItemType, React.ComponentType<{ size?: number }>>> = {
  board: Kanban, backlog: ListTodo, dashboard: LayoutDashboard, filter: Filter, roadmap: Map,
  project: Folder, product: Box,
  document: FileText, theme: Target, objective: Target, dependency: ArrowRightLeft, risk: Flag,
};

const TYPE_LABEL: Record<StarredItemType, string> = {
  epic: 'Epic', feature: 'Feature', story: 'Story', task: 'Task', incident: 'Incident',
  defect: 'QA Bug', ph_issue: 'Work item', business_request: 'Business Request',
  change_request: 'Change Request', production_incident: 'Production Incident',
  business_gap: 'Business Gap', idea: 'Idea',
  project: 'Project', product: 'Product',
  board: 'Board', backlog: 'Backlog', dashboard: 'Dashboard', filter: 'Filter', roadmap: 'Roadmap',
  document: 'Document', theme: 'Theme', objective: 'Objective', dependency: 'Dependency', risk: 'Risk',
};

const ISSUE_TYPE_FOR_ICON: Partial<Record<StarredItemType, string>> = {
  epic: 'Epic', feature: 'Feature', story: 'Story', task: 'Task',
  defect: 'QA Bug', incident: 'Production Incident', production_incident: 'Production Incident',
  business_request: 'Business Request', change_request: 'Change Request',
  business_gap: 'Business Gap', idea: 'Idea',
};

// Status lozenge colour by status_category (Jira parity: todo grey, in-progress
// blue, done green). Unknown category → neutral grey.
function statusLozengeStyle(statusCategory?: string): { bg: string; txt: string } {
  const c = (statusCategory || '').toLowerCase().replace(/\s+/g, '');
  if (c === 'done') return { bg: GREEN_BG, txt: GREEN_TXT };
  if (c === 'inprogress' || c === 'indeterminate') return { bg: BLUE_BG, txt: BLUE_TXT };
  return { bg: NEUTRAL_BG, txt: TEXT_SUBTLE };
}

type FilterKey = 'all' | 'work_item' | 'surface' | 'container';
const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'work_item', label: 'Work' },
  { key: 'surface', label: 'Surfaces' },
  { key: 'container', label: 'Containers' },
];

interface StarredHubListProps {
  rows: StarredHubRow[];
  onOpenRow: (row: StarredHubRow) => void;
  onUnstar: (row: StarredHubRow) => void;
}

function CategoryHeading({ title, count }: { title: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 16px 4px' }}>
      <span style={{ font: `500 11px/16px ${BODY_FONT}`, letterSpacing: 0.3, color: TEXT_SUBTLEST }}>{title}</span>
      <span style={{ font: `400 11px/16px ${BODY_FONT}`, color: TEXT_SUBTLEST }}>{count}</span>
      <span style={{ flex: 1, height: 1, background: BORDER }} />
    </div>
  );
}

function LeadingBadge({ row }: { row: StarredHubRow }) {
  if (row.category === 'work_item') {
    const iconType = row.issueType ?? ISSUE_TYPE_FOR_ICON[row.type];
    return (
      <span style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {iconType ? <JiraIssueTypeIcon type={iconType} size={18} /> : null}
      </span>
    );
  }
  const pal = CATEGORY_PALETTE[row.category];
  const Icon = SURFACE_ICON[row.type];
  return (
    <span style={{ width: 20, height: 20, borderRadius: 4, background: pal.bg, color: pal.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {Icon ? <Icon size={13} /> : null}
    </span>
  );
}

function HubRow({ row, onOpenRow, onUnstar }: { row: StarredHubRow; onOpenRow: (r: StarredHubRow) => void; onUnstar: (r: StarredHubRow) => void }) {
  const [hover, setHover] = React.useState(false);
  const isWork = row.category === 'work_item';
  const pal = isWork ? null : CATEGORY_PALETTE[row.category];
  const status = statusLozengeStyle(row.statusCategory);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenRow(row)}
      onKeyDown={e => { if (e.key === 'Enter') onOpenRow(row); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 16px', cursor: 'pointer', background: hover ? HOVER : 'transparent' }}
    >
      <LeadingBadge row={row} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: TEXT, fontFamily: BODY_FONT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.label}</p>
        {isWork ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 4 }}>
            <span style={{ fontSize: 11, fontFamily: MONO_FONT, color: LINK }}>{row.subtitle}</span>
            {row.status && (
              <span style={{ fontSize: 10, padding: '4px 8px', borderRadius: 3, background: status.bg, color: status.txt, fontFamily: BODY_FONT }}>{row.status}</span>
            )}
          </div>
        ) : (
          // Suppress the subtitle when it just repeats the type badge (e.g.
          // "Board"/"Project") — the badge already carries the type. Show it
          // only when it adds context (project name, result count).
          row.subtitle && row.subtitle !== TYPE_LABEL[row.type] && (
            <p style={{ margin: '4px 0 0', fontSize: 11, color: TEXT_SUBTLEST, fontFamily: BODY_FONT }}>{row.subtitle}</p>
          )
        )}
      </div>
      {!isWork && pal && (
        <span style={{ fontSize: 10, padding: '4px 8px', borderRadius: 3, background: pal.bg, color: pal.txt, fontFamily: BODY_FONT, flexShrink: 0 }}>{TYPE_LABEL[row.type]}</span>
      )}
      <button
        type="button"
        aria-label="Remove from starred"
        onClick={e => { e.stopPropagation(); onUnstar(row); }}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}
      >
        <Star size={15} color={STAR_GOLD} fill={STAR_GOLD} />
      </button>
    </div>
  );
}

export function StarredHubList({ rows, onOpenRow, onUnstar }: StarredHubListProps) {
  const [active, setActive] = React.useState<FilterKey>('all');

  const counts = {
    work_item: rows.filter(r => r.category === 'work_item').length,
    surface: rows.filter(r => r.category === 'surface').length,
    container: rows.filter(r => r.category === 'container').length,
  };
  // A chip only shows when it has rows (All always shows).
  const chips = FILTER_CHIPS.filter(c => c.key === 'all' || counts[c.key as keyof typeof counts] > 0);

  const visible = active === 'all' ? rows : rows.filter(r => r.category === active);
  const grouped = CATEGORY_ORDER
    .map(cat => ({ cat, items: visible.filter(r => r.category === cat) }))
    .filter(g => g.items.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBlockEnd: 8 }}>
      {chips.length > 1 && (
        <div style={{ display: 'flex', gap: 6, padding: '4px 16px 8px', flexWrap: 'wrap' }}>
          {chips.map(c => {
            const on = active === c.key;
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={on}
                onClick={() => setActive(c.key)}
                style={{
                  fontSize: 12, padding: '4px 12px', borderRadius: 14, cursor: 'pointer', fontFamily: BODY_FONT,
                  background: on ? TEXT : 'transparent',
                  color: on ? TEXT_INVERSE : TEXT_SUBTLE,
                  border: on ? '1px solid transparent' : `1px solid ${BORDER}`,
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      )}
      {grouped.map(({ cat, items }) => (
        <div key={cat}>
          <CategoryHeading title={CATEGORY_TITLE[cat]} count={items.length} />
          {items.map(row => (
            <HubRow key={`${row.type}:${row.id}`} row={row} onOpenRow={onOpenRow} onUnstar={onUnstar} />
          ))}
        </div>
      ))}
    </div>
  );
}
