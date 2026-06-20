/**
 * admin-nav.ts — Single source of truth for the admin sidebar IA.
 *
 * RULES (enforced by src/components/admin/__tests__/admin-sidebar-parity.test.ts):
 * 1. Every leaf path in adminPockets MUST be registered in REGISTERED_ADMIN_ROUTES.
 * 2. Run `npx vitest run src/components/admin/__tests__/admin-sidebar-parity.test.ts`
 *    after every change to either this file or FullAppRoutes.tsx.
 * 3. Section-level pocket paths (e.g. /admin/general) are IA labels only — do NOT
 *    add them to REGISTERED_ADMIN_ROUTES unless a real page backs them.
 */

export interface AdminNavChild {
  label: string;
  path: string;
}

export interface AdminNavPocket {
  id: string;
  label: string;
  /** icon: imported at component level, kept separate from this data module */
  iconName: string;
  /** Section-level path — used for active-state detection only. May not be a registered route. */
  path: string;
  children?: AdminNavChild[];
}

/** Canonical list of admin nav sections and their leaf routes. */
export const adminPockets: AdminNavPocket[] = [
  {
    id: 'users-access',
    label: 'Users & Access',
    iconName: 'Users',
    path: '/admin/users-access',
    children: [
      { label: 'Access Management', path: '/admin/access' },
      { label: 'Resource Departments', path: '/admin/capacity-departments' },
    ],
  },
  {
    id: 'design-system',
    label: 'Design system',
    iconName: 'Palette',
    path: '/admin/design-system',
    children: [
      // RESET ICONS — runtime asset override management. Admin-only.
      { label: 'Icons', path: '/admin/icons' },
      { label: 'Avatars', path: '/admin/avatars' },
    ],
  },
  {
    id: 'workflows',
    label: 'Workflows',
    iconName: 'GitBranch',
    path: '/admin/workflows',
    children: [
      { label: 'Status & Transitions', path: '/admin/workflows' },
    ],
  },
  {
    id: 'release-ops',
    label: 'Release Operations',
    iconName: 'Rocket',
    path: '/admin/release-ops',
  },
  {
    // 2026-06-21 — Generalised from "Jira" pocket to "Connections" so all
    // third-party integrations live under one section. Jira routes migrated
    // from /admin/workhub/* → /admin/connections/*. Slack, Notion, and Vercel
    // are placeholder pages (coming soon) wired and ready for future activation.
    id: 'connections',
    label: 'Connections',
    iconName: 'Cable',
    path: '/admin/connections',
    children: [
      { label: 'Jira', path: '/admin/connections/jira' },
      { label: 'Hierarchy mapping', path: '/admin/connections/jira/hierarchy' },
      { label: 'Slack', path: '/admin/connections/slack' },
      { label: 'Notion', path: '/admin/connections/notion' },
      { label: 'Vercel', path: '/admin/connections/vercel' },
    ],
  },
  {
    id: 'ai-governance',
    label: 'AI Governance',
    iconName: 'Sparkles',
    path: '/admin/ai-governance',
    children: [
      { label: 'Translation logs', path: '/admin/ai-governance/translations' },
    ],
  },
];

/**
 * Canonical list of registered /admin/* routes.
 * Must match FullAppRoutes.tsx exactly.
 * The sidebar parity test enforces: every leaf path in adminPockets ⊆ REGISTERED_ADMIN_ROUTES.
 */
export const REGISTERED_ADMIN_ROUTES = new Set([
  '/admin/capacity-departments',
  '/admin/access',
  '/admin/icons',
  '/admin/avatars',
  '/admin/workflows',
  '/admin/release-ops',
  '/admin/connections/jira',
  '/admin/connections/jira/hierarchy',
  '/admin/connections/slack',
  '/admin/connections/notion',
  '/admin/connections/vercel',
  '/admin/ai-governance/translations',
]);

/** Returns all leaf navigation paths (children only; section-level paths excluded). */
export function getAdminLeafPaths(): { label: string; path: string; section: string }[] {
  const result: { label: string; path: string; section: string }[] = [];
  for (const pocket of adminPockets) {
    if (pocket.children && pocket.children.length > 0) {
      for (const child of pocket.children) {
        result.push({ label: child.label, path: child.path, section: pocket.label });
      }
    } else {
      // Pocket is itself a leaf (e.g. Overview)
      result.push({ label: pocket.label, path: pocket.path, section: pocket.label });
    }
  }
  return result;
}
