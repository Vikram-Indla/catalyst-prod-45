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
  status: EpicStatus | string | null;
  assignee_id: string | null;
  assignee_name?: string | null;
  assignee?: BacklogUser | null;
  end_date: string | null;
  health: string | null;
  deleted_at: string | null;
  primary_program_id: string | null;
  jira_created_at?: string | null;
  jira_updated_at?: string | null;
  source?: 'jira' | 'catalyst';
  /** Jira-grade list-view additions (image-2 parity) */
  priority?: string | null;
  parent_key?: string | null;
  parent_summary?: string | null;
  issue_type?: string | null;
  comment_count?: number | null;
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
  status: StoryStatus | string | null;
  feature_id: string | null;
  assignee_id: string | null;
  assignee_name?: string | null;
  /** Jira reporter display_name — 100% populated on Jira rows per Lovable's
   *  2026-04 discovery pass on ph_issues.reporter_display_name. */
  reporter_name?: string | null;
  assignee?: BacklogUser | null;
  start_date: string | null;
  priority: string | null;
  deleted_at: string | null;
  jira_created_at?: string | null;
  jira_updated_at?: string | null;
  source?: 'jira' | 'catalyst';
  /** Apr 27, 2026 — Backlog scope expansion: rows now include Story plus
   *  QA Bug and Production Incident. issue_type is passed through so the
   *  unified Backlog view can derive BacklogItem.type ('story' | 'bug' |
   *  'incident'). Older callers that only read `type === 'story'` keep
   *  working — the field is additive. */
  issue_type?: string | null;
  /** Apr 27, 2026 (L52): raw parent_key and parent_summary from ph_issues
   *  — passed through unmodified so the unified Backlog view can show the
   *  parent column for QA Bug and Production Incident rows whose parent
   *  is NOT an Epic (Stories or Features). The legacy `feature.epic`
   *  branch only resolved when parent_key matched an Epic; for non-epic
   *  parents that branch returns null and the table column was empty.
   *  Detail panel reads from ph_issues directly so it shows the parent
   *  correctly — table column should match. */
  parent_key?: string | null;
  parent_summary?: string | null;
  feature?: {
    id: string;
    display_id: string | null;
    name: string;
    epic_id: string | null;
    epic?: {
      id: string;
      epic_key: string | null;
      name: string;
      /** Enriched by useStoryBacklog so BacklogPage can synthesize real
       *  epic rows when useEpicBacklog's year-2026 filter excludes them. */
      status?: string | null;
      priority?: string | null;
      assignee_name?: string | null;
      reporter_name?: string | null;
      jira_created_at?: string | null;
      jira_updated_at?: string | null;
    } | null;
  } | null;
}

export interface BacklogGroup<T> {
  status: string;
  label: string;
  items: T[];
  isCollapsed: boolean;
}
