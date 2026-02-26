/**
 * R360 Role Classification
 * Determines whether a role sees only assigned items (Developer)
 * or also contributed-to items where they are the reporter (Contributor).
 */

/** Developer roles — only see items assigned to them */
export const DEVELOPER_ROLES = new Set([
  '.net developer',
  '.net lead',
  'backend architect',
  'backend developer',
  'data engineer',
  'database engineer',
  'db engineer',
  'devops',
  'infrastructure engineer',
  'mobile developer',
  'n&s engineer',
  'react developer',
  'react lead',
  'service engineer',
  'support engineer',
]);

/** Contributor roles — see assigned + reported items */
export const CONTRIBUTOR_ROLES = new Set([
  'ba',
  'business analyst',
  'delivery manager',
  'ea',
  'enterprise architect',
  'pmo',
  'product owner',
  'project manager',
  'pm',
  'qa tester',
  'solutions architect',
  'technical po',
  'ux designer',
]);

/** Check if a role is a developer role (case-insensitive, partial match) */
export function isDeveloperRole(roleName: string): boolean {
  if (!roleName) return false;
  const lower = roleName.toLowerCase();
  return DEVELOPER_ROLES.has(lower) || [...DEVELOPER_ROLES].some(r => lower.includes(r));
}

/** Check if a role is a contributor role (non-developer) */
export function isContributorRole(roleName: string): boolean {
  return !isDeveloperRole(roleName);
}

/** Get the issue filter strategy based on role */
export function getIssueFilterStrategy(roleName: string): 'assigned' | 'assigned+reported' {
  return isDeveloperRole(roleName) ? 'assigned' : 'assigned+reported';
}
