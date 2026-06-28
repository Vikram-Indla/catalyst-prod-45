/**
 * StoryDetailModal — Constants
 * Extracted from StoryDetailModal.tsx for modularity
 */
import React from 'react';
import type { ColumnConfig, StatusCategory, TestResult, PriorityLevel } from './types';

export const DEFAULT_COLUMNS: ColumnConfig = {
  status: true, assignee: true, priority: true, created: false, updated: true,
};

export const STATUS_CATEGORIES: Record<string, string[]> = {
  todo: ['Backlog', 'To Do', 'In Requirements', 'In Design', 'Ready for Development', 'Technical Validation'],
  in_progress: ['In Development', 'In Progress', 'In Review', 'In QA', 'In Entity Integration', 'In UAT', 'In BETA', 'End to End Testing', 'On Hold', 'Analysis', 'Blocked', 'Awaiting Info'],
  done: ['Production Ready', 'Beta Ready', 'In Production', 'Done', 'Closed'],
};

/**
 * §20 / L41 — DEPRECATED render-time lookup.
 *
 * This map is orphaned from all render paths on the Jira-clone surface;
 * status pills now route through `statusToLozenge()` → Atlaskit Lozenge
 * (see `src/modules/project-work-hub/utils/statusToLozenge.ts`). The table
 * is kept only so `getStatusStyle()` in `./helpers.ts` — referenced by a
 * handful of non-Jira-clone callers — still type-checks. All values have
 * been realigned to Atlaskit's palette so even if a rogue consumer reads
 * `in_uat` it renders the canonical blue, not cyan.
 */
export const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  todo:        { bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', text: 'var(--ds-text)' },
  in_progress: { bg: 'var(--ds-background-information)', text: 'var(--ds-link-pressed)' },
  done:        { bg: 'var(--ds-background-success)', text: 'var(--ds-text-success)' },
  blocked:     { bg: 'var(--ds-background-danger)', text: 'var(--ds-text-danger)' },
  on_hold:     { bg: 'var(--ds-background-warning)', text: 'var(--ds-text-warning)' },
  in_uat:      { bg: 'var(--ds-background-information)', text: 'var(--ds-link-pressed)' }, // was #00B8D9 cyan — now Atlaskit inprogress-blue
  in_beta:     { bg: 'var(--ds-background-information)', text: 'var(--ds-link-pressed)' },
  in_prod:     { bg: 'var(--ds-background-success)', text: 'var(--ds-text-success)' },
  in_review:   { bg: 'var(--ds-background-information)', text: 'var(--ds-link-pressed)' },
};

export const LOZENGE_STYLES: Record<'grey' | 'blue' | 'green', React.CSSProperties> = {
  grey:  { background: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', color: 'var(--ds-text)' },
  blue:  { background: 'var(--ds-background-information)', color: 'var(--ds-link-pressed)' },
  green: { background: 'var(--ds-background-success)', color: 'var(--ds-text-success)' },
};

export const LOZENGE: Record<StatusCategory, React.CSSProperties> = {
  todo:        { background: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', color: 'var(--ds-text)' },
  in_progress: { background: 'var(--ds-background-information)', color: 'var(--ds-link-pressed)' },
  done:        { background: 'var(--ds-background-success)', color: 'var(--ds-text-success)' },
};

export const PRIORITY_COLORS: Record<string, string> = {
  Highest: 'var(--ds-icon-danger)', High: 'var(--ds-icon-danger)', Medium: 'var(--ds-icon-warning)', Low: 'var(--ds-background-success-bold)', Lowest: 'var(--ds-background-neutral-bold)',
};

export const PRIORITY_STYLES: Record<string, { color: string; symbol: string }> = {
  Highest: { color: 'var(--ds-text-danger)', symbol: '▲▲' },
  High: { color: 'var(--ds-text-danger)', symbol: '▲' },
  Medium: { color: 'var(--ds-text-warning, var(--cp-warning))', symbol: '—' },
  Low: { color: 'var(--ds-background-success-bold)', symbol: '▼' },
  Lowest: { color: 'var(--ds-text-subtlest, var(--cp-text-secondary))', symbol: '▼▼' },
};

export const PRIORITY_ICONS: Record<string, string> = {
  Highest: '⬆⬆', High: '⬆', Medium: '→', Low: '⬇', Lowest: '⬇⬇',
};

export const PRIORITY_LIST: PriorityLevel[] = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

export const TEST_RESULT_STYLES: Record<TestResult, React.CSSProperties> = {
  passed:  { background: 'var(--ds-background-success)', color: 'var(--ds-text-success)' },
  failed:  { background: 'var(--ds-background-danger)', color: 'var(--ds-text-danger)' },
  blocked: { background: 'var(--ds-background-warning)', color: 'var(--ds-text-warning)' },
  skipped: { background: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', color: 'var(--ds-text)' },
  not_run: { background: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', color: 'var(--ds-text-subtlest, var(--cp-text-secondary))' },
};

export const LINK_TYPE_LABELS: Record<string, string> = {
  relates_to: 'Relates to', blocks: 'Blocks', is_blocked_by: 'Is blocked by',
  duplicates: 'Duplicates', is_duplicated_by: 'Is duplicated by',
  implements: 'Implements', is_implemented_by: 'Is implemented by',
  clones: 'Clones', is_cloned_by: 'Is cloned by',
  'relates to': 'Relates to', 'is blocked by': 'Is blocked by',
  'is duplicated by': 'Is duplicated by', 'is cloned by': 'Is cloned by',
};

export const LINK_TYPE_STYLES: Record<string, React.CSSProperties> = {
  blocks:           { background: 'var(--ds-background-danger)', color: 'var(--ds-text-danger)' },
  'is blocked by':  { background: 'var(--ds-background-danger)', color: 'var(--ds-text-danger)' },
  'relates to':     { background: 'var(--ds-background-warning)', color: 'var(--ds-text-warning)' },
  relates_to:       { background: 'var(--ds-background-warning)', color: 'var(--ds-text-warning)' },
  duplicates:       { background: 'var(--ds-background-danger)', color: 'var(--ds-text-danger)' },
  'is duplicated by': { background: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', color: 'var(--ds-text-subtlest, var(--cp-text-secondary))' },
  clones:           { background: 'var(--ds-background-selected)', color: 'var(--ds-background-brand-bold-hovered)' },
  'is cloned by':   { background: 'var(--ds-background-selected)', color: 'var(--ds-background-brand-bold-hovered)' },
};

export const LINK_TYPE_OPTIONS = [
  'is blocked by', 'blocks',
  'is BRD of', 'BRD',
  'is cloned by', 'clones',
  'is duplicated by', 'duplicates',
  'is implemented by', 'implements',
  'relates to',
];

export const STATUS_OPTION_GROUPS = [
  { groupLabel: 'To do', category: 'todo', statuses: STATUS_CATEGORIES.todo },
  { groupLabel: 'In progress', category: 'in_progress', statuses: STATUS_CATEGORIES.in_progress },
  { groupLabel: 'Done', category: 'done', statuses: STATUS_CATEGORIES.done },
];

const jiraIconImg = (file: string, label: string) =>
  `<img src="/admin/icons/jira/${file}-16.svg" width="16" height="16" alt="${label}" title="${label}" draggable="false" style="display:block;width:16px;height:16px;flex-shrink:0" />`;

/**
 * §21 / ICON-GUARDRAIL — File/label mapping for work-item-type icons rendered
 * through raw HTML (innerHTML contexts that can't accept a React component).
 *
 * The file names here MUST correspond to SVGs in `/public/admin/icons/jira/`.
 * The canonical React resolver is `src/lib/jira-issue-type-icons.tsx`; this
 * table is a parallel lookup only for the HTML-string renderers (e.g. table
 * cells that call .innerHTML, ADF export paths). If you add a type here, add
 * it in the canonical resolver too, or surfaces will drift.
 *
 * 2026-04-20 fix: "Business Request" used to alias to the Story SVG (green
 * bookmark). It now uses its OWN `business-request` SVG — the amber
 * (#FFAB00) lightbulb per Jira canonical. "Business Gap" was likewise
 * de-aliased from Incident (the canonical glyph is red lightning, distinct
 * from the incident beacon).
 */
const WORK_ITEM_ICON_ALIASES: Array<[string, string, string[]]> = [
  ['task', 'Task', ['task', 'Task']],
  ['subtask', 'Sub-task', ['sub-task', 'subtask', 'Sub-task', 'Subtask']],
  ['new-feature', 'Feature', ['feature', 'Feature', 'new feature', 'New Feature']],
  ['story', 'Story', ['story', 'Story']],
  ['business-request', 'Business Request', ['business request', 'Business Request', 'business-request', 'BusinessRequest']],
  ['bug', 'Bug', ['bug', 'Bug', 'qa bug', 'QA Bug', 'defect', 'Defect']],
  ['incident', 'Production Incident', ['incident', 'Incident', 'production incident', 'Production Incident']],
  ['incident', 'Business Gap', ['business gap', 'Business Gap']],
  ['epic', 'Epic', ['epic', 'Epic']],
  ['improvement', 'Improvement', ['improvement', 'Improvement']],
  ['question', 'Question', ['question', 'Question']],
  ['issue', 'Issue', ['issue', 'Issue']],
  ['problem', 'Problem', ['problem', 'Problem']],
  ['changes', 'Change Request', ['changes', 'Changes', 'change request', 'Change Request']],
  ['task', 'API Requirement', ['api requirement', 'API Requirement']],
  ['subtask', 'Backend', ['backend', 'Backend']],
  ['subtask', 'Frontend', ['frontend', 'Frontend']],
  ['subtask', 'Figma', ['figma', 'Figma', 'entity figma', 'Entity FIGMA']],
  ['subtask', 'Integration', ['integration', 'Integration']],
];

export const WORK_ITEM_ICONS: Record<string, string> = Object.fromEntries(
  WORK_ITEM_ICON_ALIASES.flatMap(([file, label, aliases]) => aliases.map((alias) => [alias, jiraIconImg(file, label)]))
) as Record<string, string>;

// Note: `AI_IMPROVE_OPTIONS` was removed 2026-04-28 along with the legacy
// AI Improve inline panel. The canonical Improve dropdown is in
// `src/components/catalyst-detail-views/improve/` and defines its own
// menu items per issue type.

export const menuItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4, width: '100%', padding: '8px 14px',
  background: 'none', border: 'none', fontSize: 13, color: 'var(--ds-text-subtle)', cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
  textAlign: 'left',
};

export const detailLabelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 650, color: 'var(--ds-text-subtle)', padding: '8px 0', textTransform: 'uppercase', letterSpacing: '0.04em',
};

export const detailValueStyle: React.CSSProperties = {
  fontSize: 13, color: 'var(--ds-text)', padding: '4px 0',
};
