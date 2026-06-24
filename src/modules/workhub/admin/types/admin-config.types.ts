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
  'To Do':       { bg: 'var(--ds-background-neutral, rgba(148,163,184,0.12))', text: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))' },
  'In Progress': { bg: 'var(--ds-background-information, rgba(37,99,235,0.1))',     text: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))' },
  'Blocked':     { bg: 'var(--ds-background-danger, rgba(239,68,68,0.1))',     text: 'var(--ds-text-danger, #EF4444)' },
  'In Review':   { bg: 'var(--ds-background-discovery-bold, rgba(139,92,246,0.1))',    text: 'var(--ds-background-discovery-bold, #6E5DC6)' },
  'Done':        { bg: 'var(--ds-background-success-bold, rgba(16,185,129,0.1))',    text: 'var(--quality-high, #059669)' },
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
  CAT: 'var(--ds-background-discovery-bold, #6E5DC6)',
  SEN: 'var(--ds-icon-information, #1D7AFC)',
  TAH: 'var(--ds-background-discovery-bold, #6E5DC6)',
  MIM: 'var(--ds-background-accent-magenta-bolder, #BE185D)',
  DEL: 'var(--ds-background-warning-bold, #E2B203)',
  DAI: 'var(--ds-icon-information, #1D7AFC)',
  STA: 'var(--ds-background-success-bold, #1F845A)',
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
