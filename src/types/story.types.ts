// Story types for Catalyst - aligned with Jira Align Stories specification
// Citation: Catalyst_Stories_PRD_v2.pdf

export interface Story {
  id: string;
  name: string;
  description?: string | null;
  acceptance_criteria?: string | null;
  
  // Status and workflow
  status?: 'todo' | 'in_progress' | 'done' | 'accepted' | 'blocked' | null;
  
  // Hierarchy relationships
  feature_id: string;
  team_id?: string | null;
  sprint_id?: string | null;
  
  // Assignment
  assignee_id?: string | null;
  
  // Estimation
  estimate_points?: number | null;
  points_loe?: number | null; // Level of Effort points
  
  // Acceptance
  accepted_at?: string | null;
  
  // Timestamps
  created_at?: string | null;
  updated_at?: string | null;
}

export interface StoryWithRelations extends Story {
  features?: { name: string; epic_id?: string };
  teams?: { name: string };
  iterations?: { name: string };
}

export type StoryStatus = 'todo' | 'in_progress' | 'done' | 'accepted' | 'blocked';

export const STORY_STATUS_LABELS: Record<StoryStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
  accepted: 'Accepted',
  blocked: 'Blocked',
};

export const STORY_STATUS_COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'bg-muted' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-primary' },
  { id: 'done', label: 'Done', color: 'bg-workitem-theme' },
  { id: 'accepted', label: 'Accepted', color: 'bg-success' },
  { id: 'blocked', label: 'Blocked', color: 'bg-destructive' },
] as const;
