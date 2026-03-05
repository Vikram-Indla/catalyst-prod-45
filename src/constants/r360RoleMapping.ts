/**
 * Maps resource_inventory.role_name → r360_role_benchmarks.role_code
 * Uses fuzzy matching for flexibility.
 */

const ROLE_MAP: [RegExp, string][] = [
  // R01 — Technical Product Owner
  [/\b(technical\s+)?product\s+owner\b/i, 'R01'],
  [/\btpo\b/i, 'R01'],
  // R02 — React Developer
  [/\breact\b/i, 'R02'],
  [/\bfrontend\b/i, 'R02'],
  [/\bfront[- ]end\b/i, 'R02'],
  // R03 — Backend Developer
  [/\bbackend\b/i, 'R03'],
  [/\b\.net\b/i, 'R03'],
  [/\bdata\s+engineer\b/i, 'R03'],
  [/\bdb\s+engineer\b/i, 'R03'],
  [/\bdatabase\b/i, 'R03'],
  // R04 — QA Engineer
  [/\bqa\b/i, 'R04'],
  [/\btest(er|ing)?\b/i, 'R04'],
  [/\bquality\b/i, 'R04'],
  // R05 — Delivery Manager
  [/\bdelivery\s+manager\b/i, 'R05'],
  [/\bproject\s+manager\b/i, 'R05'],
  [/\bpm\b/i, 'R05'],
  [/\bpmo\b/i, 'R05'],
  // R06 — Business Analyst
  [/\bbusiness\s+analyst\b/i, 'R06'],
  [/\bba\b/i, 'R06'],
  [/\bsolutions?\s+architect\b/i, 'R06'],
  [/\benterprise\s+architect\b/i, 'R06'],
  // R07 — DevOps Engineer
  [/\bdevops\b/i, 'R07'],
  [/\binfrastructure\b/i, 'R07'],
  [/\brelease\s+engineer\b/i, 'R07'],
  [/\bn&s\s+engineer\b/i, 'R07'],
  [/\bservice\s+engineer\b/i, 'R07'],
  [/\bsupport\s+engineer\b/i, 'R07'],
  // R08 — UX Designer
  [/\bux\b/i, 'R08'],
  [/\bdesigner\b/i, 'R08'],
  // R09 — Scrum Master
  [/\bscrum\b/i, 'R09'],
  [/\brelease\s+lead\b/i, 'R09'],
  // R10 — Engineering Manager
  [/\bengineering\s+manager\b/i, 'R10'],
  [/\bteam\s+lead\b/i, 'R10'],
  [/\blead\b/i, 'R10'],
];

/**
 * Resolve role_name string to a benchmark role code.
 * Falls back to 'R02' (Developer) if no match.
 */
export function resolveRoleCode(roleName: string | null | undefined): string {
  if (!roleName) return 'R02';
  for (const [pattern, code] of ROLE_MAP) {
    if (pattern.test(roleName)) return code;
  }
  // Default to developer for unmatched roles
  return 'R02';
}

/** Primary artifact descriptions per role code for narrative text */
export const ROLE_PRIMARY_ARTIFACTS: Record<string, string[]> = {
  R01: ['stories authored', 'epic ownership'],
  R02: ['story closure rate', 'incident resolution'],
  R03: ['story closure rate', 'incident resolution'],
  R04: ['bugs raised', 'QA coverage'],
  R05: ['tasks managed', 'risk coordination'],
  R06: ['stories authored', 'epic definition'],
  R07: ['subtask closure', 'incident SLA'],
  R08: ['stories authored', 'epic contribution'],
  R09: ['task coordination', 'release participation'],
  R10: ['task oversight', 'cross-project span'],
};
