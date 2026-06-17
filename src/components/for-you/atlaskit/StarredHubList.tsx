/**
 * StarredHubList — the grouped, typed render for the Starred hub.
 *
 * Renders every star (not just work items) grouped by category — Surfaces ·
 * Work items · Containers · Knowledge — each row carrying a typed badge so a
 * starred filter reads differently from a starred board at a glance. This is
 * the renderer the For You Starred tab was missing (it previously rendered
 * only WorkItem rows via ForYouRow, so board/project/filter stars vanished).
 *
 * Work-item rows use the canonical JiraIssueTypeIcon (no 'Task' fallback —
 * zero-assumption: when issue_type is unknown we render no icon, never a lie).
 * Surface/container/knowledge rows use a category-icon tile.
 */
import React from 'react';
import {
  Star, Kanban, ListTodo, LayoutDashboard, Filter, Map,
  Folder, Box, FileText, Target, ArrowRightLeft, Flag,
} from '@/lib/atlaskit-icons';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { formatRelativeTime } from '@/components/project-hub/project-list-utils';
import type { StarredItemType } from '@/hooks/home/useStarredItems';
import type { StarredHubRow, StarCategory } from '@/hooks/home/useStarredHub';

const STAR_GOLD = 'var(--ds-icon-warning, #E2B203)';
const BLUE_BG = 'var(--ds-background-information, #E9F2FE)';
const BLUE_FG = 'var(--ds-icon-information, #1868DB)';
const BLUE_TXT = 'var(--ds-text-information, #0055CC)';
const GREEN_BG = 'var(--ds-background-accent-green-subtler, #DCFFF1)';
const GREEN_FG = 'var(--ds-icon-accent-green, #216E4E)';
const GREEN_TXT = 'var(--ds-text-accent-green, #164B35)';
const ORANGE_BG = 'var(--ds-background-accent-orange-subtler, #FFF3D6)';
const ORANGE_FG = 'var(--ds-icon-accent-orange, #974F0C)';
const ORANGE_TXT = 'var(--ds-text-accent-orange, #5F3811)';
const TEXT = 'var(--ds-text, #172B4D)';
const TEXT_SUBTLE = 'var(--ds-text-subtle, #44546F)';
const TEXT_SUBTLEST = 'var(--ds-text-subtlest, #626F86)';
const HOVER = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
const BODY_FONT = 'var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif';

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

// Map our internal work-item type strings to the locked JiraIssueTypeIcon registry.
const ISSUE_TYPE_FOR_ICON: Partial<Record<StarredItemType, string>> = {
  epic: 'Epic', feature: 'Feature', story: 'Story', task: 'Task',
  defect: 'QA Bug', incident: 'Production Incident', production_incident: 'Production Incident',
  business_request: 'Business Request', change_request: 'Change Request',
  business_gap: 'Business Gap', idea: 'Idea',
};

interface StarredHubListProps {
  rows: StarredHubRow[];
  onOpenRow: (row: StarredHubRow) => void;
  onUnstar: (row: StarredHubRow) => void;
}

function CategoryHeading({ title }: { title: string }) {
  return (
    <div style={{ font: `500 12px/16px ${BODY_FONT}`, color: TEXT_SUBTLEST, padding: '16px 16px 8px' }}>
      {title}
    </div>
  );
}

function LeadingBadge({ row }: { row: StarredHubRow }) {
  if (row.category === 'work_item') {
    // Prefer the live issue_type; else the type-derived icon string; else no icon.
    const iconType = row.issueType ?? ISSUE_TYPE_FOR_ICON[row.type];
    return (
      <span style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {iconType ? <JiraIssueTypeIcon type={iconType} size={20} /> : null}
      </span>
    );
  }
  const pal = CATEGORY_PALETTE[row.category];
  const Icon = SURFACE_ICON[row.type];
  return (
    <span style={{ width: 28, height: 28, borderRadius: 6, background: pal.bg, color: pal.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {Icon ? <Icon size={16} /> : null}
    </span>
  );
}

function HubRow({ row, onOpenRow, onUnstar }: { row: StarredHubRow; onOpenRow: (r: StarredHubRow) => void; onUnstar: (r: StarredHubRow) => void }) {
  const [hover, setHover] = React.useState(false);
  const pal = row.category === 'work_item' ? null : CATEGORY_PALETTE[row.category];
  const badgeBg = pal?.bg ?? 'var(--ds-background-neutral, #F1F2F4)';
  const badgeTxt = pal?.txt ?? TEXT_SUBTLE;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenRow(row)}
      onKeyDown={e => { if (e.key === 'Enter') onOpenRow(row); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', cursor: 'pointer', background: hover ? HOVER : 'transparent' }}
    >
      <LeadingBadge row={row} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: TEXT, fontFamily: BODY_FONT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.label}</p>
        {row.subtitle && <p style={{ margin: 0, fontSize: 12, color: TEXT_SUBTLEST, fontFamily: BODY_FONT }}>{row.subtitle}</p>}
      </div>
      <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, background: badgeBg, color: badgeTxt, fontFamily: BODY_FONT, flexShrink: 0 }}>{TYPE_LABEL[row.type]}</span>
      <span style={{ fontSize: 12, color: TEXT_SUBTLEST, fontFamily: BODY_FONT, width: 72, textAlign: 'right', flexShrink: 0 }}>{formatRelativeTime(row.starredAt)}</span>
      <button
        type="button"
        aria-label="Remove from starred"
        onClick={e => { e.stopPropagation(); onUnstar(row); }}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}
      >
        <Star size={16} color={STAR_GOLD} fill={STAR_GOLD} />
      </button>
    </div>
  );
}

export function StarredHubList({ rows, onOpenRow, onUnstar }: StarredHubListProps) {
  const grouped = CATEGORY_ORDER
    .map(cat => ({ cat, items: rows.filter(r => r.category === cat) }))
    .filter(g => g.items.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBlockEnd: 8 }}>
      {grouped.map(({ cat, items }) => (
        <div key={cat}>
          <CategoryHeading title={CATEGORY_TITLE[cat]} />
          {items.map(row => (
            <HubRow key={`${row.type}:${row.id}`} row={row} onOpenRow={onOpenRow} onUnstar={onUnstar} />
          ))}
        </div>
      ))}
    </div>
  );
}
