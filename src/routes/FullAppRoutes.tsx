import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";

function IssueRedirectToBrowse() {
  const { issueKey } = useParams();
  return <Navigate to={`/browse/${issueKey ?? ''}`} replace />;
}

import { ENABLE_AI, ENABLE_HEAVY_EXPORTS } from '../lib/featureFlags';
import { FeatureComingSoon } from '../components/common/FeatureComingSoon';
import { ModuleGate } from '../components/common/ModuleGate';
import { ModuleGuard } from '../components/guards/ModuleGuard';
import { ProtectedRoute } from "../components/ProtectedRoute";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { RouteRoleGuard } from "../components/RouteRoleGuard";

const GovernanceSettings = lazy(() => import("../pages/admin/GovernanceSettings"));
const AdminIconsPage = lazy(() => import("../pages/admin/icons/AdminIconsPage"));
const AdminAvatarsPage = lazy(() => import("../pages/admin/avatars/AdminAvatarsPage"));
const RoutingTaxonomyPageLazy = lazy(() => import("../pages/admin/RoutingTaxonomyPage"));
const WorkListPageLazy = lazy(() => import("../modules/project-work-hub/pages/BacklogPage.atlaskit"));

// ─── Lazy page imports ───────────────────────────────────────────
const KBAdminSetup = ENABLE_AI ? lazy(() => import("../pages/KBAdminSetup")) : () => <FeatureComingSoon title="KB Admin" />;
const KBDataAuditPage = ENABLE_AI ? lazy(() => import("../pages/KBDataAudit")) : () => <FeatureComingSoon title="KB Data Audit" />;
const RAGAuditPage = ENABLE_AI ? lazy(() => import("../pages/RAGAuditPage")) : () => <FeatureComingSoon title="RAG Audit" />;
// JiraActivitySyncPage + JiraSyncControlPage DEPRECATED 2026-05-19 —
// merged into /admin/workhub/sync-logs. The route entries above are now
// pure redirects, so the page imports are no longer needed. Files remain
// in src/pages/admin/ until a follow-up cleanup commit removes them.

const Resource360PageNew = lazy(() => import("../components/resource360/Resource360PageNew"));
const Resource360MemberDetail = lazy(() => import("../pages/Resource360MemberDetail"));
const ResourceListingPageLazy = lazy(() => import("../pages/ResourceListingPage"));
const R360MemberDetailLazy = lazy(() => import("../pages/R360MemberDetail"));
const R360ProfilePageLazy = lazy(() => import("../pages/R360ProfilePage"));
const MyResource360PageLazy = lazy(() => import("../pages/MyResource360Page"));
const MyTeamPageLazy = lazy(() => import("../pages/MyTeamPage"));

// ProjectHub V5
const ProjectListPageLazy = lazy(() => import("../pages/project-hub/ProjectListPage"));
const ProjectDashboardPageLazy = lazy(() => import("../pages/project-hub/ProjectDashboardPage"));
const StandupHistoryPageLazy = lazy(() => import("../pages/standups/StandupHistoryPage"));
const PHProjectSettingsPageLazy = lazy(() => import("../pages/project-hub/ProjectSettingsPage"));
const ProjectBoardManagerPageLazy = lazy(() => import("../pages/project-hub/ProjectBoardManagerPage"));
const ProjectBoardSettingsPageLazy = lazy(() => import("../pages/project-hub/ProjectBoardSettingsPage"));
// KanbanBoardPage (legacy /boards/:id view) deprecated → LegacyBoardRedirect.
const KanbanFeaturePageLazy = lazy(() => import("../features/kanban-board/KanbanPage"));
const FilterRoadmapPageLazy = lazy(() => import("../pages/project-hub/FilterRoadmapPage"));
const FilterDashboardPageLazy = lazy(() => import("../pages/project-hub/FilterDashboardPage"));
const MapStatusesPageLazy = lazy(() => import("../pages/project-hub/MapStatusesPage"));
const AllProjectsPageLazy = lazy(() => import("../pages/project-hub/AllProjectsPage"));
const UnifiedBacklogPageLazy = lazy(() => import("../modules/project-work-hub/pages/BacklogPage.atlaskit"));
const BacklogDetailPageLazy = lazy(() => import("../modules/project-work-hub/pages/BacklogDetailPage"));
const AllWorkDetailPageLazy = lazy(() => import("../modules/project-work-hub/pages/AllWorkDetailPage"));
const TimelineDetailPageLazy = lazy(() => import("../pages/project-hub/timeline/TimelineDetailPage"));
const FiltersListPageLazy = lazy(() => import("../pages/project-hub/filters/FiltersListPage"));
const RoadmapsListPageLazy = lazy(() => import("../pages/project-hub/roadmaps/RoadmapsListPage"));
const FilterDetailPageLazy = lazy(() => import("../pages/project-hub/filters/FilterDetailPage"));
const FilterPreviewPageLazy = lazy(() => import("../pages/project-hub/filters/FilterPreviewPage").then(m => ({ default: m.FilterPreviewPage })));
const StoryDetailPageLazy = lazy(() => import("../pages/project-hub/StoryDetailPage"));
const ProjectJiraLayoutLazy = lazy(() => import("../pages/project-hub/jira-list/ProjectJiraLayout"));
const ReleasesPageLazy = lazy(() => import("../pages/project-hub/ReleasesPage").then(m => ({ default: m.ReleasesPage })));
const ReleasesPageWrapperLazy = lazy(() => import("../pages/project-hub/ReleasesPageWrapper").then(m => ({ default: m.ReleasesPageWrapper })));
const MilestonesPageLazy = lazy(() => import("../pages/product-hub/MilestonesPage").then(m => ({ default: m.MilestonesPage })));
const MilestoneDetailPageLazy = lazy(() => import("../pages/product-hub/MilestoneDetailPage").then(m => ({ default: m.MilestoneDetailPage })));
const ReleaseDetailPageLazy = lazy(() => import("../pages/release-hub/ReleaseDetailPage").then(m => ({ default: m.ReleaseDetailPage })));
const ReleaseWorkNavigatorPageLazy = lazy(() => import("../pages/release-hub/ReleaseWorkNavigatorPage").then(m => ({ default: m.ReleaseWorkNavigatorPage })));
const DependenciesPageLazy = lazy(() => import("../pages/project-hub/DependenciesPage"));
const ProductDependenciesPageLazy = lazy(() => import("../pages/product-hub/ProductDependenciesPage"));
const IncidentHubDependenciesPageLazy = lazy(() => import("../pages/incidenthub/IncidentHubDependenciesPage"));
// 2026-06-26: Sprints — project-hub clone of release-hub releases-management.
const SprintsPageLazy = lazy(() => import("../pages/project-hub/SprintsPage").then(m => ({ default: m.SprintsPage })));
const SprintDetailPageLazy = lazy(() => import("../pages/project-hub/SprintDetailPage").then(m => ({ default: m.SprintDetailPage })));
const SprintWorkNavigatorPageLazy = lazy(() => import("../pages/project-hub/SprintWorkNavigatorPage").then(m => ({ default: m.SprintWorkNavigatorPage })));

const PHPlaceholderBase = lazy(() => import("../pages/project-hub/PhasePlaceholderPage"));

function PHPlaceholder({ title, phase }: { title: string; phase: string }) {
  const PH_DESCRIPTIONS_MAP: Record<string, string> = {
    Backlog: 'Sprint backlog with drag-and-drop prioritization.',
    Board: 'Kanban board with customizable swim lanes.',
    List: 'Flat list view with inline editing and bulk actions.',
    Timeline: 'Gantt-style timeline with dependency tracking.',
    Releases: 'Release planning and version management.',
    Reports: 'Velocity charts, burn-down, and team analytics.',
    'Sprint Predictor': 'AI-powered sprint completion predictions.',
    'Risk Scanner': 'AI-driven risk detection and mitigation.',
  };
  return <Suspense fallback={<div style={{ padding: 32 }}>Loading...</div>}><PHPlaceholderBase title={title} phase={phase} description={PH_DESCRIPTIONS_MAP[title] || `Coming in ${phase}`} /></Suspense>;
}

const ProductionEventsPageLazy = lazy(() => import("../pages/releasehub/ProductionEventsPage"));
const RH21CommandCenterPage = lazy(() => import("../pages/releasehub/CommandCenterPage"));
const RH21AllReleasesPage = lazy(() => import("../pages/releasehub/AllReleasesPage"));
const ReleaseBoardCanonical = lazy(() => import("../pages/releasehub/ReleaseBoardCanonical"));
const ReleasesWorkCanonical = lazy(() => import("../pages/releasehub/ReleasesWorkCanonical"));
const ReleaseFiltersListPage = lazy(() => import("../pages/releasehub/ReleaseFiltersListPage"));
const ReleaseFilterPreviewPage = lazy(() => import("../pages/releasehub/ReleaseFilterPreviewPage"));
const ReleaseFilterDetailPage = lazy(() => import("../pages/releasehub/ReleaseFilterDetailPage"));
const ReleasesTimelineCanonical = lazy(() => import("../pages/releasehub/ReleasesTimelineCanonical"));
const RH21AllChangesPage = lazy(() => import("../pages/releasehub/AllChangesPage"));
const RH21SignOffQueuePage = lazy(() => import("../pages/releasehub/SignOffQueuePage"));
const RH21FreezeWindowsPage = lazy(() => import("../pages/releasehub/FreezeWindowsPage"));

const StrategicThemesPage = lazy(() => import("../modules-dormant/strategyhub/StrategicThemesPage"));
const GoalsKeyResultsPage = lazy(() => import("../modules-dormant/strategyhub/GoalsKeyResultsPage"));
const RoadmapPage = lazy(() => import("../pages/producthub/RoadmapPage"));
const RequirementAssistWorkspace = ENABLE_AI ? lazy(() => import("../pages/producthub/requirement-assist/index")) : () => <FeatureComingSoon title="Requirement Assist" />;
const RequirementAssistCompose = ENABLE_AI ? lazy(() => import("../pages/producthub/requirement-assist/compose")) : () => <FeatureComingSoon title="Requirement Assist" />;
const RequirementAssistCategories = ENABLE_AI ? lazy(() => import("../pages/producthub/requirement-assist/categories")) : () => <FeatureComingSoon title="Requirement Assist" />;
const RequirementAssistOutput = ENABLE_AI ? lazy(() => import("../pages/producthub/requirement-assist/output")) : () => <FeatureComingSoon title="Requirement Assist" />;
// Block C/D (2026-05-01) — All Products listing for /product-hub/products.
const AllProductsPage = lazy(() => import("../pages/product-hub/AllProductsPage"));
// 2026-06-01: native product hub pages (business_requests data model)
// 2026-06-01: ProductBacklogPage reuses canonical BacklogPage via dataSource adapter
// (parallel ProductNativeBacklogPage was deleted to eliminate drift; gap of 30+
// features had accumulated from the imitation pattern).
const ProductBacklogPage = lazy(() => import("../pages/product-hub/ProductBacklogPage"));
const ProductBacklogDetailPage = lazy(() => import("../pages/product-hub/InvestorJourneyDetailPage"));
const ProductNativeBoardPage = lazy(() => import("../pages/product-hub/ProductNativeBoardPage"));
const ProductBoardManagerPage = lazy(() => import("../pages/product-hub/ProductBoardManagerPage"));
const ProductNativeAllWorkPage = lazy(() => import("../pages/product-hub/ProductNativeAllWorkPage"));
const IdeationPage = ENABLE_AI ? lazy(() => import("../pages/producthub/IdeationPage")) : () => <FeatureComingSoon title="Ideation" />;
const IdeasRoadmapPage = ENABLE_AI ? lazy(() => import("../pages/product/ideas/IdeasRoadmapPage")) : () => <FeatureComingSoon title="Ideas Roadmap" />;
const IdeasBacklogPage = ENABLE_AI ? lazy(() => import("../pages/producthub/IdeasBacklogPage")) : () => <FeatureComingSoon title="Ideas Backlog" />;
const IdeasBoardPage = ENABLE_AI ? lazy(() => import("../pages/producthub/IdeasBoardPage")) : () => <FeatureComingSoon title="Ideas Board" />;
const IdeasRoadmapPageNew = ENABLE_AI ? lazy(() => import("../pages/producthub/IdeasRoadmapPage")) : () => <FeatureComingSoon title="Ideas Roadmap" />;
const IdeasThemePage = ENABLE_AI ? lazy(() => import("../pages/producthub/IdeasThemePage")) : () => <FeatureComingSoon title="Ideas Theme" />;
const IdeasAnalyticsPage = ENABLE_AI ? lazy(() => import("../pages/producthub/IdeasAnalyticsPage")) : () => <FeatureComingSoon title="Ideas Analytics" />;
const ReqAssistLibrary = ENABLE_AI ? lazy(() => import("../pages/ReqAssistLibrary")) : () => <FeatureComingSoon title="Requirement Assist" />;
const ReqAssistGenerate = ENABLE_AI ? lazy(() => import("../pages/ReqAssistGenerate")) : () => <FeatureComingSoon title="Requirement Assist" />;

const IncidentHubListPage = lazy(() => import("../pages/incidenthub/IncidentListPage"));
const IncidentHubKanbanPage = lazy(() => import("../pages/incidenthub/IncidentKanbanPage"));
const IncidentHubWorkPage = lazy(() => import("../pages/incidenthub/IncidentWorkPage"));
const IncidentHubBoardPage = lazy(() => import("../pages/incidenthub/IncidentBoardPage"));
const IncidentHubFiltersListPage = lazy(() => import("../pages/incidenthub/IncidentFiltersListPage"));
const IncidentHubFilterPreviewPage = lazy(() => import("../pages/incidenthub/IncidentFilterPreviewPage"));
const IncidentHubFilterDetailPage = lazy(() => import("../pages/incidenthub/IncidentFilterDetailPage"));
const IncidentHubTimelinePage = lazy(() => import("../pages/incidenthub/IncidentTimelinePage"));
const IncidentHubDashboardPage = lazy(() => import("../pages/incidenthub/IncidentDashboardPage"));
const IncidentHubAnalyticsPage = lazy(() => import("../pages/incidenthub/IncidentAnalyticsPage"));
// Production Incident report (CAT-REPORTS-HUB-20260703-001 Phase 2 Lane C).
const IncidentHubReportPage = lazy(() => import("../modules/incidents/analytics/pages/IncidentReportPage"));
// Committee Queue — governance workflow (approve/veto) for incidents sent to committee.
// Revived 2026-07-03: distinct from the read-only Production Incident report above —
// this is an actionable surface, backed by the incidents/incident_committees/committee_votes
// extension schema (see incidents_extend_ph_issues migration).
const IncidentHubCommitteeQueuePage = lazy(() => import("../pages/incidenthub/CommitteeQueuePage"));
const IncidentHubDetailPage = lazy(() => import("../pages/incidenthub/IncidentDetailPage"));

// TestHub Admin
const TestAdminPrioritiesPage   = lazy(() => import("../pages/admin/test/TestPrioritiesPage"));
const TestAdminCaseTypesPage    = lazy(() => import("../pages/admin/test/TestCaseTypesPage"));
const TestAdminCaseStatusesPage = lazy(() => import("../pages/admin/test/TestCaseStatusesPage"));
const TestAdminRunStatusesPage  = lazy(() => import("../pages/admin/test/TestRunStatusesPage"));
const TestAdminPermissionsPage  = lazy(() => import("../pages/admin/test/TestPermissionsPage"));

// RBAC Admin — mock-safe mode (schema not yet deployed)
const RolesAdminPageLazy       = lazy(() => import("../pages/admin/RolesAdminPage"));
const PermissionsAdminPageLazy = lazy(() => import("../pages/admin/PermissionsAdminPage"));
const AiAccessPageLazy         = lazy(() => import("../pages/admin/AiAccessPage"));

// TestHub
const TestHubDashboardPage = lazy(() => import("../pages/testhub/DashboardPage"));
const TestHubMyWorkPage = lazy(() => import("../pages/testhub/MyWorkPage"));
const TestHubRepositoryPage = lazy(() => import("../pages/testhub/repository/RepositoryPage"));
const TestHubBoardPage = lazy(() => import("../pages/testhub/BoardPage"));
const TestHubFiltersListPage = lazy(() => import("../pages/testhub/FiltersListPage"));
const TestHubFilterPreviewPage = lazy(() => import("../pages/testhub/FilterPreviewPage"));
const TestHubFilterDetailPage = lazy(() => import("../pages/testhub/FilterDetailPage"));
const TestHubCyclesPage = lazy(() => import("../pages/testhub/cycles/CyclesPage"));
const TestHubCycleDetailPage = lazy(() => import("../pages/testhub/cycles/CycleDetailPage"));
const TestHubExecutionPage = lazy(() => import("../pages/testhub/cycles/ExecutionPage"));
const TestHubSetsPage = lazy(() => import("../pages/testhub/sets/TestSetsPage"));
const TestHubSetDetailPage = lazy(() => import("../pages/testhub/sets/SetDetailPage"));
const TestHubTraceabilityPage = lazy(() => import("../pages/testhub/traceability/TraceabilityPage"));
// Reports hub — single registry-driven surface (CAT-REPORTS-HUB-20260703-001 S1.2).
// Old standalone report URLs redirect below; the legacy page files were deleted in
// Phase 2 Lane A (bodies now live in src/components/testhub/reports/bodies/).
const TestHubReportsHubPage = lazy(() => import("../pages/testhub/reports/ReportsHubPage"));
const TestHubDefectsPage = lazy(() => import("../pages/testhub/DefectsPage"));
const TestHubTimelinePage = lazy(() => import("../pages/testhub/timeline/TestHubTimelinePage"));
const TestHubDependenciesPage = lazy(() => import("../pages/testhub/TestHubDependenciesPage"));

// Wiki module — DEPRECATED 2026-06-25
// All wiki routes removed; modules-dormant/wiki remains in codebase for historical reference.

const KnowledgeAssistFabLazy = ENABLE_AI ? lazy(() => import("../components/kb/KAFab").then(m => ({ default: m.KAFab }))) : () => null;

const ChatPageLazy = lazy(() => import("../pages/chat/ChatPage"));
const TeamRoutesShell = lazy(() => import("../routes/TeamRoutesShell").then(m => ({ default: m.TeamRoutes })));
const TeamsRoutesShell = lazy(() => import("../routes/TeamRoutesShell").then(m => ({ default: m.TeamsRoutes })));
const PortfolioRoutesShell = lazy(() => import("../routes/PortfolioRoutesShell").then(m => ({ default: m.PortfolioRoutes })));
const ProgramRoutesShell = lazy(() => import("../routes/ProgramRoutesShell").then(m => ({ default: m.ProgramRoutes })));
const ProgramsRoutesShell = lazy(() => import("../routes/ProgramRoutesShell").then(m => ({ default: m.ProgramsRoutes })));
const EnterpriseRoutesShell = lazy(() => import("../routes/EnterpriseRoutesShell").then(m => ({ default: m.EnterpriseRoutes })));

const BrowsePage = lazy(() => import("../pages/BrowsePage"));
const DependencyMapsPage = lazy(() => import("../pages/reports/DependencyMapsPage"));
const SearchPage = lazy(() => import("../pages/SearchPage"));
const PlaceholderPage = lazy(() => import("../pages/jira-align/PlaceholderPage"));
const StrategyRoom = lazy(() => import("../modules-dormant/strategy/StrategyRoom"));
const StrategyComingSoon = lazy(() => import("../modules-dormant/strategy/StrategyComingSoon"));
const CapacityPlannerPage = lazy(() => import("../pages/enterprise/CapacityPlannerPage"));
const BudgetPlannerPage = lazy(() => import("../pages/enterprise/BudgetPlannerPage"));

const Themes = lazy(() => import("../pages/Themes"));
const Initiatives = lazy(() => import("@/pages/Initiatives"));
const EpicsRecycleBinPage = lazy(() => import("../pages/items/EpicsRecycleBinPage"));
const EpicsCanceledPage = lazy(() => import("../pages/items/EpicsCanceledPage"));
const EpicStatusReport = lazy(() => import("../pages/items/reports/EpicStatusReport"));
const EpicTraceReport = lazy(() => import("../pages/items/reports/EpicTraceReport"));
const EpicRequirementHierarchy = lazy(() => import("../pages/items/reports/EpicRequirementHierarchy"));
const EpicResponsibilityMatrix = lazy(() => import("../pages/items/reports/EpicResponsibilityMatrix"));
const EpicPlanningPage = lazy(() => import("../pages/items/reports/EpicPlanningPage"));
const EpicEstimationPage = lazy(() => import("../pages/items/EpicEstimationPage"));
const Features = lazy(() => import("../pages/Features"));
const FeaturesPage = lazy(() => import("../pages/items/FeaturesPage"));
const FeaturesBacklog = lazy(() => import("../pages/FeaturesBacklog"));
const FeaturePrioritizationView = lazy(() => import("../pages/items/FeaturePrioritizationView"));
const FeatureDetailPage = lazy(() => import("../pages/project/FeatureDetailPage"));
const FeatureBacklogPage = lazy(() => import("../modules/feature-backlog/pages/FeatureBacklogPage"));
const ProjectWorkspace = lazy(() => import("../pages/project/ProjectWorkspace"));
const BoardView = lazy(() => import("../pages/project/BoardView"));
const TimelineView = lazy(() => import("../pages/project/TimelineView"));
const ProjectHubTimelinePage = lazy(() => import("../pages/project-hub/timeline/ProjectHubTimelinePage"));
const ProductHubTimelinePage = lazy(() => import("../pages/product-hub/timeline/ProductHubTimelinePage"));
const ProductTimelineDetailPage = lazy(() => import("../pages/product-hub/timeline/ProductTimelineDetailPage"));
const BoardManagerPage = lazy(() => import("../components/boards/BoardManagerPage"));
const BoardCanvasPage = lazy(() => import("../components/boards/BoardCanvasPage"));
// UserNotificationSettingsPage DEPRECATED 2026-06-20 — route removed
const PlannerPage = lazy(() => import("../modules/tasks").then(m => ({ default: m.PlannerPage })));
const TasksDetailPage = lazy(() => import("../modules/tasks/pages/TasksDetailPage"));
const KanbanPage = lazy(() => import("../modules/tasks").then(m => ({ default: m.KanbanPage })));
/* 2026-06-17: Tasks Hub filters — canonical FiltersListPage / FilterDetailPage
   / FilterPreviewPage mounted with hubType='tasks' / mode='tasks'. */
const TasksFiltersListPage = lazy(() => import("../modules/tasks/pages/TasksFiltersListPage"));
// CAT-TASKS-20260627-001 Slice 5: canonical Workstreams CRUD page (replaces the
// deprecated /tasks/workstreams 404).
const WorkstreamsManagerPage = lazy(() => import("../modules/tasks/components/workstreams/WorkstreamsManagerPage"));
const TasksFilterPreviewPage = lazy(() => import("../modules/tasks/pages/TasksFilterPreviewPage"));
const TasksFilterDetailPage = lazy(() => import("../modules/tasks/pages/TasksFilterDetailPage"));
const NotFound = lazy(() => import("../pages/NotFound"));


// Plan Hub module — DEPRECATED 2026-06-25
// All planhub routes removed; modules-dormant/planhub remains in codebase for historical reference.

const Tasks = lazy(() => import("../pages/Tasks"));
const Impediments = lazy(() => import("../pages/Impediments"));
const ReleaseVehicles = lazy(() => import("../pages/ReleaseVehicles"));
const SuccessCriteria = lazy(() => import("../pages/SuccessCriteria"));
const PortfolioKanban = lazy(() => import("../pages/PortfolioKanban"));
const PortfolioRoadmap = lazy(() => import("../pages/PortfolioRoadmap"));
const Roadmaps = lazy(() => import("../pages/Roadmaps"));
const DependenciesPage = lazy(() => import("../pages/work/Dependencies"));
const ProgramBoardHistory = lazy(() => import("../pages/ProgramBoardHistory"));
const PIObjectives = lazy(() => import("../pages/PIObjectives"));

const WorkSpendGrid = lazy(() => import("../pages/WorkSpendGrid"));
const RisksGridPage = lazy(() => import("../pages/risks/RisksGridPage"));
const RiskRoamReportPage = lazy(() => import("../pages/risks/RiskRoamReportPage"));
const TeamRoom = lazy(() => import("../pages/TeamRoom"));
const SprintBoard = lazy(() => import("../pages/SprintBoard"));
const Backlog = lazy(() => import("../pages/Backlog"));
const Sprints = lazy(() => import("../pages/Sprints"));
const Stories = lazy(() => import("../pages/Stories"));
const Subtasks = lazy(() => import("../pages/Subtasks"));
const EnterpriseComingSoon = lazy(() => import("../pages/enterprise/ComingSoon"));
const ReleaseDetailPage = lazy(() => import("../pages/releasehub/ReleaseDetailPage"));
const ChangeDetailPage = lazy(() => import("../pages/releasehub/ChangeDetailPage"));
const SopTemplatesPage = lazy(() => import("../pages/releasehub/SopTemplatesPage"));
const ReleaseCalendarPage = lazy(() => import("../pages/releasehub/ReleaseCalendarPage"));
const ReleaseSettingsPage = lazy(() => import("../pages/releasehub/ReleaseSettingsPage"));

const AdminLayout = lazy(() => import('../pages/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
// AdminGuard was used by /admin/v2 shell (deprecated 2026-05-09) — removed

const PlanResourcePlannerPage = lazy(() => import("../modules/plan/ResourcePlannerPage"));
const CapacityDepartmentsPage = lazy(() => import("../pages/admin/CapacityDepartments"));
const AdminAccessPage = lazy(() => import("../pages/admin/AdminAccessPage"));
const ReleaseOpsAdminPage = lazy(() => import("../pages/admin/ReleaseOpsAdminPage"));
const QuartersAdminPage = lazy(() => import("../pages/admin/QuartersAdminPage"));
const JiraSyncPage = lazy(() => import("../pages/admin/connections/JiraSyncPage").then(m => ({ default: m.JiraSyncPage })));
const WorkHubHierarchyPage = lazy(() => import("../modules/workhub/admin/pages/WorkHubHierarchyPage"));
// Connections hub — each integration gets a page under /admin/connections/*
const NotionConnectionPage = lazy(() => import("../pages/admin/connections/NotionConnectionPage"));
const VercelConnectionPage = lazy(() => import("../pages/admin/connections/VercelConnectionPage"));
// WorkHubSyncLogs DEPRECATED 2026-06-20 — route removed
const WorkflowAdminPage = lazy(() => import("../pages/admin/workflows/WorkflowAdminPage"));
const WorkflowVersioningPage = lazy(() => import("../pages/admin/workflows/WorkflowVersioningPage"));
const WorkflowStudioPage = lazy(() => import("../pages/admin/workflows/studio/WorkflowStudioPage"));
const WorkflowEditorPage = lazy(() => import("../pages/admin/workflows/studio/WorkflowEditorPage"));
const TestOpsPage = lazy(() => import("../pages/admin/test-ops/TestOpsPage"));
const AiTranslationsAuditPage = lazy(() => import("../pages/admin/AiTranslationsAuditPage"));
const AdminStorybookPage = lazy(() => import("../pages/admin/AdminStorybookPage").then(m => ({ default: m.AdminStorybookPage })));
const FieldRegistryPage = lazy(() => import("../pages/admin/FieldRegistryPage"));
const FieldLayoutPage = lazy(() => import("../pages/admin/FieldLayoutPage"));
// Incident admin routes deleted 2026-05-09 (Vikram decision: delete all 7)

const ValueStreamView = lazy(() => import("../pages/ValueStreamView"));
const UserProfile = lazy(() => import("../pages/UserProfile"));
const ArchiveManagerPage = lazy(() => import("../pages/ArchiveManagerPage"));
const ProgramDirectory = lazy(() => import("../pages/ProgramDirectory"));
const ProjectSettingsPage = lazy(() => import("../pages/ProjectSettingsPage"));
const ProjectWorkHubPage = lazy(() => import("../modules/project-work-hub/ProjectWorkHubPage").then(m => ({ default: m.ProjectWorkHubPage })));

const InJiraLayout = lazy(() => import("../modules/in-jira").then(m => ({ default: m.InJiraLayout })));
const InJiraSummaryPage = lazy(() => import("../modules/in-jira").then(m => ({ default: m.SummaryPage })));
const KanbanBoardPage = lazy(() => import("../modules/in-jira").then(m => ({ default: m.KanbanBoardPage })));
const ScrumBoardPage = lazy(() => import("../modules/in-jira").then(m => ({ default: m.ScrumBoardPage })));
const InJiraListPage = lazy(() => import("../modules/in-jira").then(m => ({ default: m.ListPage })));
const InJiraAllWorkPage = lazy(() => import("../modules/in-jira").then(m => ({ default: m.AllWorkPage })));
const InJiraReleasesPage = lazy(() => import("../modules/in-jira").then(m => ({ default: m.ReleasesPage })));
const ReleaseManagementPage = lazy(() => import("../modules/in-jira").then(m => ({ default: m.ReleaseManagementPage })));
const InJiraSettingsPage = lazy(() => import("../modules/in-jira").then(m => ({ default: m.InJiraSettingsPage })));

const ProjectComingSoonPage = lazy(() => import("../pages/projects/ProjectComingSoonPage"));
const ProjectBacklogPage = lazy(() => import("../pages/projects/ProjectBacklogPage"));

const SummaryView = lazy(() => import("../modules/work-hub/views/SummaryView").then(m => ({ default: m.SummaryView })));
const ListView = lazy(() => import("../modules/work-hub/views").then(m => ({ default: m.ListView })));
const AllWorkView = lazy(() => import("../modules/work-hub/views").then(m => ({ default: m.AllWorkView })));
const ReleasesView = lazy(() => import("../modules/work-hub/views").then(m => ({ default: m.ReleasesView })));
const ReleaseDetailsView = lazy(() => import("../modules/work-hub/views").then(m => ({ default: m.ReleaseDetailsView })));

const WorkHubLayout = lazy(() => import("../components/workhub/layout/WorkHubLayout").then(m => ({ default: m.WorkHubLayout })));
const WorkHubCatyPage = ENABLE_AI ? lazy(() => import("../components/workhub/caty/CatyPage").then(m => ({ default: m.CatyPage }))) : () => <FeatureComingSoon title="WorkHub AI" />;

const WorkTreePage = lazy(() => import("../pages/work-tree").then(m => ({ default: m.WorkTreePage })));
const SkillsInventory = ENABLE_HEAVY_EXPORTS ? lazy(() => import("../pages/SkillsInventory")) : () => <FeatureComingSoon title="Skills Inventory" />;
const StarredPage = lazy(() => import("../pages/StarredPage"));
const WorkHubAllWork = lazy(() => import("../pages/workhub/AllWork"));
const MiningComingSoon = lazy(() => import("../pages/enterprise/MiningComingSoon"));
const IndustryComingSoon = lazy(() => import("../pages/enterprise/IndustryComingSoon"));
const DemandSummaryPage = lazy(() => import("../pages/enterprise/DemandSummaryPage"));
const ProductDashboardPageV2 = lazy(() => import("../components/product-dashboard/ProductDashboardPage").then(m => ({ default: m.ProductDashboardPage })));
const ProductRoomPage = lazy(() => import("../pages/ProductRoomPage"));
const CapacityPlanningPage = lazy(() => import("../pages/CapacityPlanningPage"));
const TeamComingSoon = lazy(() => import("../pages/team/ComingSoon"));
const UnauthorizedPage = lazy(() => import("../pages/UnauthorizedPage"));
// Knowledge Hub absorbed into the Wiki hub (CAT-DOCS-NOTION-20260704-001):
// legacy UUID URLs resolve to canonical /wiki slug routes.
const LegacySpaceRedirect = lazy(() =>
  import("../pages/wiki/LegacyKnowledgeHubRedirect").then(m => ({ default: m.LegacySpaceRedirect })));
const LegacyDocumentRedirect = lazy(() =>
  import("../pages/wiki/LegacyKnowledgeHubRedirect").then(m => ({ default: m.LegacyDocumentRedirect })));

const WikiHomePage = lazy(() => import("../pages/wiki/WikiHomePage"));
const WikiWorkspacePage = lazy(() => import("../pages/wiki/WikiWorkspacePage"));
// DEV-only ternary keeps the sandbox chunk out of the production bundle
// (the route below is also DEV-gated, but a bare lazy() would still ship it).
const WikiSandboxPage = import.meta.env.DEV
  ? lazy(() => import("../pages/wiki/WikiSandboxPage"))
  : () => null;

const IncidentDetail = lazy(() => import("../pages/release").then(m => ({ default: m.IncidentDetail })));
const IncidentsDashboard = lazy(() => import("../pages/release").then(m => ({ default: m.IncidentsDashboard })));
const CreateIncident = lazy(() => import("../pages/release").then(m => ({ default: m.CreateIncident })));
const CommitteeQueue = lazy(() => import("../pages/release").then(m => ({ default: m.CommitteeQueue })));
const IncidentReports = lazy(() => import("../pages/release").then(m => ({ default: m.IncidentReports })));
const IncidentRoomList = lazy(() => import("../pages/release/IncidentRoomList"));
const IncidentRoomDetail = lazy(() => import("../pages/release/IncidentRoomDetail"));
const IncidentCommandCenter = lazy(() => import("../pages/release/IncidentCommandCenter"));
const IncidentAnalyticsPage = lazy(() => import("../modules/incidents/analytics/pages/IncidentAnalyticsPage"));
const IncidentInsightsPage = lazy(() => import("../modules/incidents/analytics/pages/IncidentInsightsPage"));
const IncidentKanbanPage = lazy(() => import("../modules/incidents/kanban/pages/IncidentKanbanPage"));


const S = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <Suspense fallback={<div style={{ padding: 32 }}>Loading...</div>}>{children}</Suspense>
  </ErrorBoundary>
);

/** Maps a ModuleGate feature-flag key to its admin_nav_modules role key
 *  (admin_role_module_permissions). Only keys listed here get role-gated. */
const MG_ROLE_KEY: Record<string, string> = {
  producthub: 'product',
  strategyhub: 'enterprise',
  incidenthub: 'operations',
  ai_features: 'product',
};

/** Runtime module gate wrapper for route elements.
 *  Outer = org availability (ModuleGate / feature_flags).
 *  Inner = role-based access (ModuleGuard / admin_role_module_permissions),
 *  applied only when the key maps to a known role module. admin/super_admin bypass. */
function MG({ k, t, children }: { k: string; t: string; children: React.ReactNode }) {
  const roleKey = MG_ROLE_KEY[k];
  const inner = roleKey ? <ModuleGuard moduleCode={roleKey}>{children}</ModuleGuard> : children;
  return <ModuleGate moduleKey={k} fallbackTitle={t}>{inner}</ModuleGate>;
}

/* /incident-hub/backlog/:key alias — BacklogPage "open in full page" for
   incidents uses this pattern. Redirect to detail page which resolves
   issue_key directly (no DB lookup needed since detail page is dual-mode). */
function IncidentBacklogKeyRedirect() {
  const { key: incidentKey } = useParams<{ key: string }>();
  if (!incidentKey) return <Navigate to="/incident-hub" replace />;
  return <Navigate to={`/incident-hub/view/${incidentKey}`} replace />;
}

function Resource360Redirect() {
  const { id } = useParams();
  return <Navigate to={`/project-hub/resource-360/${id || '009'}`} replace />;
}

function ResourceLegacyToCanonical() {
  const { resourceId } = useParams();
  return <Navigate to={`/project-hub/resource-360/${resourceId || '009'}`} replace />;
}

function NavigateAdminResourceId() {
  const { resourceId } = useParams();
  return <Navigate to={`/admin/resources/${resourceId ?? ''}`} replace />;
}

/**
 * LegacyBacklogRedirect — the per-type Backlog pages (Story / Epic / Feature)
 * were deprecated 2026-04 in favour of the unified /project-hub/:key/backlog
 * surface. This redirect preserves old bookmarks + external links. Replace
 * with a canonical location once CatalystDetailRouter links are audited.
 */
function LegacyBacklogRedirect() {
  const { key } = useParams<{ key: string }>();
  return <Navigate to={`/project-hub/${key}/backlog`} replace />;
}

// Deprecated: the legacy /boards/:boardId board view is superseded by the new
// Kanban. A declarative <Navigate> is swallowed by CatalystShell's re-render
// loop (see notes below), so do a hard browser replace — reliable for a
// deprecated route, preserving which board via ?board=.
function LegacyBoardRedirect() {
  const { key, boardId } = useParams<{ key: string; boardId: string }>();
  React.useEffect(() => {
    if (!key) return;
    window.location.replace(`/project-hub/${key}/kanban${boardId ? `?board=${boardId}` : ''}`);
  }, [key, boardId]);
  return null;
}

// Deprecated: /kanban route is superseded by /boards (board manager) → individual board.
function LegacyKanbanRedirect() {
  const { key } = useParams<{ key: string }>();
  React.useEffect(() => {
    if (!key) return;
    window.location.replace(`/project-hub/${key}/boards`);
  }, [key]);
  return null;
}

function KnowledgeAssistFabRouteGuard() {
  const location = useLocation();
  if (location.pathname !== '/for-you') return null;
  return <Suspense fallback={null}><KnowledgeAssistFabLazy /></Suspense>;
}


export default function FullAppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/kb-admin-setup" element={<S><KBAdminSetup /></S>} />
        <Route path="/kb-admin" element={<Navigate to="/admin/kb" replace />} />
        <Route path="/kb-data-audit" element={<S><KBDataAuditPage /></S>} />
        <Route path="/chat" element={<S><ChatPageLazy /></S>} />

        <Route path="/work-hub-test" element={<S><WorkHubLayout /></S>}>
          <Route index element={<Navigate to="summary" replace />} />
          <Route path="summary" element={<S><SummaryView /></S>} />
          <Route path="list" element={<S><ListView /></S>} />
          <Route path="all-work" element={<S><AllWorkView /></S>} />
          <Route path="releases" element={<S><ReleasesView /></S>} />
          <Route path="releases/:versionId" element={<S><ReleaseDetailsView /></S>} />
        </Route>

        <Route path="/browse/:key" element={<S><BrowsePage /></S>} />

        {/* ═══ Work Items / BacklogPage ═══ */}
        <Route path="/workitems" element={<S><Suspense fallback={<div style={{ padding: 32 }}>Loading...</div>}><WorkListPageLazy /></Suspense></S>} />

        {/* ═══ Product Hub ═══
            Block A rule 1 (2026-05-01): canonical URL prefix is `/product-hub`.
            All ProductHub routes registered under `/product-hub/*`. Each
            legacy `/producthub/X` is preserved as a redirect to its
            `/product-hub/X` counterpart so deep links and bookmarks survive.
            Specificity: react-router v6 picks the most-specific match, so the
            paired (legacy redirect, canonical destination) stays explicit per
            route — a single `/producthub/*` splat is shadowed by the
            individual entries. */}
        {/* Canonical /product-hub/* (these own the rendering) */}
        {/* Block C/D (2026-05-01): /product-hub root → /product-hub/products
            redirect lives in App.tsx OUTSIDE this protected shell, because
            CatalystShell's re-render loop swallows in-shell Navigate calls
            (same pattern as ProducthubLegacyRedirect). Drilldowns happen at
            /product-hub/{KEY}/dashboard|backlog|kanban|... */}
        <Route path="/product-hub/products" element={<MG k="producthub" t="ProductHub"><S><AllProductsPage /></S></MG>} />
        {/* /product-hub/backlog redirect handled in App.tsx OUTSIDE the shell —
            in-shell Navigate is swallowed by CatalystShell's re-render loop. */}
        <Route path="/product-hub/table" element={<Navigate to="/product-hub/products" replace />} />
        <Route path="/product-hub/kanban" element={<Navigate to="/product-hub/products" replace />} />
        {/* /product-hub/dashboard deprecated 2026-05-16 — redirects to products list */}
        <Route path="/product-hub/dashboard" element={<Navigate to="/product-hub/products" replace />} />
        <Route path="/product-hub/product-dashboard" element={<MG k="producthub" t="ProductHub"><S><ProductDashboardPageV2 /></S></MG>} />
        {/* Block D Phase 2.5 (2026-05-01) — product-scoped drilldown routes.
            Mirror of /project-hub/{KEY}/* on the project side.
            :key param resolves against public.products.code (INV/MINI/SEN/ENT).
            Canonical project-hub components are reused; ph_issues holds the
            product data (project_key = product code, e.g. 'INV').
            2026-05-16: renamed :code → :key so canonical components that read
            useParams().key work without adaptation. */}
        {/* Generic per-product routes — native product hub pages (2026-06-01) */}
        <Route path="/product-hub/:key/backlog/:issueKey" element={<MG k="producthub" t="ProductHub"><S><ProductBacklogDetailPage /></S></MG>} />
        <Route path="/product-hub/:key/backlog" element={<MG k="producthub" t="ProductHub"><S><ProductBacklogPage /></S></MG>} />
        <Route path="/product-hub/:key/boards" element={<MG k="producthub" t="ProductHub"><S><ProductBoardManagerPage /></S></MG>} />
        <Route path="/product-hub/:key/boards/:boardSlug" element={<MG k="producthub" t="ProductHub"><S><ProductNativeBoardPage /></S></MG>} />
        <Route path="/product-hub/:key/kanban" element={<MG k="producthub" t="ProductHub"><S><ProductNativeBoardPage /></S></MG>} />
        <Route path="/product-hub/:key/allwork" element={<MG k="producthub" t="ProductHub"><S><ProductNativeAllWorkPage /></S></MG>} />

        {/* 2026-06-15: product dashboard now mounts the canonical
            ProjectDashboardPage with mode='product' (per PO directive +
            CLAUDE.md "ADOPT CANONICAL COMPONENTS"). The 4 BR-incompatible
            widgets (scope-change, prod-incidents, qa-defects, time-in-status)
            are filtered from the gallery via getWidgetRegistry('product').
            ProductDashboardPageV2 left on disk pending Phase B sign-off. */}
        <Route path="/product-hub/:key/dashboard" element={<MG k="producthub" t="ProductHub"><S><ProjectDashboardPageLazy mode="product" /></S></MG>} />
        {/* 2026-06-15: standup history reachable from the board kebab menu
            ("Standup history"). Same page on both hubs — projectKey is the
            standups.project_key text column, which accepts product codes too. */}
        <Route path="/product-hub/:key/standups" element={<MG k="producthub" t="ProductHub"><S><StandupHistoryPageLazy /></S></MG>} />
        <Route path="/product-hub/:key/roadmap" element={<MG k="producthub" t="ProductHub"><S><RoadmapPage /></S></MG>} />
        {/* Filter-derived roadmap (CAT-DEF-004): "Create roadmap from filter" in the
            product hub now lands on the filter-aware FilterRoadmapPage (same component
            the project hub uses) instead of the old static RoadmapPage. */}
        <Route path="/product-hub/:key/roadmaps/:id" element={<MG k="producthub" t="ProductHub"><S><FilterRoadmapPageLazy /></S></MG>} />
        <Route path="/product-hub/:key/timeline/:issueKey" element={<MG k="producthub" t="ProductHub"><S><ProductTimelineDetailPage /></S></MG>} />
        <Route path="/product-hub/:key/timeline" element={<MG k="producthub" t="ProductHub"><S><ProductHubTimelinePage /></S></MG>} />
        <Route path="/product-hub/:key/dependencies" element={<MG k="producthub" t="ProductHub"><S><ProductDependenciesPageLazy /></S></MG>} />
        <Route path="/product-hub/:key/milestones" element={<MG k="producthub" t="ProductHub"><S><MilestonesPageLazy /></S></MG>} />
        <Route path="/product-hub/:key/milestones/:milestoneId" element={<MG k="producthub" t="ProductHub"><S><MilestoneDetailPageLazy /></S></MG>} />
        <Route path="/product-hub/:key/releases" element={<MG k="producthub" t="ProductHub"><S><ReleasesPageWrapperLazy /></S></MG>} />
        <Route path="/product-hub/:key/cards" element={<Navigate to="/product-hub/products" replace />} />
        <Route path="/product-hub/:key/settings" element={<MG k="producthub" t="ProductHub"><S><DemandSummaryPage /></S></MG>} />
        <Route path="/product-hub/:key/filters" element={<MG k="producthub" t="ProductHub"><S><FiltersListPageLazy hubType="product" /></S></MG>} />
        {/* 2026-06-15: filter create + detail now route to the canonical
            project-hub pages with mode='product' (per CLAUDE.md "ADOPT
            CANONICAL COMPONENTS"). The parallel ProductFilterPreviewPage is
            no longer mounted by any route; kept on disk pending PO sign-off
            before deletion. */}
        <Route path="/product-hub/:key/filters/create" element={<MG k="producthub" t="ProductHub"><S><FilterPreviewPageLazy mode="product" /></S></MG>} />
        <Route path="/product-hub/:key/filters/:filterId" element={<MG k="producthub" t="ProductHub"><S><FilterPreviewPageLazy mode="product" /></S></MG>} />
        {/* Global /product-hub/filters[/create] retired 2026-06-01 — filters are
            per-product. Anyone deep-linking to the old global path lands on the
            products listing. Per-product filters still live at /product-hub/:key/filters. */}
        <Route path="/product-hub/filters" element={<Navigate to="/product-hub/products" replace />} />
        <Route path="/product-hub/filters/create" element={<Navigate to="/product-hub/products" replace />} />
        <Route path="/product-hub/roadmaps" element={<Navigate to="/product-hub/roadmap" replace />} />
        <Route path="/product-hub/roadmaps-v1" element={<Navigate to="/product-hub/roadmap" replace />} />
        <Route path="/product-hub/reports" element={<MG k="producthub" t="ProductHub"><S><IndustryComingSoon /></S></MG>} />
        <Route path="/product-hub/roadmap" element={<MG k="producthub" t="ProductHub"><S><RoadmapPage /></S></MG>} />
        <Route path="/product-hub/cards" element={<Navigate to="/product-hub/products" replace />} />
        {/* Phase 6 (2026-05-02) — Ideation lifted out of Product Hub.
            /product-hub/ideation now redirects to the canonical peer hub
            at /ideation/intelligence. Submitters and reviewers no longer
            land "inside" Product Hub for ideation work. */}
        <Route path="/product-hub/ideation" element={<Navigate to="/ideation/intelligence" replace />} />
        <Route path="/product-hub/requirement-assist" element={<MG k="ai_features" t="Requirement Assist"><S><RequirementAssistWorkspace /></S></MG>} />
        <Route path="/product-hub/requirement-assist/compose" element={<MG k="ai_features" t="Requirement Assist"><S><RequirementAssistCompose /></S></MG>} />
        <Route path="/product-hub/requirement-assist/categories" element={<MG k="ai_features" t="Requirement Assist"><S><RequirementAssistCategories /></S></MG>} />
        <Route path="/product-hub/requirement-assist/:id" element={<MG k="ai_features" t="Requirement Assist"><S><RequirementAssistOutput /></S></MG>} />

        {/* Legacy /producthub/* — handled by ProducthubLegacyRedirect mounted
            in App.tsx at /producthub + /producthub/*. The block previously
            here was dead code (App.tsx wildcard catches first). */}

        {/* Phase 6 (2026-05-02) — Ideation peer hub at /ideation/*.
            Pages stay where they are (pages/producthub/Ideas*.tsx); only
            the canonical URL prefix moves. /product/ideas/* legacy paths
            redirect below so existing bookmarks survive. */}
        <Route path="/ideation" element={<Navigate to="/ideation/backlog" replace />} />
        <Route path="/ideation/backlog" element={<MG k="ai_features" t="Ideas Backlog"><S><IdeasBacklogPage /></S></MG>} />
        <Route path="/ideation/board" element={<MG k="ai_features" t="Ideas Board"><S><IdeasBoardPage /></S></MG>} />
        <Route path="/ideation/roadmap" element={<MG k="ai_features" t="Ideas Roadmap"><S><IdeasRoadmapPageNew /></S></MG>} />
        <Route path="/ideation/themes" element={<MG k="ai_features" t="Ideas Themes"><S><IdeasThemePage /></S></MG>} />
        <Route path="/ideation/analytics" element={<MG k="ai_features" t="Ideas Analytics"><S><IdeasAnalyticsPage /></S></MG>} />
        <Route path="/ideation/matrix" element={<MG k="ai_features" t="Impact Matrix"><S><IdeationPage /></S></MG>} />
        <Route path="/ideation/triage" element={<MG k="ai_features" t="Triage"><S><IdeationPage /></S></MG>} />
        <Route path="/ideation/intelligence" element={<MG k="ai_features" t="Intelligence"><S><IdeationPage /></S></MG>} />

        {/* Legacy /product/ideas/* — redirect to canonical /ideation/*.
            /product/ideas/roadmap-new collapses with /product/ideas/roadmap
            since /ideation/roadmap is now the single roadmap surface. */}
        <Route path="/product/ideas/roadmap" element={<Navigate to="/ideation/roadmap" replace />} />
        <Route path="/product/ideas/roadmap-new" element={<Navigate to="/ideation/roadmap" replace />} />
        <Route path="/product/ideas/backlog" element={<Navigate to="/ideation/backlog" replace />} />
        <Route path="/product/ideas/board" element={<Navigate to="/ideation/board" replace />} />
        <Route path="/product/ideas/themes" element={<Navigate to="/ideation/themes" replace />} />
        <Route path="/product/ideas/analytics" element={<Navigate to="/ideation/analytics" replace />} />
        <Route path="/product/req-assist" element={<MG k="ai_features" t="Requirement Assist"><S><ReqAssistLibrary /></S></MG>} />
        <Route path="/product/req-assist/generate" element={<MG k="ai_features" t="Requirement Assist"><S><ReqAssistGenerate /></S></MG>} />
        <Route path="/req-assist/rag-audit" element={<MG k="ai_features" t="RAG Audit"><S><RAGAuditPage /></S></MG>} />
        <Route path="/product-hub/req-assist" element={<Navigate to="/product/req-assist" replace />} />
        <Route path="/product-hub/req-assist/generate" element={<Navigate to="/product/req-assist/generate" replace />} />
        <Route path="/industry/*" element={<Navigate to="/product-hub" replace />} />
        
        <Route path="/starred" element={<S><StarredPage /></S>} />
        <Route path="/search" element={<S><SearchPage /></S>} />

        {/* ═══ StrategyHub ═══ */}
        <Route path="/strategyhub" element={<MG k="strategyhub" t="StrategyHub"><S><StrategyRoom /></S></MG>} />
        <Route path="/strategyhub/executive-brief" element={<MG k="strategyhub" t="StrategyHub"><S><StrategyRoom /></S></MG>} />
        <Route path="/strategyhub/themes" element={<MG k="strategyhub" t="StrategyHub"><S><StrategicThemesPage /></S></MG>} />
        <Route path="/strategyhub/goals" element={<MG k="strategyhub" t="StrategyHub"><S><GoalsKeyResultsPage /></S></MG>} />
        <Route path="/strategyhub/initiatives" element={<Navigate to="/producthub/backlog" replace />} />
        <Route path="/strategyhub/investment" element={<MG k="strategyhub" t="StrategyHub"><S><StrategyComingSoon title="Investment Allocation" /></S></MG>} />
        <Route path="/strategyhub/snapshots" element={<MG k="strategyhub" t="StrategyHub"><S><StrategyComingSoon title="Snapshots" /></S></MG>} />
        <Route path="/strategyhub/ai-insights" element={<MG k="ai_features" t="AI Insights"><S><StrategyComingSoon title="AI Insights" /></S></MG>} />
        <Route path="/strategyhub/team-alignment" element={<MG k="strategyhub" t="StrategyHub"><S><StrategyComingSoon title="Team Alignment" /></S></MG>} />
        <Route path="/strategyhub/settings" element={<MG k="strategyhub" t="StrategyHub"><S><StrategyComingSoon title="Settings" /></S></MG>} />
        <Route path="/strategy-room" element={<Navigate to="/strategyhub" replace />} />
        <Route path="/strategyhub/strategy-room" element={<Navigate to="/strategyhub" replace />} />
        <Route path="/strategyhub/roadmaps" element={<Navigate to="/strategyhub/risks" replace />} />
        <Route path="/strategyhub/risks" element={<S><EnterpriseComingSoon /></S>} />

        <Route path="/portfolio/:portfolioKey/*" element={<S><PortfolioRoutesShell /></S>} />
        <Route path="/program" element={<S><PlaceholderPage /></S>} />
        <Route path="/program/:programId/*" element={<S><ProgramRoutesShell /></S>} />
        <Route path="/programs" element={<S><ProgramDirectory /></S>} />
        <Route path="/programs/program-board" element={<Navigate to="/for-you" replace />} />
        <Route path="/programs/program-board/history" element={<S><ProgramBoardHistory /></S>} />
        <Route path="/programs/:programId/*" element={<S><ProgramsRoutesShell /></S>} />

        <Route path="/teams" element={<S><TeamComingSoon /></S>} />
        <Route path="/teams/:teamSlug/*" element={<S><TeamsRoutesShell /></S>} />
        <Route path="/team/:teamSlug/*" element={<S><TeamRoutesShell /></S>} />

        <Route path="/enterprise/*" element={<S><EnterpriseRoutesShell /></S>} />

        <Route path="/work-tree" element={<S><WorkTreePage /></S>} />

        {/* 2026-06-17: default landing is Dashboard (matches project +
            product + incident hubs). Board is reachable from the sidebar
            or directly via /tasks/board. */}
        <Route path="/tasks" element={<Navigate to="/tasks/overview" replace />} />
        {/* 2026-06-17: /tasks/work re-introduced as the canonical Tasks
            Hub All Work view (TasksWorkCanonical → ProjectAllWorkView
            with tasksItems + entityKind='task'). The earlier redirect
            to /tasks/list was deleted now that the real surface exists. */}
        {/* 2026-06-17: full-page task detail. MUST be declared before
            /tasks/:view so RR6's specificity ranking selects the
            two-segment route for /tasks/view/<task-key>. */}
        <Route path="/tasks/view/:taskKey" element={<S><TasksDetailPage /></S>} />
        {/* 2026-06-17: Tasks Hub filters — canonical FiltersListPage /
            FilterDetailPage / FilterPreviewPage. MUST be declared before
            /tasks/:view so the static segment outranks the param route. */}
        <Route path="/tasks/filters" element={<S><TasksFiltersListPage /></S>} />
        <Route path="/tasks/filters/create" element={<S><TasksFilterPreviewPage /></S>} />
        <Route path="/tasks/filters/:filterId" element={<S><TasksFilterPreviewPage /></S>} />
        <Route path="/tasks/:view" element={<ModuleGuard moduleCode="planner"><S><PlannerPage /></S></ModuleGuard>} />
        {/* Deprecated 2026-06-17: My Tasks removed. Static segment outranks /tasks/:view in RR6 → 404. */}
        <Route path="/tasks/my-tasks" element={<S><NotFound /></S>} />
        {/* CAT-TASKS-20260627-001 Slice 5: Workstreams restored as a canonical CRUD page. */}
        <Route path="/tasks/workstreams" element={<ModuleGuard moduleCode="planner"><S><WorkstreamsManagerPage /></S></ModuleGuard>} />

        {/* Backward-compat redirects from old /taskhub routes */}
        <Route path="/taskhub" element={<Navigate to="/tasks/overview" replace />} />
        <Route path="/taskhub/boards" element={<Navigate to="/tasks/board" replace />} />
        <Route path="/taskhub/task-list" element={<Navigate to="/tasks/list" replace />} />
        <Route path="/taskhub/dashboard" element={<Navigate to="/tasks/overview" replace />} />

        {/* Plan module — resource planning */}
        <Route path="/plan/resources" element={<S><PlanResourcePlannerPage /></S>} />
        <Route path="/taskhub/settings" element={<Navigate to="/tasks/settings" replace />} />
        <Route path="/taskhub/:view" element={<Navigate to="/tasks/board" replace />} />
        <Route path="/taskhub-kanban" element={<Navigate to="/tasks/board" replace />} />

        {/* TestHub */}
        <Route path="/testhub" element={<Navigate to="/testhub/dashboard" replace />} />
        <Route path="/testhub/dashboard" element={<S><TestHubDashboardPage /></S>} />
        <Route path="/testhub/my-work" element={<S><TestHubMyWorkPage /></S>} />
        <Route path="/testhub/board" element={<S><TestHubBoardPage /></S>} />
        <Route path="/testhub/repository" element={<S><TestHubRepositoryPage /></S>} />
        <Route path="/testhub/cycles" element={<S><TestHubCyclesPage /></S>} />
        <Route path="/testhub/:projectKey/cycles/:cycleKey" element={<S><TestHubCycleDetailPage /></S>} />
        <Route path="/testhub/:projectKey/cycles/:cycleKey/execute" element={<S><TestHubExecutionPage /></S>} />
        {/* Legacy routes without projectKey — backward compat */}
        <Route path="/testhub/cycles/:cycleKey" element={<S><TestHubCycleDetailPage /></S>} />
        <Route path="/testhub/cycles/:cycleKey/execute" element={<S><TestHubExecutionPage /></S>} />
        <Route path="/testhub/timeline" element={<S><TestHubTimelinePage /></S>} />
        <Route path="/testhub/dependencies" element={<S><TestHubDependenciesPage /></S>} />
        <Route path="/testhub/sets" element={<S><TestHubSetsPage /></S>} />
        <Route path="/testhub/sets/:id" element={<S><TestHubSetDetailPage /></S>} />
        <Route path="/testhub/traceability" element={<S><TestHubTraceabilityPage /></S>} />
        <Route path="/testhub/defects" element={<S><TestHubDefectsPage /></S>} />
        {/* Reports hub (CAT-REPORTS-HUB-20260703-001): one surface, :reportSlug
            selects a REPORT_REGISTRY entry. Old report URLs redirect to their
            registry slugs; governance + product-status slugs are unchanged so
            the :reportSlug route serves them directly. */}
        <Route path="/testhub/reports-lab" element={<Navigate to="/testhub/reports/execution-overview" replace />} />
        <Route path="/testhub/reports" element={<S><TestHubReportsHubPage /></S>} />
        <Route path="/testhub/reports/project-status" element={<Navigate to="/testhub/reports/project-testing-status" replace />} />
        <Route path="/testhub/reports/sprint-status" element={<Navigate to="/testhub/reports/sprint-testing-status" replace />} />
        <Route path="/testhub/reports/tester-status" element={<Navigate to="/testhub/reports/tester-performance" replace />} />
        <Route path="/testhub/reports/team-status" element={<Navigate to="/testhub/reports/team-performance" replace />} />
        <Route path="/testhub/reports/defects-incidents" element={<Navigate to="/testhub/reports/defect-summary" replace />} />
        <Route path="/testhub/reports/:reportSlug" element={<S><TestHubReportsHubPage /></S>} />
        {/* Filters — canonical FiltersListPage / Preview / Detail with hubType='test'.
            Static segments BEFORE :id-style routes. */}
        <Route path="/testhub/filters" element={<S><TestHubFiltersListPage /></S>} />
        <Route path="/testhub/filters/create" element={<S><TestHubFilterPreviewPage /></S>} />
        <Route path="/testhub/filters/:filterId" element={<S><TestHubFilterPreviewPage /></S>} />

        {/* ═══ IncidentHub ═══ */}
        {/* 2026-06-17: default landing is now Dashboard (matches project +
            product hubs where /:hub/:key redirects to /:hub/:key/dashboard).
            The All Incidents list moves to /incident-hub/all-incidents. */}
        <Route path="/incident-hub" element={<Navigate to="/incident-hub/dashboard" replace />} />
        <Route path="/incident-hub/all-incidents" element={<MG k="incidenthub" t="IncidentHub"><S><IncidentHubListPage /></S></MG>} />
        {/* 2026-06-16: Board tab — canonical KanbanPage with mode='incident'.
            "Kanban" tab in the sidebar was renamed "Board" to match the
            naming used by project + product hubs. Legacy /incident-hub/kanban
            path redirects here so any existing link still lands on the
            canonical surface. */}
        <Route path="/incident-hub/board" element={<MG k="incidenthub" t="IncidentHub"><S><IncidentHubBoardPage /></S></MG>} />
        <Route path="/incident-hub/kanban" element={<Navigate to="/incident-hub/board" replace />} />
        {/* 2026-06-16: Filters tab — canonical FiltersListPage / FilterPreviewPage /
            FilterDetailPage with hubType='incident' / mode='incident'. Data is
            ph_issues filtered to issue_type='Production Incident'; saves are
            scoped via the 'INCIDENTS' projectKey sentinel. */}
        <Route path="/incident-hub/filters" element={<MG k="incidenthub" t="IncidentHub"><S><IncidentHubFiltersListPage /></S></MG>} />
        <Route path="/incident-hub/filters/create" element={<MG k="incidenthub" t="IncidentHub"><S><IncidentHubFilterPreviewPage /></S></MG>} />
        <Route path="/incident-hub/filters/:filterId" element={<MG k="incidenthub" t="IncidentHub"><S><IncidentHubFilterPreviewPage /></S></MG>} />
        {/* 2026-06-17: Timeline tab — canonical TimelineView with
            useIncidentHubTimeline data (ph_issues filtered to
            issue_type='Production Incident'). Same Gantt chrome as
            /project-hub/:key/timeline and /product-hub/:key/timeline. */}
        <Route path="/incident-hub/timeline" element={<MG k="incidenthub" t="IncidentHub"><S><IncidentHubTimelinePage /></S></MG>} />
        <Route path="/incident-hub/dependencies" element={<MG k="incidenthub" t="IncidentHub"><S><IncidentHubDependenciesPageLazy /></S></MG>} />
        {/* 2026-06-17: Dashboard tab — canonical ProjectDashboardPage with
            mode='incident'. Same 11-widget grid as project + product hubs,
            with the 5 widgets that don't apply (Epic Progress, Scope
            Change, Production Incidents peer, QA Defects, Time in Status)
            dropped via hideOnIncident. Remaining widgets pull from
            ph_issues filtered to issue_type='Production Incident'. */}
        <Route path="/incident-hub/dashboard" element={<MG k="incidenthub" t="IncidentHub"><S><IncidentHubDashboardPage /></S></MG>} />
        {/* 2026-06-16: Work tab — canonical ProjectAllWorkView with mode='incident'. */}
        <Route path="/incident-hub/work" element={<MG k="incidenthub" t="IncidentHub"><S><IncidentHubWorkPage /></S></MG>} />
        <Route path="/incident-hub/analytics" element={<MG k="incidenthub" t="IncidentHub"><S><IncidentHubAnalyticsPage /></S></MG>} />
        {/* Production Incident report — incident half of the old TestHub
            defects-incidents report (CAT-REPORTS-HUB-20260703-001 Phase 2
            Lane C; CRE Grid A: Production Incident → INCIDENT module). */}
        <Route path="/incident-hub/reports" element={<MG k="incidenthub" t="IncidentHub"><S><IncidentHubReportPage /></S></MG>} />
        <Route path="/incident-hub/committee-queue" element={<MG k="incidenthub" t="IncidentHub"><S><IncidentHubCommitteeQueuePage /></S></MG>} />
        <Route path="/incident-hub/view/:incidentKey" element={<MG k="incidenthub" t="IncidentHub"><S><IncidentHubDetailPage /></S></MG>} />
        {/* 2026-06-16: redirect alias — the BacklogPage's default
            "open in full page" pattern was {baseUrl}/backlog/{key} which
            for incidents doesn't exist as a route. We resolve key → UUID
            on the fly and redirect to /incident-hub/view/:uuid so any
            stale link (cached chunk, manual paste, bookmarked URL) lands
            on the real detail page instead of an empty router slot. */}
        <Route path="/incident-hub/backlog/:key" element={<MG k="incidenthub" t="IncidentHub"><S><IncidentBacklogKeyRedirect /></S></MG>} />

        {/* Release Operations — sections per handoff §6 (2026-06-18). */}
        <Route path="/release-hub" element={<Navigate to="/release-hub/overview" replace />} />
        <Route path="/release-hub/overview" element={<ModuleGuard moduleCode="releases"><S><RH21CommandCenterPage /></S></ModuleGuard>} />
        {/* Deprecated 2026-06-23 — /release-hub/releases (ReleasesBacklogCanonical) removed; superseded by /release-hub/releases-management. */}
        <Route path="/release-hub/releases" element={<Navigate to="/release-hub/releases-management" replace />} />
        <Route path="/release-hub/release-kanban" element={<S><ReleaseBoardCanonical /></S>} />
        <Route path="/release-hub/work" element={<S><ReleasesWorkCanonical /></S>} />
        <Route path="/release-hub/filters" element={<S><ReleaseFiltersListPage /></S>} />
        <Route path="/release-hub/filters/create" element={<S><ReleaseFilterPreviewPage /></S>} />
        <Route path="/release-hub/filters/:filterId" element={<S><ReleaseFilterPreviewPage /></S>} />
        <Route path="/release-hub/timeline" element={<S><ReleasesTimelineCanonical /></S>} />
        <Route path="/release-hub/production-events" element={<S><ProductionEventsPageLazy /></S>} />
        <Route path="/release-hub/calendar" element={<S><ReleaseCalendarPage /></S>} />
        <Route path="/release-hub/releases-management" element={<S><ReleasesPageLazy /></S>} />
        <Route path="/release-hub/releases-management/:releaseSlug" element={<S><ReleaseDetailPageLazy /></S>} />
        <Route path="/release-hub/releases-management/:releaseSlug/work" element={<S><ReleaseWorkNavigatorPageLazy /></S>} />
        <Route path="/release-hub/changes" element={<S><RH21AllChangesPage /></S>} />
        <Route path="/release-hub/changes/:changeId" element={<S><ChangeDetailPage /></S>} />
        <Route path="/release-hub/sop-templates" element={<S><SopTemplatesPage /></S>} />
        <Route path="/release-hub/sign-off-queue" element={<S><RH21SignOffQueuePage /></S>} />
        <Route path="/release-hub/freeze-windows" element={<S><RH21FreezeWindowsPage /></S>} />
        <Route path="/release-hub/settings" element={<S><ReleaseSettingsPage /></S>} />

        {/* Retired this phase — redirect to Overview. */}
        <Route path="/release-hub/command-center" element={<Navigate to="/release-hub/overview" replace />} />
        <Route path="/release-hub/compare" element={<Navigate to="/release-hub/overview" replace />} />
        <Route path="/release-hub/triage" element={<Navigate to="/release-hub/overview" replace />} />

        <Route path="/release-hub/:releaseId" element={<S><ReleaseDetailPage /></S>} />

        {/* Legacy releasehub redirects */}
        <Route path="/releasehub" element={<Navigate to="/release-hub/overview" replace />} />
        <Route path="/releasehub/command-center" element={<Navigate to="/release-hub/overview" replace />} />
        <Route path="/releasehub/all-releases" element={<Navigate to="/release-hub/releases-management" replace />} />
        <Route path="/releasehub/compare" element={<Navigate to="/release-hub/overview" replace />} />
        <Route path="/releasehub/triage" element={<Navigate to="/release-hub/overview" replace />} />
        <Route path="/releasehub/changes" element={<Navigate to="/release-hub/changes" replace />} />
        <Route path="/releasehub/production-events" element={<Navigate to="/release-hub/production-events" replace />} />
        <Route path="/releasehub/dashboard" element={<Navigate to="/release-hub/overview" replace />} />
        <Route path="/releasehub/all" element={<Navigate to="/release-hub/releases-management" replace />} />

        {/* Deprecated 2026-06-17: Priorities (Task10) module removed. Subtree → 404. */}
        <Route path="/tasks/priorities/*" element={<S><NotFound /></S>} />

        {/* Backward-compat redirects from old /planner routes */}
        <Route path="/planner" element={<Navigate to="/tasks/overview" replace />} />
        <Route path="/planner/*" element={<Navigate to="/tasks/overview" replace />} />

        {/* Plan Hub deprecated 2026-06-25 — all routes removed */}
        <Route path="/planhub*" element={<Navigate to="/tasks/overview" replace />} />

        {/* Docex — Catalyst Pages (CAT-DOCS-NOTION-20260704-001).
            Renamed from /wiki 2026-07-05: /wiki belongs to the restored
            knowledge-base hub on main. */}
        <Route path="/docex" element={<S><WikiHomePage /></S>} />
        {import.meta.env.DEV && (
          <Route path="/docex/_sandbox" element={<S><WikiSandboxPage /></S>} />
        )}
        <Route path="/docex/:workspaceSlug" element={<S><WikiWorkspacePage /></S>} />
        <Route path="/docex/:workspaceSlug/:pageSlug" element={<S><WikiWorkspacePage /></S>} />

        <Route path="/mining" element={<S><MiningComingSoon /></S>} />
        <Route path="/product/room" element={<S><ProductRoomPage /></S>} />
        <Route path="/product/:productId/room" element={<S><ProductRoomPage /></S>} />
        <Route path="/product/capacity" element={<S><CapacityPlanningPage /></S>} />

        <Route path="/themes" element={<S><Themes /></S>} />
        <Route path="/themes/grid" element={<S><Themes /></S>} />
        <Route path="/initiatives" element={<S><Initiatives /></S>} />
        <Route path="/epics" element={<Navigate to="/program/b2c3d4e5-f6a7-8901-bcde-f12345678901/epic-backlog" replace />} />
        <Route path="/backlog/epics" element={<Navigate to="/program/b2c3d4e5-f6a7-8901-bcde-f12345678901/epic-backlog" replace />} />
        <Route path="/features" element={<S><FeaturesBacklog /></S>} />
        <Route path="/features/prioritization" element={<S><FeaturePrioritizationView /></S>} />
        <Route path="/items/epics" element={<Navigate to="/program/b2c3d4e5-f6a7-8901-bcde-f12345678901/epic-backlog" replace />} />
        <Route path="/items/epics/recycle-bin" element={<S><EpicsRecycleBinPage /></S>} />
        <Route path="/items/epics/canceled" element={<S><EpicsCanceledPage /></S>} />
        <Route path="/items/epics/:epicId/status-report" element={<S><EpicStatusReport /></S>} />
        <Route path="/items/epics/:epicId/trace" element={<S><EpicTraceReport /></S>} />
        <Route path="/items/epics/:epicId/requirement-hierarchy" element={<S><EpicRequirementHierarchy /></S>} />
        <Route path="/items/epics/:epicId/responsibility-matrix" element={<S><EpicResponsibilityMatrix /></S>} />
        <Route path="/items/epics/:epicId/planning" element={<S><EpicPlanningPage /></S>} />
        <Route path="/items/epics/estimation" element={<S><EpicEstimationPage /></S>} />
        <Route path="/items/tasks" element={<S><Tasks /></S>} />
        <Route path="/items/impediments" element={<S><Impediments /></S>} />
        <Route path="/items/release-vehicles" element={<S><ReleaseVehicles /></S>} />
        <Route path="/items/success-criteria" element={<S><SuccessCriteria /></S>} />
        <Route path="/portfolio-kanban" element={<S><PortfolioKanban /></S>} />
        <Route path="/portfolio-roadmap" element={<S><PortfolioRoadmap /></S>} />
        <Route path="/roadmaps" element={<S><Roadmaps /></S>} />
        <Route path="/dependencies" element={<S><DependenciesPage /></S>} />
        <Route path="/reports/dependencies/maps" element={<S><DependencyMapsPage /></S>} />
        <Route path="/work-spend-grid" element={<S><WorkSpendGrid /></S>} />
        <Route path="/portfolio-insights" element={<S><EnterpriseComingSoon /></S>} />

        <Route path="/program-room" element={<Navigate to="/for-you" replace />} />
        <Route path="/pis" element={<S><PlaceholderPage /></S>} />
        <Route path="/program-board" element={<Navigate to="/for-you" replace />} />
        <Route path="/pi-objectives" element={<S><PIObjectives /></S>} />
        <Route path="/capacity" element={<S><CapacityPlanningPage /></S>} />
        <Route path="/risks" element={<S><RisksGridPage /></S>} />
        <Route path="/risk-roam-report" element={<S><RiskRoamReportPage /></S>} />
        <Route path="/release-train-calendar" element={<div className="p-8"><div style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-700)', fontWeight: 700, color: 'var(--cp-ink-1, var(--cp-ink-1))', letterSpacing: '-0.3px' }}>Release Calendar</div><p className="text-muted-foreground">Coming soon</p></div>} />
        <Route path="/program-backlog" element={<div className="p-8"><div style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-700)', fontWeight: 700, color: 'var(--cp-ink-1, var(--cp-ink-1))', letterSpacing: '-0.3px' }}>Program Backlog</div><p className="text-muted-foreground">Coming soon</p></div>} />

        <Route path="/projects" element={<Navigate to="/project-hub/projects" replace />} />
        <Route path="/projects/:projectKey" element={<Navigate to="/project-hub/projects" replace />} />
        <Route path="/projects/:projectKey/summary" element={<Navigate to="/project-hub/projects" replace />} />
        <Route path="/workhub/all-work" element={<S><WorkHubAllWork /></S>} />
        <Route path="/workhub" element={<Navigate to="/project-hub" replace />} />
        <Route path="/projecthub" element={<Navigate to="/project-hub" replace />} />
        <Route path="/projecthub/resource360" element={<Navigate to="/me" replace />} />
        <Route path="/projecthub/resource360/:id" element={<Resource360Redirect />} />
        <Route path="/resource-360/:resourceId" element={<ResourceLegacyToCanonical />} />

        <Route path="/projects/:projectKey/settings" element={<S><ProjectSettingsPage /></S>} />
        <Route path="/projects/:projectId/features" element={<S><FeaturesPage /></S>} />
        <Route path="/projects/:projectId/features/:featureId" element={<S><FeatureDetailPage /></S>} />

        <Route path="/projects/:projectId" element={<S><ProjectWorkspace /></S>}>
          <Route path="board" element={<S><BoardView /></S>} />
          <Route path="timeline" element={<S><TimelineView /></S>} />
          <Route path="feature-map" element={<div className="h-full flex items-center justify-center text-muted-foreground">Feature Map View - Coming Soon</div>} />
        </Route>

        <Route path="/projects/:projectId/boards" element={<S><BoardManagerPage /></S>} />
        <Route path="/projects/:projectId/boards/:boardId" element={<S><BoardCanvasPage /></S>} />
        <Route path="/projects/:projectId/work" element={<S><ProjectWorkHubPage /></S>} />
        <Route path="/projects/:projectId/backlog" element={<S><ProjectBacklogPage /></S>} />
        <Route path="/projects/:projectId/roadmap" element={<S><ProjectComingSoonPage pageTitle="Roadmap" /></S>} />
        <Route path="/projects/:projectId/dependencies" element={<S><ProjectComingSoonPage pageTitle="Dependencies" /></S>} />
        <Route path="/projects/:projectId/reports" element={<S><ProjectComingSoonPage pageTitle="Reports" /></S>} />
        <Route path="/project/:projectId/work" element={<S><ProjectWorkHubPage /></S>} />

        <Route path="/project/:projectKey" element={<S><InJiraLayout /></S>}>
          <Route index element={<Navigate to="summary" replace />} />
          <Route path="summary" element={<S><InJiraSummaryPage /></S>} />
          <Route path="list" element={<S><InJiraListPage /></S>} />
          <Route path="all-work" element={<S><InJiraAllWorkPage /></S>} />
          <Route path="boards/kanban" element={<S><KanbanBoardPage /></S>} />
          <Route path="boards/scrum" element={<S><ScrumBoardPage /></S>} />
          <Route path="releases" element={<S><InJiraReleasesPage /></S>} />
          <Route path="release-management" element={<S><ReleaseManagementPage /></S>} />
          <Route path="settings" element={<S><InJiraSettingsPage /></S>} />
        </Route>

        <Route path="/team-room" element={<S><TeamRoom /></S>} />
        <Route path="/backlog" element={<S><Backlog /></S>} />
        <Route path="/backlog-phase2" element={<Navigate to="/backlog" replace />} />
        <Route path="/sprints" element={<S><Sprints /></S>} />
        <Route path="/sprint-board" element={<S><SprintBoard /></S>} />
        <Route path="/stories" element={<S><Stories /></S>} />
        <Route path="/work-items/stories" element={<S><Stories /></S>} />
        <Route path="/work-items/subtasks" element={<S><Subtasks /></S>} />
        <Route path="/releases/*" element={<Navigate to="/release-hub/overview" replace />} />

        <Route path="/unauthorized" element={<S><UnauthorizedPage /></S>} />

        {/* Knowledge Hub absorbed into Wiki — legacy UUID URLs redirect to slug routes */}
        <Route path="/knowledge-hub" element={<Navigate to="/docex" replace />} />
        <Route path="/knowledge-hub/spaces/:spaceId" element={<S><LegacySpaceRedirect /></S>} />
        <Route path="/knowledge-hub/documents/:documentId" element={<S><LegacyDocumentRedirect /></S>} />

        <Route path="/release" element={<Navigate to="/release/incidents" replace />} />
        <Route path="/release/incidents" element={<S><IncidentRoomList /></S>} />
        <Route path="/release/incidents/dashboard" element={<S><IncidentsDashboard /></S>} />
        <Route path="/release/incidents/analytics" element={<S><IncidentAnalyticsPage /></S>} />
        <Route path="/release/incidents/insights" element={<S><IncidentInsightsPage /></S>} />
        <Route path="/release/incidents/kanban" element={<S><IncidentKanbanPage /></S>} />
        <Route path="/release/incidents/create" element={<S><CreateIncident /></S>} />
        <Route path="/release/incidents/reports" element={<S><IncidentReports /></S>} />
        <Route path="/release/incidents/:incidentId" element={<S><IncidentRoomDetail /></S>} />
        <Route path="/release/incident-room" element={<Navigate to="/release/incidents" replace />} />
        <Route path="/release/incident-room/:incidentId" element={<Navigate to="/release/incidents/:incidentId" replace />} />
        <Route path="/release/incident-reports" element={<Navigate to="/release/incidents/reports" replace />} />
        <Route path="/release/incident-command-center" element={<S><IncidentCommandCenter /></S>} />
        <Route path="/release/committee-queue" element={<S><CommitteeQueue /></S>} />

        <Route path="/insights/portfolio" element={<S><EnterpriseComingSoon /></S>} />
        <Route path="/insights/program" element={<S><EnterpriseComingSoon /></S>} />
        <Route path="/insights/team" element={<S><EnterpriseComingSoon /></S>} />
        <Route path="/insights/predictability" element={<S><EnterpriseComingSoon /></S>} />
        <Route path="/insights/dependency-risk" element={<S><EnterpriseComingSoon /></S>} />


        <Route path="/admin" element={<S><AdminLayout /></S>}>
          <Route index element={<Navigate to="/admin/access" replace />} />
          {/* DEPRECATED 2026-06-20 — removed pages redirect to /admin/access */}
          <Route path="overview" element={<Navigate to="/admin/access" replace />} />
          <Route path="user-access" element={<Navigate to="/admin/access" replace />} />
          <Route path="roles-permissions" element={<Navigate to="/admin/access" replace />} />
          <Route path="feature-flags" element={<Navigate to="/admin/access" replace />} />
          <Route path="resource-assignments" element={<Navigate to="/admin/access" replace />} />
          <Route path="settings/notifications" element={<Navigate to="/admin/access" replace />} />
          <Route path="notification-triggers" element={<Navigate to="/admin/access" replace />} />
          <Route path="components" element={<Navigate to="/admin/access" replace />} />
          <Route path="departments" element={<Navigate to="/admin/access" replace />} />
          <Route path="business-owners" element={<Navigate to="/admin/access" replace />} />
          <Route path="access" element={<S><AdminAccessPage /></S>} />
          <Route path="capacity-departments" element={<S><CapacityDepartmentsPage /></S>} />
          <Route path="workflows" element={<S><WorkflowStudioPage /></S>} />
          <Route path="workflows/classic" element={<S><WorkflowAdminPage /></S>} />
          <Route path="workflows/versions" element={<S><WorkflowVersioningPage /></S>} />
          <Route path="workflows/:versionId/edit" element={<S><WorkflowEditorPage /></S>} />
          <Route path="test-ops" element={<S><TestOpsPage /></S>} />
          <Route path="release-ops" element={<S><ReleaseOpsAdminPage /></S>} />
          <Route path="quarters" element={<S><QuartersAdminPage /></S>} />
          {/* ── Connections hub (/admin/connections/*) — 2026-06-21 ─────────────
              Replaces the old /admin/workhub/* section. Each integration owns
              a page; old workhub paths redirect for backward compatibility.    */}
          <Route path="connections" element={<Navigate to="/admin/connections/jira" replace />} />
          <Route path="connections/jira" element={<S><JiraSyncPage /></S>} />
          <Route path="workflows/hierarchy" element={<S><WorkHubHierarchyPage /></S>} />
          <Route path="connections/jira/hierarchy" element={<Navigate to="/admin/workflows/hierarchy" replace />} />
          <Route path="connections/notion" element={<S><NotionConnectionPage /></S>} />
          <Route path="connections/vercel" element={<S><VercelConnectionPage /></S>} />
          {/* Backward-compat redirects — old workhub/* paths */}
          <Route path="workhub-connection" element={<Navigate to="/admin/connections/jira" replace />} />
          <Route path="workhub" element={<Navigate to="/admin/connections/jira" replace />} />
          <Route path="workhub/jira-connection" element={<Navigate to="/admin/connections/jira" replace />} />
          <Route path="workhub/hierarchy-mapping" element={<Navigate to="/admin/workflows/hierarchy" replace />} />
          {/* DEPRECATED — user-mapping, sync-logs, jira-user-sync */}
          <Route path="workhub/user-mapping" element={<Navigate to="/admin/connections/jira" replace />} />
          <Route path="jira-user-sync" element={<Navigate to="/admin/connections/jira" replace />} />
          <Route path="workhub/sync-logs" element={<Navigate to="/admin/connections/jira" replace />} />
          <Route path="workhub/jira-sync-control" element={<Navigate to="/admin/connections/jira" replace />} />
          <Route path="workhub/activity-sync" element={<Navigate to="/admin/connections/jira" replace />} />
          <Route path="workhub/*" element={<Navigate to="/admin/connections/jira" replace />} />
          <Route path="ai-governance/translations" element={<S><AiTranslationsAuditPage /></S>} />
          <Route path="governance" element={<S><GovernanceSettings /></S>} />
          <Route path="storybook" element={<S><AdminStorybookPage /></S>} />
          {/* RESET ICONS — runtime asset override management. Admin-only. */}
          <Route path="icons" element={<S><AdminIconsPage /></S>} />
          <Route path="avatars" element={<S><AdminAvatarsPage /></S>} />
          <Route path="routing-taxonomy" element={<S><RoutingTaxonomyPageLazy /></S>} />
          <Route path="resources" element={<S><RouteRoleGuard><ResourceListingPageLazy /></RouteRoleGuard></S>} />
          <Route path="resources/:resourceId" element={<S><RouteRoleGuard><R360MemberDetailLazy /></RouteRoleGuard></S>} />
          {/* Field Layout System — /admin/fields + /admin/fields/layout */}
          <Route path="fields" element={<S><FieldRegistryPage /></S>} />
          <Route path="fields/layout" element={<S><FieldLayoutPage /></S>} />
          {/* Test Hub admin */}
          <Route path="test/priorities"    element={<S><TestAdminPrioritiesPage /></S>} />
          <Route path="test/case-types"    element={<S><TestAdminCaseTypesPage /></S>} />
          <Route path="test/case-statuses" element={<S><TestAdminCaseStatusesPage /></S>} />
          <Route path="test/run-statuses"  element={<S><TestAdminRunStatusesPage /></S>} />
          <Route path="test/permissions"   element={<S><TestAdminPermissionsPage /></S>} />
          {/* RBAC Admin — mock-safe mode; RBAC_SCHEMA_DEPLOYED=false */}
          <Route path="roles"        element={<S><RolesAdminPageLazy /></S>} />
          <Route path="permissions"  element={<S><PermissionsAdminPageLazy /></S>} />
          <Route path="ai-assistant" element={<S><AiAccessPageLazy /></S>} />
        </Route>

        {/* /ads-validator — design governance audit viewer; aliased to canonical admin governance page */}
        <Route path="/ads-validator" element={<Navigate to="/admin/governance" replace />} />

        {/* Admin v2 — deprecated 2026-05-09. Redirects to /admin/* canonical shell. */}
        <Route path="/admin/v2/*" element={<Navigate to="/admin/access" replace />} />

        <Route path="/value-stream" element={<S><ValueStreamView /></S>} />
        <Route path="/profile" element={<S><UserProfile /></S>} />
        {/* /for-you/archives mounted in App.tsx inside the ForYouShell parent.
            Keeping only the legacy redirect here. */}
        <Route path="/profile/archives" element={<Navigate to="/for-you/archives" replace />} />
        <Route path="/items/:type" element={<S><PlaceholderPage /></S>} />

        {/* /project-hub root redirect mounted in App.tsx — removing local dup */}
        <Route path="/project-hub/projects" element={<S><AllProjectsPageLazy /></S>} />
        <Route path="/project/all-projects" element={<S><AllProjectsPageLazy /></S>} />
        <Route path="/project-hub/projects-legacy" element={<S><ProjectListPageLazy /></S>} />
        <Route path="/project-hub/portfolio-health" element={<S><div className="flex h-full items-center justify-center" style={{ color: 'var(--text-3)' }}>Portfolio Health — Coming Soon</div></S>} />
        <Route path="/me" element={<S><MyResource360PageLazy /></S>} />
        <Route path="/my-team" element={<S><MyTeamPageLazy /></S>} />
        <Route path="/my-team/:resourceId" element={<S><R360MemberDetailLazy /></S>} />
        <Route path="/project-hub/resources" element={<Navigate to="/admin/resources" replace />} />
        <Route path="/project-hub/resources/:resourceId" element={<NavigateAdminResourceId />} />
        <Route path="/project-hub/resources-v2" element={<Navigate to="/admin/resources" replace />} />
        <Route path="/project-hub/resources-v2/:resourceId" element={<NavigateAdminResourceId />} />
        {/* /project-hub/resource360 (no id) → user's own R360 ("/me").
            /project-hub/resource360/:id → preserve :id (Resource360Redirect). */}
        <Route path="/project-hub/resource360" element={<Navigate to="/me" replace />} />
        <Route path="/project-hub/resource360/:id" element={<Resource360Redirect />} />
        <Route path="/project-hub/resource-360/:resourceId" element={<S><Resource360PageNew /></S>} />
        <Route path="/resource360/members/:memberId" element={<S><Resource360MemberDetail /></S>} />
        <Route path="/resources" element={<S><R360ProfilePageLazy /></S>} />
        <Route path="/project-hub/:key" element={<Navigate to="dashboard" replace />} />
        <Route path="/project-hub/:key/dashboard" element={<S><ProjectDashboardPageLazy /></S>} />
        {/* 2026-06-15: standup history (sidebar tab retired). */}
        <Route path="/project-hub/:key/standups" element={<S><StandupHistoryPageLazy /></S>} />
        <Route path="/project-hub/:key/settings" element={<S><PHProjectSettingsPageLazy /></S>} />
        <Route path="/project-hub/:key/backlog" element={<S><UnifiedBacklogPageLazy /></S>} />
        <Route path="/project-hub/:key/backlog/:issueKey" element={<S><BacklogDetailPageLazy /></S>} />
        {/* Legacy per-type backlog pages — deprecated 2026-04. The unified
            Backlog above combines all work-item types (Epics, Features,
            Stories, Tasks, QA Bugs, Production Incidents, Change Requests,
            Business Gaps, API Requirements). These three paths redirect so
            bookmarks keep working; the source files remain on disk untouched. */}
        <Route path="/project-hub/:key/epic-backlog" element={<LegacyBacklogRedirect />} />
        <Route path="/project-hub/:key/feature-backlog" element={<LegacyBacklogRedirect />} />
        <Route path="/project-hub/:key/story-backlog" element={<LegacyBacklogRedirect />} />
        <Route path="/project-hub/:key/story/:itemId" element={<S><StoryDetailPageLazy /></S>} />
        <Route path="/project-hub/:key/issue/:issueKey" element={<IssueRedirectToBrowse />} />
        <Route path="/project-hub/:key/board" element={<S><KanbanFeaturePageLazy /></S>} />
        <Route path="/project-hub/:key/boards" element={<S><ProjectBoardManagerPageLazy /></S>} />
        <Route path="/project-hub/:key/boards/:boardSlug/map-statuses" element={<S><MapStatusesPageLazy /></S>} />
        <Route path="/project-hub/:key/boards/:boardSlug/settings" element={<S><ProjectBoardSettingsPageLazy /></S>} />
        <Route path="/project-hub/:key/boards/:boardSlug/settings/:section" element={<S><ProjectBoardSettingsPageLazy /></S>} />
        {/* Board view: /project-hub/:key/boards/:boardSlug renders kanban for the specified board. */}
        <Route path="/project-hub/:key/boards/:boardSlug" element={<S><KanbanFeaturePageLazy /></S>} />
        {/* Deprecated: legacy /kanban route → board manager. */}
        <Route path="/project-hub/:key/kanban" element={<LegacyKanbanRedirect />} />
        <Route path="/project-hub/:key/roadmaps" element={<S><RoadmapsListPageLazy /></S>} />
        <Route path="/project-hub/:key/roadmaps/:id" element={<S><FilterRoadmapPageLazy /></S>} />
        <Route path="/project-hub/:key/dashboards/:id" element={<S><FilterDashboardPageLazy /></S>} />
        <Route path="/project-hub/:key/list" element={<S><ProjectJiraLayoutLazy /></S>} />
        <Route path="/project-hub/:key/allwork/:issueKey" element={<S><AllWorkDetailPageLazy /></S>} />
        <Route path="/project-hub/:key/allwork" element={<S><ProjectJiraLayoutLazy /></S>} />
        <Route path="/project-hub/:key/filters" element={<S><FiltersListPageLazy /></S>} />
        <Route path="/project-hub/:key/filters/create" element={<S><FilterPreviewPageLazy /></S>} />
        <Route path="/project-hub/:key/filters/:filterId" element={<S><FilterPreviewPageLazy /></S>} />
        <Route path="/project-hub/filters" element={<S><FiltersListPageLazy /></S>} />
        <Route path="/project-hub/filters/create" element={<Navigate to="/project-hub" replace />} />
        <Route path="/project-hub/:key/timeline/:issueKey" element={<S><TimelineDetailPageLazy /></S>} />
        <Route path="/project-hub/:key/timeline" element={<S><ProjectHubTimelinePage /></S>} />
        <Route path="/project-hub/:key/releases" element={<S><ReleasesPageLazy /></S>} />
        <Route path="/project-hub/:key/dependencies" element={<S><DependenciesPageLazy /></S>} />
        {/* 2026-06-26: Sprints (project-hub clone of release-hub releases-management). */}
        <Route path="/project-hub/:key/sprints" element={<S><SprintsPageLazy /></S>} />
        <Route path="/project-hub/:key/sprints/:sprintSlug" element={<S><SprintDetailPageLazy /></S>} />
        <Route path="/project-hub/:key/sprints/:sprintSlug/work" element={<S><SprintWorkNavigatorPageLazy /></S>} />
        <Route path="/project-hub/:key/reports" element={<PHPlaceholder title="Reports" phase="Phase 4" />} />
        <Route path="/project-hub/:key/sprint-predictor" element={<PHPlaceholder title="Sprint Predictor" phase="Phase 5" />} />
        <Route path="/project-hub/:key/risk-scanner" element={<PHPlaceholder title="Risk Scanner" phase="Phase 5" />} />
      </Routes>
      <KnowledgeAssistFabRouteGuard />
    </>
  );
}
