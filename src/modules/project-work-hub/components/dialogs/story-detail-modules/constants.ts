/**
 * StoryDetailModal — Constants
 * Extracted from StoryDetailModal.tsx for modularity
 */
import React from 'react';
import type { ColumnConfig, StatusCategory, TestResult, AIImproveType, PriorityLevel } from './types';

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
  todo:        { bg: '#DFE1E6', text: '#253858' },
  in_progress: { bg: '#DEEBFF', text: '#0747A6' },
  done:        { bg: '#E3FCEF', text: '#006644' },
  blocked:     { bg: '#FFEBE6', text: '#BF2600' },
  on_hold:     { bg: '#FFF0B3', text: '#974F0C' },
  in_uat:      { bg: '#DEEBFF', text: '#0747A6' }, // was #00B8D9 cyan — now Atlaskit inprogress-blue
  in_beta:     { bg: '#DEEBFF', text: '#0747A6' },
  in_prod:     { bg: '#E3FCEF', text: '#006644' },
  in_review:   { bg: '#DEEBFF', text: '#0747A6' },
};

export const LOZENGE_STYLES: Record<'grey' | 'blue' | 'green', React.CSSProperties> = {
  grey:  { background: '#DFE1E6', color: '#253858' },
  blue:  { background: '#DEEBFF', color: '#0747A6' },
  green: { background: '#E3FCEF', color: '#006644' },
};

export const LOZENGE: Record<StatusCategory, React.CSSProperties> = {
  todo:        { background: '#DFE1E6', color: '#253858' },
  in_progress: { background: '#DEEBFF', color: '#0747A6' },
  done:        { background: '#E3FCEF', color: '#006644' },
};

export const PRIORITY_COLORS: Record<string, string> = {
  Highest: '#FF5630', High: '#FF5630', Medium: '#FFAB00', Low: '#36B37E', Lowest: '#8993A4',
};

export const PRIORITY_STYLES: Record<string, { color: string; symbol: string }> = {
  Highest: { color: '#AE2A19', symbol: '▲▲' },
  High: { color: '#DE350B', symbol: '▲' },
  Medium: { color: '#D97706', symbol: '—' },
  Low: { color: '#36B37E', symbol: '▼' },
  Lowest: { color: '#6B778C', symbol: '▼▼' },
};

export const PRIORITY_ICONS: Record<string, string> = {
  Highest: '⬆⬆', High: '⬆', Medium: '→', Low: '⬇', Lowest: '⬇⬇',
};

export const PRIORITY_LIST: PriorityLevel[] = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

export const TEST_RESULT_STYLES: Record<TestResult, React.CSSProperties> = {
  passed:  { background: '#E3FCEF', color: '#006644' },
  failed:  { background: '#FFEDEB', color: '#BF2600' },
  blocked: { background: '#FFF0B3', color: '#974F0C' },
  skipped: { background: '#DFE1E6', color: '#253858' },
  not_run: { background: '#F1F5F9', color: '#6B778C' },
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
  blocks:           { background: '#FFEDEB', color: '#BF2600' },
  'is blocked by':  { background: '#FFEDEB', color: '#BF2600' },
  'relates to':     { background: '#FFF0B3', color: '#974F0C' },
  relates_to:       { background: '#FFF0B3', color: '#974F0C' },
  duplicates:       { background: '#FFEDEB', color: '#BF2600' },
  'is duplicated by': { background: '#F1F5F9', color: '#6B778C' },
  clones:           { background: '#EFF6FF', color: '#1D4ED8' },
  'is cloned by':   { background: '#EFF6FF', color: '#1D4ED8' },
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
  { groupLabel: 'TO DO', category: 'todo', statuses: STATUS_CATEGORIES.todo },
  { groupLabel: 'IN PROGRESS', category: 'in_progress', statuses: STATUS_CATEGORIES.in_progress },
  { groupLabel: 'DONE', category: 'done', statuses: STATUS_CATEGORIES.done },
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

export const AI_IMPROVE_OPTIONS: { value: AIImproveType; label: string }[] = [
  { value: 'improve_clarify', label: 'Improve & Clarify' },
  { value: 'expand_detail', label: 'Expand & Detail' },
  { value: 'add_acceptance_criteria', label: 'Add Acceptance Criteria' },
  { value: 'convert_user_story', label: 'Convert to User Story format' },
  { value: 'shorten_focus', label: 'Shorten & Focus' },
  { value: 'add_edge_cases', label: 'Add Edge Cases' },
];

export const menuItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '7px 14px',
  background: 'none', border: 'none', fontSize: 13, color: '#344054', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
  textAlign: 'left',
};

export const detailLabelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 650, color: '#475467', padding: '8px 0', textTransform: 'uppercase', letterSpacing: '0.04em',
};

export const detailValueStyle: React.CSSProperties = {
  fontSize: 13, color: '#101828', padding: '6px 0',
};
