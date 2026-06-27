export type DependencyType = 'blocks' | 'is_blocked_by';

export type Dependency = {
  id: number | string;
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
    /** Start date — raw_json.fields.customfield_10015 (Jira "Start date"). */
    start_date?: string | null;
    /** End date — raw_json.fields.duedate (fallback due_date / effective_due_date column). */
    end_date?: string | null;
    /** Hierarchy parent key (for "Roll-up to" Epic/Feature/Story). */
    parent_key?: string | null;
    /** Project key (for the "Space" filter). */
    project_key?: string | null;
  }
>;

/** Hierarchy node for roll-up ancestor resolution (covers cards + their ancestors). */
export type HierarchyNode = { issue_type: string | null; parent_key: string | null; summary: string | null };
export type Hierarchy = Record<string, HierarchyNode>;

/* ── Canonical multi-hub adapter (project / product / incident) ──────────────
   The shared dependency UI (DependenciesView + DependenciesDiagram + modal) is
   data-source-agnostic. Each hub supplies a data hook + write callbacks; the
   storage table is `ph_issue_dependencies` for ALL hubs (Vikram 2026-06-25 —
   "project jaisa"), only the META source differs (ph_issues vs business_requests). */

export type HubType = 'project' | 'product' | 'incident' | 'test';

export type ProjectOption = {
  project_key: string;
  name: string | null;
  color?: string | null;
  avatar_url?: string | null;
  icon?: string | null;
};

/** A pickable source/target in the Add-dependency modal. */
export type DependencyCandidate = {
  value: string;            // issue / business-request key
  label: string;
  issueType: string | null;
  projectKey?: string | null; // used as ph_issue_dependencies.project_key on insert
};

/** Resolved data the shared view renders. Returned by each hub's data hook. */
export type DependencyData = {
  dependencies: Dependency[];
  issueMeta: IssueMeta;
  hierarchy: Hierarchy;
  projects: ProjectOption[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
};
