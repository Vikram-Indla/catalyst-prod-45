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
    id: 'overview',
    label: 'Overview',
    iconName: 'LayoutDashboard',
    path: '/admin/overview',
  },
  {
    id: 'users-access',
    label: 'Users & Access',
    iconName: 'Users',
    path: '/admin/users-access',
    children: [
      { label: 'Access Management', path: '/admin/access' },
      { label: 'Resource Roster', path: '/admin/user-access' },
      { label: 'Resource Names', path: '/admin/users' },
      { label: 'Resource Roles', path: '/admin/roles-permissions' },
      // 'Jira User Sync' DEPRECATED 2026-05-19 — superseded by
      // /admin/jira/user-mapping (canonical). The /admin/jira-user-sync
      // route still exists temporarily and 301-redirects there.
      { label: 'Resource Departments', path: '/admin/capacity-departments' },
      { label: 'Resource Assignments', path: '/admin/resource-assignments' },
    ],
  },
  {
    id: 'general',
    label: 'General',
    iconName: 'Settings',
    path: '/admin/general',
    children: [
      { label: 'Modules & Packages', path: '/admin/modules-packages' },
      { label: 'Notification Settings', path: '/admin/settings/notifications' },
      { label: 'Notification Triggers', path: '/admin/notification-triggers' },
    ],
  },
  {
    id: 'design-system',
    label: 'Design system',
    iconName: 'Palette',
    path: '/admin/design-system',
    children: [
      { label: 'Design Governance', path: '/admin/design-system' },
      { label: 'Components', path: '/admin/components' },
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
    id: 'field-configuration',
    label: 'Field Configuration',
    iconName: 'Database',
    path: '/admin/field-configuration',
    children: [
      { label: 'Projects', path: '/admin/programs' },
      { label: 'Programs', path: '/admin/portfolios' },
      { label: 'Departments', path: '/admin/departments' },
      { label: 'Business Owners', path: '/admin/business-owners' },
      { label: 'Product Lines', path: '/admin/product-settings' },
      { label: 'Strategic Themes', path: '/admin/theme-groups' },
      { label: 'BR Status', path: '/admin/business/ProcessStep' },
      { label: 'Theme Status', path: '/admin/business/ThemeStatus' },
      { label: 'Epic Status', path: '/admin/business/EpicStatus' },
      { label: 'Feature Status', path: '/admin/business/FeatureStatus' },
    ],
  },
  {
    // 2026-05-19 — Section renamed from "WorkHub" to "Jira". Every leaf
    // under this pocket is a Jira-integration setting; "WorkHub" was a
    // historical codename that confused users.
    //
    // Three duplicate sync pages were folded into the single "Sync & logs"
    // entry below: 'Jira Sync Control' and 'Jira Activity Sync' (both
    // overlapping with Sync & logs) are deprecated. Their routes still
    // resolve temporarily and redirect to /admin/jira/sync-logs.
    id: 'jira',
    label: 'Jira',
    iconName: 'Cable',
    path: '/admin/jira',
    children: [
      { label: 'Connection', path: '/admin/workhub/jira-connection' },
      { label: 'Hierarchy mapping', path: '/admin/workhub/hierarchy-mapping' },
      { label: 'Status mapping', path: '/admin/workhub/status-mapping' },
      { label: 'User mapping', path: '/admin/workhub/user-mapping' },
      { label: 'Data scope', path: '/admin/workhub/data-scope' },
      { label: 'Scheduling rules', path: '/admin/workhub/scheduling-rules' },
      { label: 'Sync & logs', path: '/admin/workhub/sync-logs' },
    ],
  },
  {
    id: 'developer',
    label: 'Developer',
    iconName: 'Code2',
    path: '/admin/feature-flags',
    children: [
      { label: 'Feature Flags', path: '/admin/feature-flags' },
      { label: 'Catalyst Features', path: '/admin/catalyst-features' },
    ],
  },
];

/**
 * Canonical list of registered /admin/* routes.
 * Must match FullAppRoutes.tsx exactly.
 * The sidebar parity test enforces: every leaf path in adminPockets ⊆ REGISTERED_ADMIN_ROUTES.
 */
export const REGISTERED_ADMIN_ROUTES = new Set([
  '/admin/overview',
  '/admin/users',
  '/admin/roles-permissions',
  // '/admin/jira-user-sync' — DEPRECATED 2026-05-19; redirects to
  //   /admin/workhub/user-mapping. Kept out of the canonical set so the
  //   parity test stops surfacing it as a sidebar leaf.
  '/admin/capacity-departments',
  '/admin/resource-assignments',
  '/admin/user-access',
  '/admin/access',
  '/admin/modules-packages',
  '/admin/settings/notifications',
  '/admin/notification-triggers',
  '/admin/design-system',
  '/admin/icons',
  '/admin/avatars',
  '/admin/components',
  '/admin/workflows',
  '/admin/programs',
  '/admin/portfolios',
  '/admin/departments',
  '/admin/business-owners',
  '/admin/product-settings',
  '/admin/theme-groups',
  '/admin/business/ProcessStep',
  '/admin/business/ThemeStatus',
  '/admin/business/EpicStatus',
  '/admin/business/FeatureStatus',
  '/admin/workhub/jira-connection',
  // '/admin/workhub/jira-sync-control' — DEPRECATED 2026-05-19; merged
  //   into /admin/workhub/sync-logs.
  '/admin/workhub/hierarchy-mapping',
  '/admin/workhub/scheduling-rules',
  '/admin/workhub/status-mapping',
  '/admin/workhub/user-mapping',
  '/admin/workhub/data-scope',
  '/admin/workhub/sync-logs',
  // '/admin/workhub/activity-sync' — DEPRECATED 2026-05-19; merged into
  //   /admin/workhub/sync-logs.
  '/admin/feature-flags',
  '/admin/catalyst-features',
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
