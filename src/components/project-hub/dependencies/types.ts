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
    assignee_display_name?: string | null;
    /** Release name(s) from ph_issues.fix_versions[].name. */
    release?: string | null;
    /** Sprint/iteration name from ph_issues.sprint_release[].name (fallback sprint_name). */
    sprint?: string | null;
    /** Hierarchy parent key (for "Roll-up to" Epic/Feature/Story). */
    parent_key?: string | null;
    /** Project key (for the "Space" filter). */
    project_key?: string | null;
  }
>;

/** Hierarchy node for roll-up ancestor resolution (covers cards + their ancestors). */
export type HierarchyNode = { issue_type: string | null; parent_key: string | null; summary: string | null };
export type Hierarchy = Record<string, HierarchyNode>;
