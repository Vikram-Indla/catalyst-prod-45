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
  // Full-page test case authoring (CAT-TESTHUB-V2 slice C1). caseKey is the
  // display key, e.g. "TC-0012" — no UUID in URL.
  repositoryCase: (caseKey: string) => `/testhub/repository/case/${caseKey}`,
  plans: () => '/testhub/plans',
  // planKey is tm_test_plans.plan_key (e.g. "PL-001")
  plan: (planKey: string) => `/testhub/plans/${planKey}`,
  executions: () => '/testhub/executions',
  // executionKey is tm_test_executions.execution_key (e.g. "EX-001")
  execution: (executionKey: string) => `/testhub/executions/${executionKey}`,
  // runKey routes to the run player scoped by cycle (cycle_key + run number)
  run: (cycleKey: string, runNumber: number | string) =>
    `/testhub/cycles/${cycleKey}/runs/${runNumber}`,
  cycles: () => '/testhub/cycles',
  cycle: (cycleSlug: string) => `/testhub/cycles/${cycleSlug}`,
  cycleExecute: (cycleSlug: string) => `/testhub/cycles/${cycleSlug}/execute`,
  // Retrospective, read-only detail of a cycle's completed run(s)
  // (CAT-TESTHUB-REBUILD Phase 3b). cycleSlug is the cycle_key (e.g. "CY-001").
  cycleRuns: (cycleSlug: string) => `/testhub/cycles/${cycleSlug}/runs`,
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
  defect: (defectKey: string) => `/testhub/defects/${defectKey}`,
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
  // Production-incident report (CAT-REPORTS-HUB-20260703-001 Phase 2 Lane C)
  reports: () => '/incident-hub/reports',
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
// Folio — Catalyst Pages (CAT-DOCS-NOTION-20260704-001)
// Workspaces per project/product/organization; pages addressed by slug.
// Renamed from /wiki 2026-07-05 (Vikram): /wiki belongs to the restored
// knowledge-base hub on main. Renamed Docex → Folio 2026-07-06 (Vikram:
// "Go for folio"). Legacy /docex/* URLs redirect in FullAppRoutes.
// ---------------------------------------------------------------------------

export const folioRoutes = {
  root: () => '/folio',
  search: () => '/folio/search',
  sitemap: () => '/folio/sitemap',
  workspace: (workspaceSlug: string) => `/folio/${workspaceSlug}`,
  page: (workspaceSlug: string, pageSlug: string) => `/folio/${workspaceSlug}/${pageSlug}`,
  database: (workspaceSlug: string, dbSlug: string) => `/folio/${workspaceSlug}/db/${dbSlug}`,
};

/** @deprecated alias — callsites migrating to Routes.folio */
export const docexRoutes = folioRoutes;

/** @deprecated alias — callsites migrating to Routes.folio */
export const wikiRoutes = folioRoutes;

// ---------------------------------------------------------------------------
// Work items / Browse
// ---------------------------------------------------------------------------

export const browseRoutes = {
  // issueKey is always a display key like "BAU-5389"
  issue: (issueKey: string) => `/browse/${issueKey}`,
};

// ---------------------------------------------------------------------------
// STRATA (CAT-STRATA-20260705-001) — strategy execution & value realization
// ---------------------------------------------------------------------------

export const strataRoutes = {
  root: () => '/strata',
  strategy: () => '/strata/strategy',
  strategyMap: () => '/strata/strategy/map',
  scorecards: () => '/strata/scorecards',
  scorecard: (instanceSlug: string) => `/strata/scorecards/${instanceSlug}`,
  scorecardEvidence: (instanceSlug: string) => `/strata/scorecards/${instanceSlug}/evidence`,
  kpis: () => '/strata/kpis',
  kpi: (kpiSlug: string) => `/strata/kpis/${kpiSlug}`,
  kpiEvidence: (kpiSlug: string) => `/strata/kpis/${kpiSlug}/evidence`,
  execution: () => '/strata/execution',
  initiative: (initiativeSlug: string) => `/strata/execution/${initiativeSlug}`,
  portfolio: () => '/strata/portfolio',
  portfolioEvidence: (slug: string) => `/strata/portfolio/${slug}/evidence`,
  benefit: (benefitSlug: string) => `/strata/portfolio/benefits/${benefitSlug}`,
  data: () => '/strata/data',
  // Governed upload wizard (static slug-safe path — no params)
  upload: () => '/strata/data/upload',
  // runKey is the display key e.g. "RUN-1001" — no UUID in URL
  run: (runKey: string) => `/strata/data/runs/${runKey}`,
  reviews: () => '/strata/reviews',
  // snapshotKey is the display key e.g. "SNAP-1001"
  review: (snapshotKey: string) => `/strata/reviews/${snapshotKey}`,
  admin: () => '/strata/admin',
  adminSection: (section: string) => `/strata/admin/${section}`,
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
  folio: folioRoutes,
  /** @deprecated alias for folio */
  docex: docexRoutes,
  /** @deprecated alias for folio */
  wiki: wikiRoutes,
  browse: browseRoutes,
  admin: adminRoutes,
  strata: strataRoutes,
} as const;
