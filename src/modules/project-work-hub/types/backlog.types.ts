export type BacklogItemType = 'epic' | 'feature' | 'story';

export type EpicStatus = 'proposed' | 'approved' | 'in_progress' | 'done' | 'cancelled';
export type FeatureStatus = 'active' | 'in_progress' | 'done' | 'cancelled';
export type StoryStatus = 'open' | 'in_progress' | 'in_review' | 'done' | 'cancelled';

export type Priority = 'critical' | 'high' | 'medium' | 'low' | null;

export interface BacklogUser {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface BacklogEpic {
  id: string;
  epic_key: string | null;
  name: string;
  description: string | null;
  status: EpicStatus | null;
  assignee_id: string | null;
  assignee?: BacklogUser | null;
  end_date: string | null;
  health: string | null;
  deleted_at: string | null;
  primary_program_id: string | null;
}

export interface BacklogFeature {
  id: string;
  display_id: string | null;
  name: string;
  description: string | null;
  status: FeatureStatus | null;
  epic_id: string | null;
  project_id: string | null;
  assignee_id: string | null;
  assignee?: BacklogUser | null;
  planned_end_date: string | null;
  priority: string | null;
  deleted_at: string | null;
}

export interface BacklogStory {
  id: string;
  story_key: string | null;
  title: string;
  name: string | null;
  description: string | null;
  status: StoryStatus | null;
  feature_id: string | null;
  assignee_id: string | null;
  assignee?: BacklogUser | null;
  start_date: string | null;
  priority: string | null;
  deleted_at: string | null;
  feature?: {
    id: string;
    display_id: string | null;
    name: string;
    epic_id: string | null;
    epic?: {
      id: string;
      epic_key: string | null;
      name: string;
    } | null;
  } | null;
}

export interface BacklogGroup<T> {
  status: string;
  label: string;
  items: T[];
  isCollapsed: boolean;
}
