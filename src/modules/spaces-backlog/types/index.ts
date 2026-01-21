/**
 * Catalyst Spaces Backlog — Type Definitions
 * Jira-class work item management with STRICT HIERARCHY CONTRACT
 */

// HIERARCHY CONTRACT: Work item types allowed per scope
// ENTERPRISE: objective, strategic_initiative ONLY
// PROGRAM: epic ONLY  
// PROJECT: feature, story, subtask ONLY
export type WorkItemType = 'objective' | 'strategic_initiative' | 'epic' | 'feature' | 'story' | 'subtask';

export type WorkItemStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';

export type WorkItemPriority = 'critical' | 'high' | 'medium' | 'low';

export type ScopeLevel = 'enterprise' | 'program' | 'project';

export interface Assignee {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export interface WorkItem {
  id: string;
  key: string;
  type: WorkItemType;
  title: string;
  description?: string;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  assignee: Assignee | null;
  sprint: string;
  createdAt: string;
  updatedAt: string;
  parentKey?: string;
  storyPoints?: number;
  labels?: string[];
  scopeLevel: ScopeLevel; // Enforce which scope this item belongs to
}

export interface RecentItem {
  key: string;
  title: string;
  type: WorkItemType;
}

// HIERARCHY CONTRACT: Which types are allowed per scope
export const SCOPE_ALLOWED_TYPES: Record<ScopeLevel, WorkItemType[]> = {
  enterprise: ['objective', 'strategic_initiative'],
  program: ['epic'],
  project: ['feature', 'story', 'subtask'],
};

// Type configuration with CATALYST V5 visual spec
export const TYPE_CONFIG: Record<WorkItemType, { 
  icon: 'Target' | 'Flag' | 'Zap' | 'Package' | 'BookOpen' | 'CheckSquare';
  label: string; 
  bgColor: string; 
  textColor: string;
  scopeLevel: ScopeLevel;
}> = {
  // ENTERPRISE scope items
  objective: { 
    icon: 'Target', 
    label: 'Objective', 
    bgColor: 'bg-[#ede9fe]', 
    textColor: 'text-[#7c3aed]',
    scopeLevel: 'enterprise'
  },
  strategic_initiative: { 
    icon: 'Flag', 
    label: 'Strategic Initiative', 
    bgColor: 'bg-[#fef3c7]', 
    textColor: 'text-[#d97706]',
    scopeLevel: 'enterprise'
  },
  // PROGRAM scope items - EPICS ONLY
  epic: { 
    icon: 'Zap', 
    label: 'Epic', 
    bgColor: 'bg-[#ede9fe]', 
    textColor: 'text-[#7c3aed]',
    scopeLevel: 'program'
  },
  // PROJECT scope items
  feature: { 
    icon: 'Package', 
    label: 'Feature', 
    bgColor: 'bg-[#ccfbf1]', 
    textColor: 'text-[#0d9488]',
    scopeLevel: 'project'
  },
  story: { 
    icon: 'BookOpen', 
    label: 'Story', 
    bgColor: 'bg-[#dcfce7]', 
    textColor: 'text-[#16a34a]',
    scopeLevel: 'project'
  },
  subtask: { 
    icon: 'CheckSquare', 
    label: 'Subtask', 
    bgColor: 'bg-[#dbeafe]', 
    textColor: 'text-[#2563eb]',
    scopeLevel: 'project'
  },
};

export const STATUS_CONFIG: Record<WorkItemStatus, { 
  label: string; 
  bgColor: string; 
  textColor: string;
  dotColor: string;
}> = {
  backlog: { 
    label: 'Backlog', 
    bgColor: 'bg-gray-100 dark:bg-gray-800', 
    textColor: 'text-gray-600 dark:text-gray-400',
    dotColor: 'bg-gray-400'
  },
  todo: { 
    label: 'To Do', 
    bgColor: 'bg-slate-100 dark:bg-slate-700', 
    textColor: 'text-slate-600 dark:text-slate-300',
    dotColor: 'bg-slate-400'
  },
  in_progress: { 
    label: 'In Progress', 
    bgColor: 'bg-blue-100 dark:bg-blue-900/30', 
    textColor: 'text-blue-700 dark:text-blue-300',
    dotColor: 'bg-blue-500'
  },
  review: { 
    label: 'In Review', 
    bgColor: 'bg-amber-100 dark:bg-amber-900/30', 
    textColor: 'text-amber-700 dark:text-amber-300',
    dotColor: 'bg-amber-500'
  },
  done: { 
    label: 'Done', 
    bgColor: 'bg-teal-100 dark:bg-teal-900/30', 
    textColor: 'text-teal-700 dark:text-teal-300',
    dotColor: 'bg-teal-500'
  },
  blocked: { 
    label: 'Blocked', 
    bgColor: 'bg-red-100 dark:bg-red-900/30', 
    textColor: 'text-red-700 dark:text-red-300',
    dotColor: 'bg-red-500'
  },
};

export const PRIORITY_CONFIG: Record<WorkItemPriority, { 
  letter: string; 
  label: string;
  bgColor: string; 
  textColor: string;
  icon: 'ArrowUp' | 'ArrowDown' | 'Minus' | 'AlertTriangle';
  color: string;
}> = {
  critical: { 
    letter: 'C', 
    label: 'Critical',
    bgColor: 'bg-red-100 dark:bg-red-900/30', 
    textColor: 'text-red-600 dark:text-red-400',
    icon: 'AlertTriangle',
    color: 'text-red-500'
  },
  high: { 
    letter: 'H', 
    label: 'High',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30', 
    textColor: 'text-amber-600 dark:text-amber-400',
    icon: 'ArrowUp',
    color: 'text-amber-500'
  },
  medium: { 
    letter: 'M', 
    label: 'Medium',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30', 
    textColor: 'text-blue-600 dark:text-blue-400',
    icon: 'Minus',
    color: 'text-blue-500'
  },
  low: { 
    letter: 'L', 
    label: 'Low',
    bgColor: 'bg-slate-100 dark:bg-slate-700', 
    textColor: 'text-slate-500 dark:text-slate-400',
    icon: 'ArrowDown',
    color: 'text-slate-400'
  },
};

// Scope labels for UI
export const SCOPE_LABELS: Record<ScopeLevel, string> = {
  enterprise: 'Enterprise',
  program: 'Program',
  project: 'Project',
};

export const SCOPE_HIERARCHY_ITEMS = [
  { type: 'objective' as WorkItemType, scope: 'enterprise' as ScopeLevel },
  { type: 'strategic_initiative' as WorkItemType, scope: 'enterprise' as ScopeLevel },
  { type: 'epic' as WorkItemType, scope: 'program' as ScopeLevel },
  { type: 'feature' as WorkItemType, scope: 'project' as ScopeLevel },
  { type: 'story' as WorkItemType, scope: 'project' as ScopeLevel },
  { type: 'subtask' as WorkItemType, scope: 'project' as ScopeLevel },
];
