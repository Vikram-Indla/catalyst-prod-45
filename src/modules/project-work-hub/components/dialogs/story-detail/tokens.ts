/**
 * StoryDetailModal — V12 Design Tokens & Constants
 * Shared tokens, option lists, and field labels used across sub-components.
 */

/* ═══════════════════════════════════════════════
   V12 DESIGN TOKENS
   ═══════════════════════════════════════════════ */
export const V = {
  overlay: 'rgba(0,0,0,0.5)',
  white: '#FFFFFF',
  headerBg: '#F4F5F7',
  border: '#E2E8F0',
  borderSubtle: '#DFE1E6',
  insetBg: '#F1F5F9',
  surfaceBg: '#F8FAFC',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textDisabled: '#CBD5E1',
  linkBlue: '#0052CC',
  primaryBlue: '#2563EB',
  primaryBlueHover: '#1D4ED8',
  successGreen: '#16A34A',
  dangerRed: '#DE350B',
  hoverRow: 'rgba(0,0,0,0.04)',
  pressRow: 'rgba(0,0,0,0.08)',
  selectedRow: 'rgba(37,99,235,0.08)',
  lozengeGreyBg: '#DFE1E6', lozengeGreyText: '#253858',
  lozengeBlueBg: '#DEEBFF', lozengeBlueText: '#0747A6',
  lozengeGreenBg: '#E3FCEF', lozengeGreenText: '#006644',
  statusBorder: 'rgba(9, 30, 66, 0.29)',
};

export const STATUS_OPTION_GROUPS = [
  { groupLabel: 'TO DO', category: 'todo', statuses: ['Backlog', 'In Requirements', 'In Design', 'Ready for Development', 'Technical Validation', 'To Do'] },
  { groupLabel: 'IN PROGRESS', category: 'in_progress', statuses: ['In Development', 'On Hold', 'In QA', 'In Entity Integration', 'In UAT', 'In BETA', 'End to End Testing', 'In Progress', 'In Review'] },
  { groupLabel: 'DONE', category: 'done', statuses: ['Production Ready', 'Beta Ready', 'In Production', 'Done', 'Closed'] },
];

export const STATUS_OPTIONS = STATUS_OPTION_GROUPS.flatMap(g => g.statuses.map(s => ({ label: s, category: g.category })));

export const PRIORITY_OPTIONS = [
  { label: 'Highest', value: 'Highest' },
  { label: 'High', value: 'High' },
  { label: 'Medium', value: 'Medium' },
  { label: 'Low', value: 'Low' },
  { label: 'Lowest', value: 'Lowest' },
];

export const LINK_TYPES = [
  { value: 'blocks', label: 'blocks' },
  { value: 'is_blocked_by', label: 'is blocked by' },
  { value: 'relates_to', label: 'relates to' },
  { value: 'duplicates', label: 'duplicates' },
  { value: 'is_duplicated_by', label: 'is duplicated by' },
  { value: 'is_implemented_by', label: 'is implemented by' },
  { value: 'implements', label: 'implements' },
  { value: 'clones', label: 'clones' },
  { value: 'is_cloned_by', label: 'is cloned by' },
];

export const FIELD_LABELS: Record<string, string> = {
  IssueParentAssociation: 'Parent', summary: 'Summary', assignee: 'Assignee',
  status: 'Status', priority: 'Priority', description: 'Description',
  Story_Points: 'Story Points', story_points: 'Story Points', labels: 'Labels',
  fix_versions: 'Fix Versions', duedate: 'Due Date', due_date: 'Due Date',
  issuetype: 'Issue Type', resolution: 'Resolution', Sprint: 'Sprint',
  reporter: 'Reporter', Component: 'Component',
};

export const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: '#DC2626', png: '#7C3AED', jpg: '#7C3AED', jpeg: '#7C3AED',
  xlsx: '#16A34A', xls: '#16A34A', csv: '#16A34A',
  docx: '#2563EB', doc: '#2563EB', figma: '#7C3AED',
};
