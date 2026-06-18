/**
 * StarredHubList — the consolidated Starred render.
 *
 * Design (2026-06-18 redesign, Vikram):
 *   - Groups use REAL type names (Work items · Boards · Backlogs · Filters ·
 *     Dashboards · Roadmaps · Projects · Products), never invented "Surfaces"/
 *     "Containers" jargon, and never compete with the For You tabs (no chips).
 *   - Work-item rows are ONE line: type icon · title · key · canonical status
 *     chip (JiraForYouLozenge — the exact chip the Assigned tab uses, from
 *     statusPalette.ts). No second line, no redundant type badge.
 *   - Boards/backlogs/etc use the canonical @atlaskit core glyphs; projects/
 *     products use the real ProjectIcon (its own colour + icon). No Lucide
 *     stand-ins, no washed-out type badges.
 *   - Rows are STATIC — flat hover background, no transition, no transform.
 *   - The gold star removes the item (unstar).
 */
import React from 'react';
import { token } from '@atlaskit/tokens';
import StarStarredIcon from '@atlaskit/icon/core/star-starred';
import BoardIcon from '@atlaskit/icon/core/board';
import BacklogIcon from '@atlaskit/icon/core/backlog';
import DashboardIcon from '@atlaskit/icon/core/dashboard';
import FilterIcon from '@atlaskit/icon/core/filter';
import RoadmapIcon from '@atlaskit/icon/core/roadmap';
import PageIcon from '@atlaskit/icon/core/page';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { ProjectIcon } from '@/components/shared/ProjectIcon';
import { JiraForYouLozenge } from './ForYouRow';
import type { StarredItemType } from '@/hooks/home/useStarredItems';
import type { StarredHubRow } from '@/hooks/home/useStarredHub';

const TEXT = 'var(--ds-text, #172B4D)';
const TEXT_SUBTLE = 'var(--ds-text-subtle, #44546F)';
const TEXT_SUBTLEST = 'var(--ds-text-subtlest, #626F86)';
const HOVER = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
const GOLD = 'var(--ds-icon-accent-yellow, #FFAB00)';
const SURFACE_TILE_BG = 'var(--ds-background-neutral, #F1F2F4)';
const SURFACE_TILE_FG = 'var(--ds-icon-subtle, #626F86)';
const BODY_FONT = 'var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif';
const MONO_FONT = 'var(--ds-font-family-code, "Atlassian Mono"), ui-monospace, monospace';

// @atlaskit core glyph per navigable surface type.
const SURFACE_GLYPH: Partial<Record<StarredItemType, React.ComponentType<{ label: string; color?: string }>>> = {
  board: BoardIcon,
  backlog: BacklogIcon,
  dashboard: DashboardIcon,
  filter: FilterIcon,
  roadmap: RoadmapIcon,
  page: PageIcon,
};

// Internal work-item type → locked JiraIssueTypeIcon registry string.
const ISSUE_TYPE_FOR_ICON: Partial<Record<StarredItemType, string>> = {
  epic: 'Epic', feature: 'Feature', story: 'Story', task: 'Task',
  defect: 'QA Bug', incident: 'Production Incident', production_incident: 'Production Incident',
  business_request: 'Business Request', change_request: 'Change Request',
  business_gap: 'Business Gap', idea: 'Idea',
};

// Ordered groups with real, self-explanatory names.
const GROUPS: { title: string; match: (r: StarredHubRow) => boolean }[] = [
  { title: 'Work items', match: r => r.category === 'work_item' },
  { title: 'Boards', match: r => r.type === 'board' },
  { title: 'Backlogs', match: r => r.type === 'backlog' },
  { title: 'Filters', match: r => r.type === 'filter' },
  { title: 'Dashboards', match: r => r.type === 'dashboard' },
  { title: 'Roadmaps', match: r => r.type === 'roadmap' },
  { title: 'Pages', match: r => r.type === 'page' },
  { title: 'Projects', match: r => r.type === 'project' },
  { title: 'Products', match: r => r.type === 'product' },
  { title: 'Documents', match: r => r.type === 'document' },
  { title: 'Themes', match: r => r.type === 'theme' },
  { title: 'Objectives', match: r => r.type === 'objective' },
  { title: 'Dependencies', match: r => r.type === 'dependency' },
  { title: 'Risks', match: r => r.type === 'risk' },
];

interface StarredHubListProps {
  rows: StarredHubRow[];
  onOpenRow: (row: StarredHubRow) => void;
  onUnstar: (row: StarredHubRow) => void;
}

function RowIcon({ row }: { row: StarredHubRow }) {
  if (row.category === 'work_item') {
    const t = row.issueType ?? ISSUE_TYPE_FOR_ICON[row.type];
    return (
      <span style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {t ? <JiraIssueTypeIcon type={t} size={18} /> : null}
      </span>
    );
  }
  if (row.type === 'project' || row.type === 'product') {
    // Real project/product identity — colour + icon from its own data.
    return (
      <span style={{ flexShrink: 0, display: 'inline-flex' }}>
        <ProjectIcon projectKey={row.projectKey} avatarUrl={row.avatarUrl} iconName={row.iconName} color={row.iconColor} name={row.label} size="small" />
      </span>
    );
  }
  const Glyph = SURFACE_GLYPH[row.type];
  return (
    <span style={{ width: 20, height: 20, borderRadius: 4, background: SURFACE_TILE_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {Glyph ? <Glyph label="" color={SURFACE_TILE_FG} /> : null}
    </span>
  );
}

function HubRow({ row, onOpenRow, onUnstar }: { row: StarredHubRow; onOpenRow: (r: StarredHubRow) => void; onUnstar: (r: StarredHubRow) => void }) {
  const [hover, setHover] = React.useState(false);
  const isWork = row.category === 'work_item';
  return (
    <div
      className="starred-hub-row"
      role="button"
      tabIndex={0}
      onClick={() => onOpenRow(row)}
      onKeyDown={e => { if (e.key === 'Enter') onOpenRow(row); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      // Static: instant flat hover, no transition, no transform, fixed height.
      style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, paddingInline: 8, borderRadius: 4, cursor: 'pointer', background: hover ? HOVER : 'transparent' }}
    >
      <RowIcon row={row} />
      <span style={{ fontSize: 13, color: TEXT, fontFamily: BODY_FONT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{row.label}</span>
      {isWork && (
        <>
          <span style={{ fontSize: 12, fontFamily: MONO_FONT, color: TEXT_SUBTLE, flexShrink: 0 }}>{row.subtitle}</span>
          {row.status && <JiraForYouLozenge status={row.status} statusCategory={row.statusCategory} />}
        </>
      )}
      <span style={{ flex: 1 }} />
      <button
        type="button"
        aria-label="Remove from starred"
        onClick={e => { e.stopPropagation(); onUnstar(row); }}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}
      >
        <StarStarredIcon label="" color={GOLD} />
      </button>
    </div>
  );
}

function GroupHeading({ title }: { title: string }) {
  return (
    <div style={{ font: `500 12px/16px ${BODY_FONT}`, color: TEXT_SUBTLEST, paddingInline: 8, paddingBlock: '16px 4px' }}>
      {title}
    </div>
  );
}

export function StarredHubList({ rows, onOpenRow, onUnstar }: StarredHubListProps) {
  const groups = GROUPS
    .map(g => ({ title: g.title, items: rows.filter(g.match) }))
    .filter(g => g.items.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingInline: 8, paddingBlockEnd: 8 }}>
      {/*
        Kill the global [role="button"] press animation (index.css "micro-
        interactions" block: transform: scale(0.97) on :active + transition:
        all 150ms). These rows declare role="button" for a11y but must stay
        STATIC — Jira list rows never bounce or scale on click. !important is
        required: the global :active selector outscores a plain class.
      */}
      <style>{`
        .starred-hub-row, .starred-hub-row:active,
        .starred-hub-row button, .starred-hub-row button:active {
          transform: none !important;
          transition: none !important;
        }
      `}</style>
      {groups.map(({ title, items }) => (
        <div key={title}>
          <GroupHeading title={title} />
          {items.map(row => (
            <HubRow key={`${row.type}:${row.id}`} row={row} onOpenRow={onOpenRow} onUnstar={onUnstar} />
          ))}
        </div>
      ))}
    </div>
  );
}
