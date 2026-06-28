// ============================================================
// PLANNER MODULE - TYPE DEFINITIONS
// Enhanced with Resources and AI Insights types
// ============================================================

export type PlannerView =
  | 'dashboard'
  | 'boards'
  | 'task-list'
  | 'work'
  | 'timeline'
  | 'calendar'
  | 'weekly-report'
  | 'workstream-performance'
  | 'ai-insights'
  | 'resources'
  | 'workstreams'
  | 'settings';

// Status is DB-driven: the real value is `task_statuses.slug` (arbitrary,
// admin-managed). The five literals are the SYSTEM defaults — kept for
// autocomplete + the default colour/label maps below; `(string & {})` widens
// the type so custom statuses added in admin flow through every view.
export type TaskStatus = 'backlog' | 'planned' | 'in-progress' | 'review' | 'done' | (string & {});

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export type TaskType = 'project' | 'task' | 'general';

export type GroupByOption = 'status' | 'assignee' | 'priority' | 'reporter' | 'dueDate';

export interface PlannerTask {
  id: string;
  key: string;                    // e.g., "PLN-001"
  title: string;
  description?: string;
  status: TaskStatus;
  type: TaskType;
  priority: TaskPriority;
  assigneeId?: string;
  assigneeName?: string;
  assigneeInitials?: string;
  assigneeOnline?: boolean;
  reporterId?: string;            // Who created/reported it
  reporterName?: string;
  reporterInitials?: string;
  teamId?: string;
  teamName?: string;
  teamEmoji?: string;
  teamColor?: string;
  startDate?: string;             // Required for timeline
  dueDate?: string;
  parentTaskId?: string | null;   // Subtask parent (tasks.parent_task_id)
  blocked: boolean;
  blockedReason?: string;
  progress: number;               // 0-100, manually set
  comments: number;
  attachments?: number;
  storyPoints?: number;
  tags?: string[];
  linkedItemId?: string;
  linkedItemTitle?: string;
  blockedByCount?: number;
  blocksCount?: number;
  createdAt: string;
  updatedAt: string;
  /** Drag-and-drop ordering (kanban + list within column). NULL → unranked. */
  position?: number | null;
}

export interface PlannerUser {
  id: string;
  name: string;
  initials: string;
  role: string;
  team: string;
  teamId?: string;
  online: boolean;
  avatarUrl?: string;
  email?: string;
}

export interface PlannerWorkstream {
  id: string;
  name: string;
  shortName: string;
  slug?: string;
  description?: string;
  emoji?: string;
  leadId?: string;
  memberCount: number;
  color: string;
}

// Alias for backward compatibility
export type PlannerTeam = PlannerWorkstream;

// ============================================================
// AI INSIGHTS TYPES
// ============================================================

export interface AIInsightMeta {
  sprint?: string;
  updated?: string;
  confidence?: string;
  members?: string;
  date?: string;
  dependencies?: string;
}

export interface AIInsight {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  action?: string;
  taskId?: string;
  createdAt: string;
  meta?: AIInsightMeta;
}

export interface AIInsightsSummary {
  overdue: number;
  dueSoon: number;
  stale: number;
  totalActive: number;
  unassigned: number;
}

export interface TaskInsight {
  id: string;
  taskId: string;
  taskKey: string;
  title: string;
  type: 'overdue' | 'due-soon' | 'stale';
  dueInfo: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeInitials?: string;
  assigneeColor?: string;
  teamId?: string;
  teamName?: string;
  teamColor?: string;
  status: TaskStatus;
}

export interface ResourceInsight {
  userId: string;
  name: string;
  initials: string;
  color: string;
  totalTasks: number;
  overdueCount: number;
  dueSoonCount: number;
}

export interface TeamInsight {
  teamId: string;
  teamName: string;
  teamColor: string;
  activeCount: number;
  overdueCount: number;
  dueSoonCount: number;
  members: ResourceInsight[];
}

export interface UnassignedTask {
  id: string;
  taskKey: string;
  title: string;
  status: TaskStatus;
  teamId?: string;
  teamName?: string;
}

export interface AIInsightsResult {
  summary: AIInsightsSummary;
  overdueTasks: TaskInsight[];
  dueSoonTasks: TaskInsight[];
  staleTasks: TaskInsight[];
  byTeam: TeamInsight[];
  unassignedTasks: UnassignedTask[];
  legacyInsights: AIInsight[];
  isLoading: boolean;
  refresh: () => void;
}

// ============================================================
// RESOURCE TYPES
// ============================================================

export interface ResourceTeam {
  teamId: string;
  teamName: string;
  teamColor: string;
  role: 'lead' | 'member';
  taskCount: number;
}

export interface PlannerResource {
  id: string;
  fullName: string;
  email: string;
  initials: string;
  avatarColor: string;
  role: string | null;
  teams: ResourceTeam[];
  taskCount: number;
  overdueCount: number;
  dueSoonCount: number;
  staleCount: number;
}

export interface ResourceWithTasks extends PlannerResource {
  tasks: PlannerTask[];
  tasksByStatus: Record<TaskStatus, number>;
}

// ============================================================
// COLUMN CONFIGURATION
// ============================================================

export interface ColumnConfig {
  id: TaskStatus | string;
  title: string;
  color: string;
  order: number;
}

// Column configuration - Catalyst V5 semantic status colors
// Balanced approach: colorful for active states, subtle for default states
export const COLUMN_CONFIG: ColumnConfig[] = [
  { id: 'backlog', title: 'Backlog', color: 'var(--ds-text-disabled)', order: 0 },       // gray-400 (subtle)
  { id: 'planned', title: 'Planned', color: 'var(--ds-text-subtlest)', order: 1 },       // gray-500 (subtle)
  { id: 'in-progress', title: 'In Progress', color: 'var(--ds-text-warning)', order: 2 }, // warning/amber-600 (colorful)
  { id: 'review', title: 'Review', color: 'var(--ds-background-discovery-bold)', order: 3 },         // violet-500 (colorful)
  { id: 'done', title: 'Done', color: 'var(--ds-background-success-bold)', order: 4 },             // success/emerald-500 (colorful)
];

// Status style configuration - determines whether status gets colored background
export const STATUS_STYLE_CONFIG: Record<string, { colorful: boolean; bgColor: string }> = {
  'backlog': { colorful: false, bgColor: 'transparent' },
  'planned': { colorful: false, bgColor: 'transparent' },
  'in-progress': { colorful: true, bgColor: 'var(--ds-background-warning)' },  // amber-50
  'review': { colorful: true, bgColor: 'var(--ds-background-discovery)' },       // violet-50
  'done': { colorful: true, bgColor: 'var(--ds-background-success)' },         // emerald-50
};

// Priority configuration - Deep, clean semantic priority colors
// All priorities use colored dots for visual distinction
export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; emoji: string; bgColor: string; colorful: boolean }> = {
  critical: { label: 'Critical', color: 'var(--ds-text-danger)', emoji: '●', bgColor: 'transparent', colorful: false },  // red-600 (deep red)
  high: { label: 'High', color: 'var(--ds-background-warning-bold)', emoji: '●', bgColor: 'transparent', colorful: false },          // orange-600 (deep amber)
  medium: { label: 'Medium', color: 'var(--ds-text-success)', emoji: '●', bgColor: 'transparent', colorful: false },      // green-600 (deep green)
  low: { label: 'Low', color: 'var(--ds-text-subtlest)', emoji: '●', bgColor: 'transparent', colorful: false },            // slate-500 (neutral)
};

// Due date groups for grouping
export const DUE_DATE_GROUPS = [
  { id: 'overdue', title: 'Overdue', color: 'var(--ds-text-danger)' },     // red-500
  { id: 'today', title: 'Due Today', color: 'var(--ds-text-warning)' },     // amber-600
  { id: 'thisWeek', title: 'This Week', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' },  // blue-600
  { id: 'nextWeek', title: 'Next Week', color: 'var(--ds-chart-teal-bold)' },  // teal-600
  { id: 'later', title: 'Later', color: 'var(--ds-text-subtlest)' },         // slate-500
  { id: 'noDueDate', title: 'No Due Date', color: 'var(--ds-text-subtlest)' }, // slate-400
];

// Status colors for insights - Deep, vibrant semantic status colors
export const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: 'var(--ds-text-subtlest)',   // slate-500 (neutral gray)
  planned: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',   // blue-600 (vibrant blue)
  'in-progress': 'var(--ds-background-warning-bold)', // orange-500 (vibrant orange)
  review: 'var(--ds-background-discovery-bold)',    // violet-500 (vibrant violet)
  done: 'var(--ds-text-success)',      // green-500 (vibrant green)
};

// Progress color helper - returns color based on percentage
export const getProgressColor = (progress: number): string => {
  if (progress >= 67) return 'var(--ds-chart-teal-bold)'; // teal-600
  if (progress >= 34) return 'var(--ds-text-warning)'; // amber-600
  return 'var(--ds-text-disabled)'; // gray-400
};

// Avatar colors for resources - Catalyst V5 (Blue, Teal, Gray only)
export const AVATAR_COLORS = [
  'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', // Blue (brand-primary)
  'var(--ds-chart-teal-bold)', // Teal (brand-teal)
  'var(--ds-text-subtlest)', // Gray (secondary-grey)
];
