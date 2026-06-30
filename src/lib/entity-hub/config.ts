/**
 * Entity Hub Config — single source of truth for the release/sprint surfaces.
 *
 * Per CLAUDE.md "ADOPT CANONICAL COMPONENTS — DO NOT REIMPLEMENT" (P0):
 * Sprint surface mounts the SAME release components with a different config
 * object — never a parallel reimplementation. Future deltas live here, NOT
 * in two divergent forks.
 *
 * 2026-06-26: introduced for /project-hub/:key/sprints clone of
 * /release-hub/releases-management.
 */

export type EntityKind = 'release' | 'sprint' | 'milestone';

export interface EntityScopePickerOption {
  id: string;        // ph_projects.id
  name: string;      // ph_projects.name (release) | ph_projects.name (sprint)
  tag: string;       // ph_projects.key
}

export interface EntityConfig {
  /** Discriminator — switches business-logic branches that genuinely differ. */
  kind: EntityKind;

  /** User-facing labels. ALWAYS sentence case. */
  label: {
    singular: string;          // 'Release' | 'Sprint'
    plural: string;            // 'Releases' | 'Sprints'
    lowerSingular: string;     // 'release' | 'sprint'
    lowerPlural: string;       // 'releases' | 'sprints'
    scopePicker: string;       // 'Product' | 'Project'
    scopePickerLower: string;  // 'product' | 'project'
    actionRelease: string;     // 'Release' verb-label on the action menu / confirm modal
  };

  /** Supabase table name. */
  table: 'ph_releases' | 'ph_jira_sprints' | 'product_milestones';

  /** Progress aggregation view. Optional — milestone has no canonical view yet. */
  progressView?: 'vw_ph_release_progress' | 'vw_sprint_jira_progress';

  /**
   * Which ph_issues field links an issue to this entity (release/sprint only).
   * - 'fix_version_name'  → matches ph_issues.sprint_release[i].name (fix versions JSONB; release-side)
   * - 'sprint_name'       → matches ph_issues.sprint_name (text; sprint-side)
   * Milestones link via business_request_milestone_links instead of ph_issues —
   * WorkItemsSection branches on config.kind before reaching this field.
   */
  matchIssueByField?: 'fix_version_name' | 'sprint_name';

  /**
   * Column-name map. ReleaseDetailPage + ReleaseSidePanel build SELECTs and
   * UPDATEs against these column names so the same component can drive
   * ph_releases (name/project_id/release_date) and product_milestones
   * (title/product_id/target_date) without forking the code.
   */
  columnMap: {
    /** Primary display-name column. release/sprint: 'name'. milestone: 'title'. */
    nameColumn: 'name' | 'title';
    /** Parent FK column. release/sprint: 'project_id'. milestone: 'product_id'. */
    fkProjectColumn: 'project_id' | 'product_id';
    /** End-date column. release/sprint: 'release_date'. milestone: 'target_date'. */
    releaseDateColumn: 'release_date' | 'target_date';
  };

  /**
   * Scope picker source. Releases historically pulled from `products` ∩
   * `ph_projects`; sprints pull the full `ph_projects` list (all projects
   * the user can see).
   */
  scopePickerSource: 'products_intersect_ph_projects' | 'ph_projects_all';

  /** Base URL for the entity routes. */
  baseUrl: string; // '/release-hub' | '/project-hub/:key/sprints'

  /** Detail route builder (id → href). */
  buildDetailHref: (id: string, ctx?: { projectKey?: string }) => string;

  /** Work-navigator route builder (id → href). */
  buildWorkHref: (id: string, ctx?: { projectKey?: string }) => string;

  /** React-query key prefix to keep release/sprint caches separate. */
  queryKeyPrefix: 'projecthub-releases' | 'projecthub-sprints' | 'product-milestones';

  /** Approvers config (table + FK column). */
  approvers: {
    table: 'ph_release_approvers' | 'ph_sprint_approvers' | 'product_milestone_approvers';
    fkColumn: 'release_id' | 'sprint_id' | 'milestone_id';
    profileFkAlias: string; // PostgREST embed alias for profiles JOIN
  };
}

// ─── Release config (existing behaviour) ─────────────────────────────────────

export const RELEASE_CONFIG: EntityConfig = {
  kind: 'release',
  label: {
    singular: 'Release',
    plural: 'Releases',
    lowerSingular: 'release',
    lowerPlural: 'releases',
    scopePicker: 'Product',
    scopePickerLower: 'product',
    actionRelease: 'Release',
  },
  table: 'ph_releases',
  progressView: 'vw_ph_release_progress',
  matchIssueByField: 'fix_version_name',
  scopePickerSource: 'products_intersect_ph_projects',
  baseUrl: '/release-hub',
  buildDetailHref: (id) => `/release-hub/releases-management/${id}`,
  buildWorkHref: (id) => `/release-hub/releases-management/${id}/work`,
  queryKeyPrefix: 'projecthub-releases',
  approvers: {
    table: 'ph_release_approvers',
    fkColumn: 'release_id',
    profileFkAlias: 'profiles!ph_release_approvers_user_id_fkey',
  },
  columnMap: {
    nameColumn: 'name',
    fkProjectColumn: 'project_id',
    releaseDateColumn: 'release_date',
  },
};

// ─── Sprint config ───────────────────────────────────────────────────────────

export const SPRINT_CONFIG: EntityConfig = {
  kind: 'sprint',
  label: {
    singular: 'Sprint',
    plural: 'Sprints',
    lowerSingular: 'sprint',
    lowerPlural: 'sprints',
    scopePicker: 'Project',
    scopePickerLower: 'project',
    actionRelease: 'Release',
  },
  table: 'ph_jira_sprints',
  progressView: 'vw_sprint_jira_progress',
  matchIssueByField: 'sprint_name',
  scopePickerSource: 'ph_projects_all',
  baseUrl: '/project-hub',
  buildDetailHref: (id, ctx) =>
    `/project-hub/${ctx?.projectKey ?? 'BAU'}/sprints/${id}`,
  buildWorkHref: (id, ctx) =>
    `/project-hub/${ctx?.projectKey ?? 'BAU'}/sprints/${id}/work`,
  queryKeyPrefix: 'projecthub-sprints',
  approvers: {
    table: 'ph_sprint_approvers',
    fkColumn: 'sprint_id',
    profileFkAlias: 'profiles!ph_sprint_approvers_user_id_fkey',
  },
  columnMap: {
    nameColumn: 'name',
    fkProjectColumn: 'project_id',
    releaseDateColumn: 'release_date',
  },
};

// ─── Milestone config ────────────────────────────────────────────────────────
//
// 2026-06-30 (CAT-MILESTONE-DETAIL-20260630-001):
// /product-hub/:key/milestones/:milestoneId mounts the canonical
// ReleaseDetailPage with this config — same pattern as SprintDetailPage.
// Differences vs release/sprint:
//   - table = product_milestones (different column names — see columnMap)
//   - approvers table = product_milestone_approvers
//   - work items link via business_request_milestone_links → business_requests
//     (NOT ph_issues.sprint_release). WorkItemsSection branches on
//     config.kind === 'milestone' before reaching matchIssueByField.

export const MILESTONE_CONFIG: EntityConfig = {
  kind: 'milestone',
  label: {
    singular: 'Milestone',
    plural: 'Milestones',
    lowerSingular: 'milestone',
    lowerPlural: 'milestones',
    scopePicker: 'Product',
    scopePickerLower: 'product',
    actionRelease: 'Complete',
  },
  table: 'product_milestones',
  // progressView + matchIssueByField intentionally omitted — milestone has
  // neither a progress view nor a ph_issues link.
  scopePickerSource: 'products_intersect_ph_projects',
  baseUrl: '/product-hub',
  buildDetailHref: (id, ctx) =>
    `/product-hub/${ctx?.projectKey ?? ''}/milestones/${id}`,
  buildWorkHref: (id, ctx) =>
    `/product-hub/${ctx?.projectKey ?? ''}/milestones/${id}/work`,
  queryKeyPrefix: 'product-milestones',
  approvers: {
    table: 'product_milestone_approvers',
    fkColumn: 'milestone_id',
    profileFkAlias: 'profiles!product_milestone_approvers_user_id_fkey',
  },
  columnMap: {
    nameColumn: 'title',
    fkProjectColumn: 'product_id',
    releaseDateColumn: 'target_date',
  },
};

export function getEntityConfig(kind: EntityKind): EntityConfig {
  if (kind === 'sprint') return SPRINT_CONFIG;
  if (kind === 'milestone') return MILESTONE_CONFIG;
  return RELEASE_CONFIG;
}
