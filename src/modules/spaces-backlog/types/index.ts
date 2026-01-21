/**
 * Catalyst Spaces Backlog — Type Definitions
 * Jira-class work item management
 */

export type WorkItemType = 'epic' | 'feature' | 'story' | 'subtask';

export type WorkItemStatus = 'todo' | 'progress' | 'review' | 'done' | 'blocked';

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
  status: WorkItemStatus;
  priority: WorkItemPriority;
  assignee: Assignee | null;
  sprint: string;
  created: string;
  parentKey?: string;
}

export interface RecentItem {
  key: string;
  title: string;
  type: WorkItemType;
}

// Type configuration for icons/colors
export const TYPE_CONFIG: Record<WorkItemType, { 
  icon: string; 
  label: string; 
  bgColor: string; 
  textColor: string;
  scope: ScopeLevel;
}> = {
  epic: { 
    icon: 'Mountain', 
    label: 'Epic', 
    bgColor: 'bg-blue-100 dark:bg-blue-900/30', 
    textColor: 'text-blue-600 dark:text-blue-400',
    scope: 'program'
  },
  feature: { 
    icon: 'Puzzle', 
    label: 'Feature', 
    bgColor: 'bg-teal-100 dark:bg-teal-900/30', 
    textColor: 'text-teal-600 dark:text-teal-400',
    scope: 'project'
  },
  story: { 
    icon: 'Bookmark', 
    label: 'Story', 
    bgColor: 'bg-amber-100 dark:bg-amber-900/30', 
    textColor: 'text-amber-600 dark:text-amber-400',
    scope: 'project'
  },
  subtask: { 
    icon: 'CheckSquare', 
    label: 'Subtask', 
    bgColor: 'bg-slate-200 dark:bg-slate-700', 
    textColor: 'text-slate-600 dark:text-slate-400',
    scope: 'project'
  },
};

export const STATUS_CONFIG: Record<WorkItemStatus, { 
  label: string; 
  bgColor: string; 
  textColor: string;
}> = {
  todo: { 
    label: 'To Do', 
    bgColor: 'bg-slate-100 dark:bg-slate-700', 
    textColor: 'text-slate-600 dark:text-slate-300' 
  },
  progress: { 
    label: 'In Progress', 
    bgColor: 'bg-blue-100 dark:bg-blue-900/30', 
    textColor: 'text-blue-700 dark:text-blue-300' 
  },
  review: { 
    label: 'In Review', 
    bgColor: 'bg-amber-100 dark:bg-amber-900/30', 
    textColor: 'text-amber-700 dark:text-amber-300' 
  },
  done: { 
    label: 'Done', 
    bgColor: 'bg-teal-100 dark:bg-teal-900/30', 
    textColor: 'text-teal-700 dark:text-teal-300' 
  },
  blocked: { 
    label: 'Blocked', 
    bgColor: 'bg-red-100 dark:bg-red-900/30', 
    textColor: 'text-red-700 dark:text-red-300' 
  },
};

export const PRIORITY_CONFIG: Record<WorkItemPriority, { 
  letter: string; 
  label: string;
  bgColor: string; 
  textColor: string;
}> = {
  critical: { 
    letter: 'C', 
    label: 'Critical',
    bgColor: 'bg-red-100 dark:bg-red-900/30', 
    textColor: 'text-red-600 dark:text-red-400' 
  },
  high: { 
    letter: 'H', 
    label: 'High',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30', 
    textColor: 'text-amber-600 dark:text-amber-400' 
  },
  medium: { 
    letter: 'M', 
    label: 'Medium',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30', 
    textColor: 'text-blue-600 dark:text-blue-400' 
  },
  low: { 
    letter: 'L', 
    label: 'Low',
    bgColor: 'bg-slate-100 dark:bg-slate-700', 
    textColor: 'text-slate-500 dark:text-slate-400' 
  },
};

export const SCOPE_HIERARCHY_ITEMS = [
  { type: 'epic' as WorkItemType, scope: 'program' as ScopeLevel },
  { type: 'feature' as WorkItemType, scope: 'project' as ScopeLevel },
  { type: 'story' as WorkItemType, scope: 'project' as ScopeLevel },
  { type: 'subtask' as WorkItemType, scope: 'project' as ScopeLevel },
];
