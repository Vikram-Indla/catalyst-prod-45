/**
 * Realistic mock data for the Project Board (`/project-hub/:key/boards/:id`).
 * Matches BAU-style content visible in the live app.
 */
import type { BoardIssue } from '@/components/kanban/kanban-types';
import type { KanbanColumnDef } from '@/components/kanban/kanban-tokens';

const NOW = '2026-06-14T10:00:00.000Z';

// Columns matching the live BAU board screenshot
export const BAU_BOARD_COLUMNS: KanbanColumnDef[] = [
  { id: 'col-backlog',      name: 'BACKLOG',         category: 'todo',        statuses: ['Backlog'] },
  { id: 'col-design',       name: 'IN DESIGN',       category: 'todo',        statuses: ['In Design'] },
  { id: 'col-requirements', name: 'IN REQUIREMENTS', category: 'todo',        statuses: ['In Requirements'] },
  { id: 'col-dev',          name: 'IN DEVELOPMENT',  category: 'in_progress', statuses: ['In Development'] },
  { id: 'col-internal-qa',  name: 'INTERNAL QA',     category: 'in_progress', statuses: ['Internal QA'] },
];

const mkIssue = (overrides: Partial<BoardIssue> & Pick<BoardIssue, 'id' | 'issueKey' | 'summary' | 'status'>): BoardIssue => ({
  issueType: 'Story',
  priority: 'medium',
  statusCategory: 'indeterminate',
  assigneeName: 'Vikram Indla',
  labels: [],
  sprintName: null,
  storyPoints: null,
  parentKey: null,
  parentSummary: null,
  fixVersion: null,
  isFlagged: false,
  updatedAt: NOW,
  createdAt: NOW,
  ...overrides,
});

export const BAU_BOARD_ISSUES: BoardIssue[] = [
  // IN DESIGN (3)
  mkIssue({ id: 'i-6041', issueKey: 'BAU-6041', summary: 'Testing with issue',                            issueType: 'Story',  status: 'In Design',       assigneeName: 'Andrew Fayyaz' }),
  mkIssue({ id: 'i-5063', issueKey: 'BAU-5063', summary: 'Know your Journey — Activity–Sector Linking (BO Enhancement)', issueType: 'Story', status: 'In Design', parentKey: 'BAU-5058', parentSummary: 'Know Your Journey', assigneeName: 'Nada Alfassam' }),
  mkIssue({ id: 'i-5881', issueKey: 'BAU-5881', summary: 'Claude AI EF Core optimization – eliminate N+1 queries in Digital Maturity backend', issueType: 'Story', status: 'In Design', parentKey: 'BAU-5880', parentSummary: 'AI Development Adoption – May 2026', assigneeName: 'Ahmed Yousry' }),

  // IN REQUIREMENTS (sample of 4)
  mkIssue({ id: 'i-4609', issueKey: 'BAU-4609', summary: 'Landing Page – UX Surveys',                     issueType: 'Story',   status: 'In Requirements', parentKey: 'BAU-4548', parentSummary: 'Landing page – DGA modification' }),
  mkIssue({ id: 'i-4568', issueKey: 'BAU-4568', summary: 'DGA Component – Senaei',                        issueType: 'Story',   status: 'In Requirements', parentKey: 'BAU-4561', parentSummary: 'Landing page – DGA modification' }),
  mkIssue({ id: 'i-5062', issueKey: 'BAU-5062', summary: 'Know your Journey – Sector Management (BO)',    issueType: 'Story',   status: 'In Requirements', parentKey: 'BAU-5057', parentSummary: 'Know Your Journey' }),
  mkIssue({ id: 'i-5064', issueKey: 'BAU-5064', summary: 'Know your Journey – Industrial Locations Management (BO)', issueType: 'Story', status: 'In Requirements', parentKey: 'BAU-5059', parentSummary: 'Know Your Journey' }),

  // IN DEVELOPMENT (sample of 4)
  mkIssue({ id: 'i-6040', issueKey: 'BAU-6040', summary: 'Standard Incentive CR — Modifying Existing Sector', issueType: 'Story', status: 'In Development', statusCategory: 'indeterminate', priority: 'high', parentKey: 'BAU-6039', parentSummary: 'Standard Incentive', assigneeName: 'Yazeed Daraz' }),
  mkIssue({ id: 'i-6016', issueKey: 'BAU-6016', summary: 'Adding Supporting doc + feasibility study attachments on the License processes', issueType: 'Story', status: 'In Development', statusCategory: 'indeterminate', parentKey: 'BAU-6015', assigneeName: 'Nada Alfassam' }),
  mkIssue({ id: 'i-5960', issueKey: 'BAU-5960', summary: 'Update product details survey – Phase 2 (add validation for the price + actual production)', issueType: 'Story', status: 'In Development', parentKey: 'BAU-5959', parentSummary: 'Update Product Details survey (Scanning)' }),
  mkIssue({ id: 'i-5967', issueKey: 'BAU-5967', summary: 'Raw materials Challenges – Submit Solution / Offer', issueType: 'Story', status: 'In Development', parentKey: 'BAU-5957', parentSummary: 'Raw materials Challenges', assigneeName: 'Nada Alfassam' }),

  // INTERNAL QA (sample of 4)
  mkIssue({ id: 'i-6035', issueKey: 'BAU-6035', summary: 'Remove Level 2 Activity from Custom Exemption form', issueType: 'Story', status: 'Internal QA', parentKey: 'BAU-6026', parentSummary: 'Custom Exemption', assigneeName: 'Ahmed Yousry' }),
  mkIssue({ id: 'i-5091', issueKey: 'BAU-5091', summary: 'Enable Active Directory login for Senaei BAU (Auth Only)', issueType: 'Story', status: 'Internal QA', parentKey: 'BAU-5078', assigneeName: 'Vikram Indla' }),
  mkIssue({ id: 'i-5820', issueKey: 'BAU-5820', summary: 'Fast Track Shipment Form',                       issueType: 'Story',  status: 'Internal QA', parentKey: 'BAU-5816', parentSummary: 'Fast Track Shipping', priority: 'high', assigneeName: 'Yazeed Daraz' }),
  mkIssue({ id: 'i-5822', issueKey: 'BAU-5822', summary: 'Investor Fast Track Requests',                   issueType: 'Story',  status: 'Internal QA', parentKey: 'BAU-5815', parentSummary: 'Fast Track Shipping', assigneeName: 'Vikram Indla' }),
];

// Extra variants used by the Kanban Components story (gallery layout).
// One card per visual state so reviewers can scan them side-by-side.
export const BAU_CARD_VARIANTS: BoardIssue[] = [
  mkIssue({
    id: 'v-default', issueKey: 'BAU-7001',
    summary: 'Default story card — assignee, no parent, medium priority',
    issueType: 'Story', status: 'In Development',
    assigneeName: 'Vikram Indla',
  }),
  mkIssue({
    id: 'v-flagged', issueKey: 'BAU-7002',
    summary: 'Flagged card — needs attention, blocked on upstream review',
    issueType: 'Story', status: 'In Development', isFlagged: true,
    assigneeName: 'Nada Alfassam', priority: 'high',
  }),
  mkIssue({
    id: 'v-parent', issueKey: 'BAU-7003',
    summary: 'Card with parent epic — Know Your Journey BO enhancement',
    issueType: 'Story', status: 'In Design',
    parentKey: 'BAU-5058', parentSummary: 'Know Your Journey',
    assigneeName: 'Ahmed Yousry',
  }),
  mkIssue({
    id: 'v-labels', issueKey: 'BAU-7004',
    summary: 'Card with labels — backend rework, perf, observability',
    issueType: 'Story', status: 'In Development',
    labels: ['backend', 'perf', 'observability'],
    assigneeName: 'Yazeed Daraz',
  }),
  mkIssue({
    id: 'v-storypoints', issueKey: 'BAU-7005',
    summary: 'Card with story points — 8 SP estimate, ready for sprint',
    issueType: 'Story', status: 'In Requirements',
    storyPoints: 8, sprintName: 'Sprint 2.4 - 14 Jun 2026',
    assigneeName: 'Andrew Fayyaz',
  }),
  mkIssue({
    id: 'v-bug', issueKey: 'BAU-7006',
    summary: 'QA Bug card — investigation required, ageing 12 days',
    issueType: 'QA Bug', status: 'Internal QA', priority: 'critical',
    assigneeName: 'Vikram Indla',
  }),
  mkIssue({
    id: 'v-epic', issueKey: 'BAU-7007',
    summary: 'Epic card — Senaei BAU Q3 strategic initiative',
    issueType: 'Epic', status: 'In Development', priority: 'high',
    assigneeName: 'Nada Alfassam',
  }),
  mkIssue({
    id: 'v-task', issueKey: 'BAU-7008',
    summary: 'Task card — wire description editor to ADF parser',
    issueType: 'Task', status: 'In Development',
    assigneeName: 'Ahmed Yousry', priority: 'low',
  }),
];

export const BAU_BOARD_ISSUES_BY_ID = new Map(BAU_BOARD_ISSUES.map((i) => [i.id, i]));

export const BAU_CARD_VARIANTS_BY_ID = new Map(BAU_CARD_VARIANTS.map((i) => [i.id, i]));

export const BAU_BOARD_COL_MAP: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const col of BAU_BOARD_COLUMNS) map[col.id] = [];
  for (const issue of BAU_BOARD_ISSUES) {
    const col = BAU_BOARD_COLUMNS.find((c) => c.statuses.includes(issue.status));
    if (col) map[col.id].push(issue.id);
  }
  return map;
})();

export const BAU_AVATARS_BY_NAME = new Map<string, string>([
  // Names map to empty strings → component falls back to initials.
  ['Vikram Indla',  ''],
  ['Nada Alfassam', ''],
  ['Ahmed Yousry',  ''],
  ['Andrew Fayyaz', ''],
  ['Yazeed Daraz',  ''],
]);
