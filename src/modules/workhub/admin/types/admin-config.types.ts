// Hierarchy
export interface HierarchyLevel {
  level: number
  name: string
  jiraTypes: string[]
}

// Status mapping
export type CatalystCategory = 'To Do' | 'In Progress' | 'Blocked' | 'In Review' | 'Done'

export interface StatusMapping {
  [category: string]: string[]
}

export const CATALYST_CATEGORY_COLORS: Record<CatalystCategory, { bg: string; text: string }> = {
  'To Do':       { bg: 'rgba(148,163,184,0.12)', text: 'rgba(237,237,237,0.40)' },
  'In Progress': { bg: 'rgba(37,99,235,0.1)',     text: '#2563EB' },
  'Blocked':     { bg: 'rgba(239,68,68,0.1)',     text: '#EF4444' },
  'In Review':   { bg: 'rgba(139,92,246,0.1)',    text: '#8B5CF6' },
  'Done':        { bg: 'rgba(16,185,129,0.1)',    text: '#059669' },
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
  CAT: '#8B5CF6',
  SEN: '#06B6D4',
  TAH: '#6366F1',
  MIM: '#EC4899',
  DEL: '#F97316',
  DAI: '#14B8A6',
  STA: '#84CC16',
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
