/**
 * Work Item Types — Jira-parity list/allwork views
 * Stage A: Type definitions for ProjectHub list & all-work views
 */

export type WorkItemType = 'epic' | 'story' | 'bug' | 'task' | 'subtask' | 'feature' | 'improvement';

export type WorkItemStatus =
  | 'backlog'
  | 'in_progress'
  | 'done'
  | 'in_production'
  | 'ready_for_qa'
  | 'in_requirements'
  | 'in_uat'
  | 'in_qa'
  | 'in_dev'
  | 'closed';

export type WorkItemPriority = 'highest' | 'high' | 'medium' | 'low' | 'lowest';

export interface WorkItem {
  id: string;
  projectId: string;
  parentId: string | null;
  parentKey: string | null;
  jiraKey: string;
  type: WorkItemType;
  summary: string;
  status: WorkItemStatus;
  statusName: string;
  statusCategory: 'todo' | 'in_progress' | 'done';
  assigneeId: string | null;
  assignee?: {
    id: string;
    name: string;
    avatarUrl: string | null;
    initials: string;
    color: string;
  };
  reporterId: string | null;
  reporter?: { id: string; name: string };
  priority: WorkItemPriority;
  fixVersion: string | null;
  commentsCount: number;
  childCount: number;
  children?: WorkItem[];
  isExpanded?: boolean;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  parentSummary?: string | null;
  storyPoints?: number | null;
  sprintName?: string | null;
  resolution?: string | null;
  labels?: string[];
}

export interface ProjectInfo {
  id: string;
  name: string;
  key: string;
  color: string;
  logoInitial: string;
  memberCount: number;
}

// Status display mapping (V12 3-colour guardrail)
export const STATUS_LOZENGE_MAP: Record<WorkItemStatus, {
  bg: string; text: string; label: string;
}> = {
  backlog:          { bg: '#DFE1E6', text: '#253858', label: 'BACKLOG' },
  in_progress:      { bg: '#DEEBFF', text: '#0747A6', label: 'IN PROGRESS' },
  done:             { bg: '#E3FCEF', text: '#006644', label: 'DONE' },
  in_production:    { bg: '#E3FCEF', text: '#006644', label: 'IN PRODUCTION' },
  ready_for_qa:     { bg: '#E3FCEF', text: '#006644', label: 'READY FOR QA' },
  in_requirements:  { bg: '#DFE1E6', text: '#253858', label: 'IN REQUIREMENTS' },
  in_uat:           { bg: '#E3FCEF', text: '#006644', label: 'IN UAT' },
  in_qa:            { bg: '#DEEBFF', text: '#0747A6', label: 'IN QA' },
  in_dev:           { bg: '#DEEBFF', text: '#0747A6', label: 'IN DEV' },
  closed:           { bg: '#E3FCEF', text: '#006644', label: 'CLOSED' },
};

// Work item type colour mapping (canonical SVG icons)
export const WORK_ITEM_TYPE_COLOR: Record<WorkItemType, string> = {
  epic:        '#6554C0',
  story:       '#36B37E',
  bug:         '#FF5630',
  task:        '#2684FF',
  subtask:     '#2684FF',
  feature:     '#36B37E',
  improvement: '#36B37E',
};
