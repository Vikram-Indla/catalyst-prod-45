export type DependencyType = 'blocks' | 'is_blocked_by';

export type Dependency = {
  id: number;
  project_key: string;
  source_issue_key: string;
  target_issue_key: string;
  dependency_type: DependencyType;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type IssueMeta = Record<
  string,
  {
    issue_type: string | null;
    summary: string | null;
    status?: string | null;
    status_category?: string | null;
    due_date?: string | null;
    assignee_account_id?: string | null;
  }
>;
