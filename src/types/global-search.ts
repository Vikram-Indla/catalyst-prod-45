export type WorkItemType =
  | 'bug' | 'task' | 'story' | 'epic' | 'subtask'
  | 'new_feature' | 'improvement' | 'incident' | 'changes' | 'question';

export type SearchHub =
  | 'StrategyHub' | 'ProductHub' | 'ProjectHub' | 'ReleaseHub'
  | 'TestHub' | 'IncidentHub' | 'Tasks' | 'PlanHub';

export interface SearchResult {
  id: string;
  item_key: string;
  title: string;
  hub: SearchHub;
  project_name: string | null;
  project_key: string | null;
  item_type: WorkItemType;
  assignee_name: string | null;
  reporter_name: string | null;
  viewed_at: string;
  archived_at?: string | null;
}

export interface RecentSearchEntry {
  id: string;
  query: string;
  searched_at: string;
}

export interface ActiveFilters {
  hub: SearchHub | null;
  projects: string[];
  assignees: string[];
  type: WorkItemType | null;
}
