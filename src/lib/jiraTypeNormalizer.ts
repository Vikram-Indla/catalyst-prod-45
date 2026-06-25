/**
 * Canonical Jira issue type normalization layer.
 *
 * Three concepts per type:
 *   jiraIssueTypeName    — exact Jira string, e.g. "Backend"
 *   catalystTypeCategory — normalized family, e.g. "subtask"
 *   hierarchy level      — 0 = Epic, 1 = Feature, 2 = work item, 3 = subtask family
 *
 * Unknown types: classified as 'unknown', logged once to console, NEVER dropped.
 * They flow through safely until an admin whitelist mapping is applied.
 *
 * Frontend/Backend/Integration are subtask-family per Jira hierarchy and per the
 * icon registry in jira-issue-type-icons.tsx (all three carry [SUB-TASK] annotation).
 * Idea is NOT included — not present in the connected Jira projects.
 */

export type CatalystTypeCategory =
  | 'subtask'
  | 'story'
  | 'task'
  | 'bug'
  | 'epic'
  | 'feature'
  | 'incident'
  | 'change_request'
  | 'business_gap'
  | 'api_requirement'
  | 'unknown';

/**
 * Maps exact Jira issue type names → Catalyst category.
 * Key = exact Jira display name (case-sensitive, matches fields.issuetype.name).
 */
export const JIRA_TYPE_CATEGORY_MAP: Record<string, CatalystTypeCategory> = {
  // Subtask family — all four share the same structural category
  'Sub-task':            'subtask',
  'Frontend':            'subtask',
  'Backend':             'subtask',
  'Integration':         'subtask',
  // Standard work item types
  'Story':               'story',
  'Task':                'task',
  'QA Bug':              'bug',
  'Defect':              'bug',
  'Epic':                'epic',
  'Feature':             'feature',
  'Production Incident': 'incident',
  'Change Request':      'change_request',
  'Business Gap':        'business_gap',
  'API Requirement':     'api_requirement',
};

/**
 * Hierarchy levels for wh-jira-sync when wh_config.hierarchy_levels is absent.
 * 0 = Epic (top), 1 = Feature, 2 = standard work item, 3 = subtask leaf.
 * Unknown types default to 2 (standard work item) — safe for all queries.
 */
export const JIRA_TYPE_HIERARCHY_LEVEL: Record<string, number> = {
  'Epic':                0,
  'Feature':             1,
  // Standard work items
  'Story':               2,
  'Task':                2,
  'QA Bug':              2,
  'Defect':              2,
  'Production Incident': 2,
  'Change Request':      2,
  'Business Gap':        2,
  'API Requirement':     2,
  // Subtask family (level 3 = leaf children of Stories/Tasks)
  'Sub-task':            3,
  'Frontend':            3,
  'Backend':             3,
  'Integration':         3,
};

const _unknownTypeLog = new Set<string>();

/**
 * Returns the Catalyst category for a Jira issue type.
 * Unknown types return 'unknown' and are logged once — they are NOT dropped.
 */
export function getJiraTypeCategory(issueType: string): CatalystTypeCategory {
  const cat = JIRA_TYPE_CATEGORY_MAP[issueType];
  if (cat) return cat;
  if (!_unknownTypeLog.has(issueType)) {
    _unknownTypeLog.add(issueType);
    console.warn(
      `[jiraTypeNormalizer] Unknown Jira issue type "${issueType}" — classified as 'unknown'. ` +
      'Add to JIRA_TYPE_CATEGORY_MAP to protect it.'
    );
  }
  return 'unknown';
}

/**
 * Returns hierarchy level for use in wh-jira-sync when wh_config.hierarchy_levels is absent.
 * Subtask family = 3. Feature = 1. Epic = 0. Everything else (including unknown) = 2.
 */
export function getJiraHierarchyLevel(issueType: string): number {
  return JIRA_TYPE_HIERARCHY_LEVEL[issueType] ?? 2;
}

/** True if issueType belongs to the subtask family (Sub-task / Frontend / Backend / Integration). */
export function isSubtaskFamily(issueType: string): boolean {
  return getJiraTypeCategory(issueType) === 'subtask';
}
