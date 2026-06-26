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

export type EntityKind = 'release' | 'sprint';

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
  table: 'ph_releases' | 'ph_jira_sprints';

  /** Progress aggregation view. */
  progressView: 'vw_ph_release_progress' | 'vw_sprint_jira_progress';

  /**
   * Which ph_issues field links an issue to this entity.
   * - 'fix_version_name'  → matches ph_issues.sprint_release[i].name (fix versions JSONB; release-side)
   * - 'sprint_name'       → matches ph_issues.sprint_name (text; sprint-side)
   */
  matchIssueByField: 'fix_version_name' | 'sprint_name';

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
  queryKeyPrefix: 'projecthub-releases' | 'projecthub-sprints';

  /** Approvers config (table + FK column). */
  approvers: {
    table: 'ph_release_approvers' | 'ph_sprint_approvers';
    fkColumn: 'release_id' | 'sprint_id';
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
};

export function getEntityConfig(kind: EntityKind): EntityConfig {
  return kind === 'sprint' ? SPRINT_CONFIG : RELEASE_CONFIG;
}
