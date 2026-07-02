/**
 * Canonical URL builders for all Catalyst routes.
 *
 * Rules:
 * - Every route that takes a dynamic segment has a builder here.
 * - Builders accept slugs/keys, not UUIDs (except for legacy-compat overloads marked _legacy).
 * - No bare string concatenation of IDs in navigation call sites — import from here instead.
 * - When a new table gets a route, register its builder here before wiring the route.
 *
 * Slug contract: slugs are frozen on entity creation (not renamed with the entity).
 * UUID-based URLs redirect to slug URLs via UuidToSlugRedirect (mounted outside CatalystShell).
 */

// ---------------------------------------------------------------------------
// Project Hub
// ---------------------------------------------------------------------------

export const projectHubRoutes = {
  root: () => '/project-hub',
  projects: () => '/project-hub/projects',
  dashboard: (projectKey: string) => `/project-hub/${projectKey}/dashboard`,
  backlog: (projectKey: string) => `/project-hub/${projectKey}/backlog`,
  backlogItem: (projectKey: string, issueKey: string) =>
    `/project-hub/${projectKey}/backlog/${issueKey}`,
  allWork: (projectKey: string) => `/project-hub/${projectKey}/allwork`,
  boards: (projectKey: string) => `/project-hub/${projectKey}/boards`,
  board: (projectKey: string, boardSlug: string) =>
    `/project-hub/${projectKey}/boards/${boardSlug}`,
  boardMapStatuses: (projectKey: string, boardSlug: string) =>
    `/project-hub/${projectKey}/boards/${boardSlug}/map-statuses`,
  boardSettings: (projectKey: string, boardSlug: string, section?: string) =>
    section
      ? `/project-hub/${projectKey}/boards/${boardSlug}/settings/${section}`
      : `/project-hub/${projectKey}/boards/${boardSlug}/settings`,
  sprints: (projectKey: string) => `/project-hub/${projectKey}/sprints`,
  sprint: (projectKey: string, sprintSlug: string) =>
    `/project-hub/${projectKey}/sprints/${sprintSlug}`,
  sprintWork: (projectKey: string, sprintSlug: string) =>
    `/project-hub/${projectKey}/sprints/${sprintSlug}/work`,
  roadmaps: (projectKey: string) => `/project-hub/${projectKey}/roadmaps`,
  roadmap: (projectKey: string, roadmapSlug: string) =>
    `/project-hub/${projectKey}/roadmaps/${roadmapSlug}`,
  timeline: (projectKey: string) => `/project-hub/${projectKey}/timeline`,
  timelineItem: (projectKey: string, issueKey: string) =>
    `/project-hub/${projectKey}/timeline/${issueKey}`,
  filters: (projectKey: string) => `/project-hub/${projectKey}/filters`,
  filterCreate: (projectKey: string) => `/project-hub/${projectKey}/filters/create`,
  filter: (projectKey: string, filterSlug: string) =>
    `/project-hub/${projectKey}/filters/${filterSlug}`,
  settings: (projectKey: string) => `/project-hub/${projectKey}/settings`,
  story: (projectKey: string, itemId: string) =>
    `/project-hub/${projectKey}/story/${itemId}`,
  resource360: (resourceId: string) => `/project-hub/resource-360/${resourceId}`,
};

// ---------------------------------------------------------------------------
// Product Hub
// ---------------------------------------------------------------------------

export const productHubRoutes = {
  root: () => '/product-hub',
  products: () => '/product-hub/products',
  dashboard: (productKey: string) => `/product-hub/${productKey}/dashboard`,
  backlog: (productKey: string) => `/product-hub/${productKey}/backlog`,
  backlogItem: (productKey: string, issueKey: string) =>
    `/product-hub/${productKey}/backlog/${issueKey}`,
  allWork: (productKey: string) => `/product-hub/${productKey}/allwork`,
  boards: (productKey: string) => `/product-hub/${productKey}/boards`,
  board: (productKey: string, boardSlug: string) =>
    `/product-hub/${productKey}/boards/${boardSlug}`,
  roadmaps: (productKey: string) => `/product-hub/${productKey}/roadmaps`,
  roadmap: (productKey: string, roadmapSlug: string) =>
    `/product-hub/${productKey}/roadmaps/${roadmapSlug}`,
  timeline: (productKey: string) => `/product-hub/${productKey}/timeline`,
  timelineItem: (productKey: string, issueKey: string) =>
    `/product-hub/${productKey}/timeline/${issueKey}`,
  milestones: (productKey: string) => `/product-hub/${productKey}/milestones`,
  milestone: (productKey: string, milestoneSlug: string) =>
    `/product-hub/${productKey}/milestones/${milestoneSlug}`,
  filters: (productKey: string) => `/product-hub/${productKey}/filters`,
  filterCreate: (productKey: string) => `/product-hub/${productKey}/filters/create`,
  filter: (productKey: string, filterSlug: string) =>
    `/product-hub/${productKey}/filters/${filterSlug}`,
  releases: (productKey: string) => `/product-hub/${productKey}/releases`,
  settings: (productKey: string) => `/product-hub/${productKey}/settings`,
  standups: (productKey: string) => `/product-hub/${productKey}/standups`,
  dependencies: (productKey: string) => `/product-hub/${productKey}/dependencies`,
};

// ---------------------------------------------------------------------------
// Release Hub
// ---------------------------------------------------------------------------

export const releaseHubRoutes = {
  root: () => '/release-hub',
  overview: () => '/release-hub/overview',
  releases: () => '/release-hub/releases-management',
  release: (releaseSlug: string) => `/release-hub/${releaseSlug}`,
  releaseManagement: (releaseSlug: string) =>
    `/release-hub/releases-management/${releaseSlug}`,
  releaseWork: (releaseSlug: string) =>
    `/release-hub/releases-management/${releaseSlug}/work`,
  changes: () => '/release-hub/changes',
  change: (changeSlug: string) => `/release-hub/changes/${changeSlug}`,
  filters: () => '/release-hub/filters',
  filterCreate: () => '/release-hub/filters/create',
  filter: (filterSlug: string) => `/release-hub/filters/${filterSlug}`,
};

// ---------------------------------------------------------------------------
// Test Hub
// ---------------------------------------------------------------------------

export const testHubRoutes = {
  root: () => '/testhub',
  dashboard: () => '/testhub/dashboard',
  myWork: () => '/testhub/my-work',
  board: () => '/testhub/board',
  repository: () => '/testhub/repository',
  cycles: () => '/testhub/cycles',
  cycle: (cycleSlug: string) => `/testhub/cycles/${cycleSlug}`,
  cycleExecute: (cycleSlug: string) => `/testhub/cycles/${cycleSlug}/execute`,
  sets: () => '/testhub/sets',
  set: (setSlug: string) => `/testhub/sets/${setSlug}`,
  reports: () => '/testhub/reports',
  // Reports hub — slug is a REPORT_REGISTRY id (CAT-REPORTS-HUB-20260703-001)
  report: (slug: string) => `/testhub/reports/${slug}`,
  filters: () => '/testhub/filters',
  filterCreate: () => '/testhub/filters/create',
  filter: (filterSlug: string) => `/testhub/filters/${filterSlug}`,
  timeline: () => '/testhub/timeline',
  defects: () => '/testhub/defects',
  traceability: () => '/testhub/traceability',
};

// ---------------------------------------------------------------------------
// Incident Hub
// ---------------------------------------------------------------------------

export const incidentHubRoutes = {
  root: () => '/incident-hub',
  dashboard: () => '/incident-hub/dashboard',
  all: () => '/incident-hub/all-incidents',
  board: () => '/incident-hub/board',
  // incidentKey is the display key e.g. "INC-42" — no UUID in URL
  detail: (incidentKey: string) => `/incident-hub/view/${incidentKey}`,
  work: () => '/incident-hub/work',
  analytics: () => '/incident-hub/analytics',
  timeline: () => '/incident-hub/timeline',
  dependencies: () => '/incident-hub/dependencies',
  filters: () => '/incident-hub/filters',
  filterCreate: () => '/incident-hub/filters/create',
  filter: (filterSlug: string) => `/incident-hub/filters/${filterSlug}`,
};

// ---------------------------------------------------------------------------
// Program / Team / Portfolio
// ---------------------------------------------------------------------------

export const programRoutes = {
  root: () => '/programs',
  detail: (programSlug: string) => `/program/${programSlug}`,
  board: (programSlug: string) => `/program/${programSlug}/kanban-boards`,
  kanbanBoard: (programSlug: string, boardSlug: string) =>
    `/program/${programSlug}/kanban-boards/${boardSlug}`,
};

export const teamRoutes = {
  root: () => '/teams',
  detail: (teamSlug: string) => `/team/${teamSlug}`,
};

export const portfolioRoutes = {
  detail: (portfolioSlug: string) => `/portfolio/${portfolioSlug}`,
};

// ---------------------------------------------------------------------------
// Tasks Hub
// ---------------------------------------------------------------------------

export const tasksRoutes = {
  root: () => '/tasks',
  overview: () => '/tasks/overview',
  list: () => '/tasks/list',
  listItem: (taskId: string) => `/tasks/list?taskId=${taskId}`,
  board: () => '/tasks/board',
  boardItem: (taskId: string) => `/tasks/board?task=${taskId}`,
  boardWorkstream: (workstreamSlug: string) =>
    `/tasks/board?workstream=${encodeURIComponent(workstreamSlug)}`,
  listWorkstream: (workstreamSlug: string) =>
    `/tasks/list?workstream=${encodeURIComponent(workstreamSlug)}`,
  calendar: () => '/tasks/calendar',
  calendarWorkstream: (workstreamSlug: string) =>
    `/tasks/calendar?workstream=${encodeURIComponent(workstreamSlug)}`,
  view: (taskKey: string) => `/tasks/view/${taskKey}`,
  filters: () => '/tasks/filters',
  filterCreate: () => '/tasks/filters/create',
  filter: (filterSlug: string) => `/tasks/filters/${filterSlug}`,
};

// ---------------------------------------------------------------------------
// Knowledge Hub
// ---------------------------------------------------------------------------

export const knowledgeHubRoutes = {
  root: () => '/knowledge-hub',
  space: (spaceSlug: string) => `/knowledge-hub/spaces/${spaceSlug}`,
  document: (documentSlug: string) => `/knowledge-hub/documents/${documentSlug}`,
};

// ---------------------------------------------------------------------------
// Work items / Browse
// ---------------------------------------------------------------------------

export const browseRoutes = {
  // issueKey is always a display key like "BAU-5389"
  issue: (issueKey: string) => `/browse/${issueKey}`,
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const adminRoutes = {
  root: () => '/admin',
  access: () => '/admin/access',
  workflows: () => '/admin/workflows',
  workflowVersions: () => '/admin/workflows/versions',
  connections: () => '/admin/connections',
  jira: () => '/admin/connections/jira',
  resource: (resourceId: string) => `/admin/resources/${resourceId}`,
};

// ---------------------------------------------------------------------------
// Top-level namespace export — import { Routes } from '@/lib/routes'
// ---------------------------------------------------------------------------

export const Routes = {
  projectHub: projectHubRoutes,
  productHub: productHubRoutes,
  releaseHub: releaseHubRoutes,
  testHub: testHubRoutes,
  incidentHub: incidentHubRoutes,
  program: programRoutes,
  team: teamRoutes,
  portfolio: portfolioRoutes,
  tasks: tasksRoutes,
  knowledgeHub: knowledgeHubRoutes,
  browse: browseRoutes,
  admin: adminRoutes,
} as const;
