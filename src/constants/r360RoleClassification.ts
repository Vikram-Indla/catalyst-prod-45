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
  'devops',
  'infrastructure engineer',
  'mobile developer',
  'n&s engineer',
  'react developer',
  'react lead',
  'service engineer',
  'support engineer',
]);

/** Check if a role is a developer role (case-insensitive) */
export function isDeveloperRole(roleName: string): boolean {
  return DEVELOPER_ROLES.has(roleName.toLowerCase());
}

/** Check if a role is a contributor role (non-developer) */
export function isContributorRole(roleName: string): boolean {
  return !isDeveloperRole(roleName);
}
