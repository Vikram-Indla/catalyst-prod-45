// Hierarchy
export interface HierarchyLevel {
  level: number
  name: string
  jiraTypes: string[]
  /** CSS color value for tree/badge visualization */
  color?: string
  /**
   * Which levels are valid parents for items at this level.
   * Empty array = root (no parent allowed).
   * undefined = inherit sequential default (parent = level - 1).
   */
  parentLevels?: number[]
}

// Status mapping
export type CatalystCategory = 'To Do' | 'In Progress' | 'Blocked' | 'In Review' | 'Done'

export interface StatusMapping {
  [category: string]: string[]
}

export const CATALYST_CATEGORY_COLORS: Record<CatalystCategory, { bg: string; text: string }> = {
  'To Do':       { bg: 'var(--ds-background-neutral)', text: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' },
  'In Progress': { bg: 'var(--ds-background-information)',     text: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' },
  'Blocked':     { bg: 'var(--ds-background-danger)',     text: 'var(--ds-text-danger)' },
  'In Review':   { bg: 'var(--ds-background-discovery-bold)',    text: 'var(--ds-background-discovery-bold)' },
  'Done':        { bg: 'var(--ds-background-success-bold)',    text: 'var(--quality-high)' },
}

// User mapping
export interface JiraUserMapping {
  id: string
  jira_account_id: string
  jira_display_name: string
  jira_email: string
  jira_avatar_url: string
  catalyst_profile_id: string | null
  is_mapped: boolean
  auto_matched: boolean
  created_at: string
  updated_at: string
}

// Data scope
export interface ProjectScope {
  key: string
  name: string
  color: string
  included: boolean
}

// Workstream colors (locked)
export const WORKSTREAM_COLORS: Record<string, string> = {
  CAT: 'var(--ds-background-discovery-bold)',
  SEN: 'var(--ds-icon-information)',
  TAH: 'var(--ds-background-discovery-bold)',
  MIM: 'var(--ds-background-accent-magenta-bolder)',
  DEL: 'var(--ds-background-warning-bold)',
  DAI: 'var(--ds-icon-information)',
  STA: 'var(--ds-background-success-bold)',
}

// Config keys
export type ConfigKey =
  | 'sync_lookback_months'
  | 'sync_max_months'
  | 'sync_interval_minutes'
  | 'sync_full_time_utc'
  | 'included_projects'
  | 'hierarchy_levels'
  | 'status_mapping'
  | 'stale_threshold_days'
  | 'critical_threshold_days'
  | 'multi_version_strategy'
  | 'version_name_parsing'
  | 'flag_unscheduled'
  | 'flag_conflicting_dates'
  | 'flag_unmapped_types'
  | 'flag_orphans'
