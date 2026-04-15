import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { ENABLE_AI, ENABLE_WIKI, ENABLE_KNOWLEDGE_HUB, ENABLE_HEAVY_EXPORTS } from '../lib/featureFlags';
import { FeatureComingSoon } from '../components/common/FeatureComingSoon';
import { ModuleGate } from '../components/common/ModuleGate';
import { ProtectedRoute } from "../components/ProtectedRoute";
import { ErrorBoundary } from "../components/ErrorBoundary";

const FeatureFlagsPage = lazy(() => import("../pages/admin/FeatureFlagsPage"));

// ─── Lazy page imports ───────────────────────────────────────────
const KBAdminSetup = ENABLE_AI ? lazy(() => import("../pages/KBAdminSetup")) : () => <FeatureComingSoon title="KB Admin" />;
const KBAdminPage = ENABLE_AI ? lazy(() => import("../pages/KBAdminPage")) : () => <FeatureComingSoon title="KB Admin" />;
const KBDataAuditPage = ENABLE_AI ? lazy(() => import("../pages/KBDataAudit")) : () => <FeatureComingSoon title="KB Data Audit" />;
const RAGAuditPage = ENABLE_AI ? lazy(() => import("../pages/RAGAuditPage")) : () => <FeatureComingSoon title="RAG Audit" />;
const WikiAdminPage = ENABLE_WIKI ? lazy(() => import("../pages/admin/WikiAdminPage")) : () => <FeatureComingSoon title="Wiki Admin" />;
const WikiDiagnosticPage = ENABLE_WIKI ? lazy(() => import("../pages/admin/WikiDiagnosticPage")) : () => <FeatureComingSoon title="Wiki Diagnostic" />;
const AdminDiagnosticPage = lazy(() => import("../pages/admin/AdminDiagnosticPage"));

const Resource360PageNew = lazy(() => import("../components/resource360/Resource360PageNew"));
const Resource360MemberDetail = lazy(() => import("../pages/Resource360MemberDetail"));
const ResourceListingPageLazy = lazy(() => import("../pages/ResourceListingPage"));
const R360MemberDetailLazy = lazy(() => import("../pages/R360MemberDetail"));
const R360ProfilePageLazy = lazy(() => import("../pages/R360ProfilePage"));

// ProjectHub V5
const ProjectHubShellLazy = lazy(() => import("../components/project-hub/ProjectHubShell").then(m => ({ default: m.ProjectHubShell })));
const ProjectListPageLazy = lazy(() => import("../pages/project-hub/ProjectListPage"));
const ProjectDashboardPageLazy = lazy(() => import("../pages/project-hub/ProjectDashboardPage"));
const PHProjectSettingsPageLazy = lazy(() => import("../pages/project-hub/ProjectSettingsPage"));
const WorkItemsListPageLazy = lazy(() => import("../pages/project-hub/WorkItemsListPage"));
const ProjectBoardPageLazy = lazy(() => import("../pages/project-hub/ProjectBoardPage"));
const ProjectBoardManagerPageLazy = lazy(() => import("../pages/project-hub/ProjectBoardManagerPage"));
const ProjectBoardCanvasPageLazy = lazy(() => import("../pages/project-hub/ProjectBoardCanvasPage"));
const KanbanBoardPageLazy = lazy(() => import("../pages/project-hub/KanbanBoardPage"));
const AllProjectsPageLazy = lazy(() => import("../pages/project-hub/AllProjectsPage"));
const NativeEpicBacklogPageLazy = lazy(() => import("../pages/project-hub/NativeEpicBacklogPage"));
const NativeFeatureBacklogPageLazy = lazy(() => import("../pages/project-hub/NativeFeatureBacklogPage"));
const NativeStoryBacklogPageLazy = lazy(() => import("../pages/project-hub/NativeStoryBacklogPage"));
const StoryDetailPageLazy = lazy(() => import("../pages/project-hub/StoryDetailPage"));
const IssueDetailPageLazy = lazy(() => import("../pages/project-hub/IssueDetailPage"));
const HierarchyPageLazy = lazy(() => import("../pages/project-hub/HierarchyPage"));
const ProjectJiraLayoutLazy = lazy(() => import("../pages/project-hub/jira-list/ProjectJiraLayout"));
const HierarchyAllWorkPageLazy = lazy(() => import("../pages/project-hub/HierarchyAllWorkPage"));
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
  return <Suspense fallback={<div className="p-8">Loading...</div>}><PHPlaceholderBase title={title} phase={phase} description={PH_DESCRIPTIONS_MAP[title] || `Coming in ${phase}`} /></Suspense>;
}

const ProductionEventsPageLazy = lazy(() => import("../pages/releasehub/ProductionEventsPage"));
const RH21CommandCenterPage = lazy(() => import("../pages/releasehub/CommandCenterPage"));
const RH21AllReleasesPage = lazy(() => import("../pages/releasehub/AllReleasesPage"));
const RH21ReleaseComparePage = lazy(() => import("../pages/releasehub/ReleaseComparePage"));
const RH21TriageQueuePage = lazy(() => import("../pages/releasehub/TriageQueuePage"));
const RH21AllChangesPage = lazy(() => import("../pages/releasehub/AllChangesPage"));
const RH21SignOffQueuePage = lazy(() => import("../pages/releasehub/SignOffQueuePage"));
const RH21FreezeWindowsPage = lazy(() => import("../pages/releasehub/FreezeWindowsPage"));

const StrategicThemesPage = lazy(() => import("../pages/strategyhub/StrategicThemesPage"));
const GoalsKeyResultsPage = lazy(() => import("../pages/strategyhub/GoalsKeyResultsPage"));
const InitiativeListingPage = lazy(() => import("../pages/producthub/InitiativeListingPage"));
const RoadmapPage = lazy(() => import("../pages/producthub/RoadmapPage"));
const ProductKanbanPage = lazy(() => import("../pages/producthub/KanbanPage"));
const RequirementAssistWorkspace = ENABLE_AI ? lazy(() => import("../pages/producthub/requirement-assist/index")) : () => <FeatureComingSoon title="Requirement Assist" />;
const RequirementAssistCompose = ENABLE_AI ? lazy(() => import("../pages/producthub/requirement-assist/compose")) : () => <FeatureComingSoon title="Requirement Assist" />;
const RequirementAssistCategories = ENABLE_AI ? lazy(() => import("../pages/producthub/requirement-assist/categories")) : () => <FeatureComingSoon title="Requirement Assist" />;
const RequirementAssistOutput = ENABLE_AI ? lazy(() => import("../pages/producthub/requirement-assist/output")) : () => <FeatureComingSoon title="Requirement Assist" />;
const ProductCardsPage = lazy(() => import("../pages/producthub/CardsPage"));
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
const IncidentHubAnalyticsPage = lazy(() => import("../pages/incidenthub/IncidentAnalyticsPage"));
const IncidentHubInsightsPage = lazy(() => import("../pages/incidenthub/IncidentInsightsPage"));
const IncidentHubReportsPage = lazy(() => import("../pages/incidenthub/IncidentReportsPage"));
const IncidentHubCommitteeQueuePage = lazy(() => import("../pages/incidenthub/CommitteeQueuePage"));
const IncidentHubDetailPage = lazy(() => import("../pages/incidenthub/IncidentDetailPage"));

const WikiHomePage = ENABLE_WIKI ? lazy(() => import("../pages/wiki/WikiHomePage")) : () => <FeatureComingSoon title="Wiki" />;
const WikiSearchPage = ENABLE_WIKI ? lazy(() => import("../pages/wiki/WikiSearchPage")) : () => <FeatureComingSoon title="Wiki Search" />;
const WikiCategoryPage = ENABLE_WIKI ? lazy(() => import("../pages/wiki/WikiCategoryPage")) : () => <FeatureComingSoon title="Wiki" />;
const WikiArticlePage = ENABLE_WIKI ? lazy(() => import("../pages/wiki/WikiArticlePage")) : () => <FeatureComingSoon title="Wiki" />;
const WikiWhatsNewPage = ENABLE_WIKI ? lazy(() => import("../pages/wiki/WikiWhatsNewPage")) : () => <FeatureComingSoon title="Wiki" />;
const WikiLearningPathsPage = ENABLE_WIKI ? lazy(() => import("../pages/wiki/WikiLearningPathsPage")) : () => <FeatureComingSoon title="Wiki" />;
const WikiLearningPathDetailPage = ENABLE_WIKI ? lazy(() => import("../pages/wiki/WikiLearningPathDetailPage")) : () => <FeatureComingSoon title="Wiki" />;
const WikiSubscriptionsPage = ENABLE_WIKI ? lazy(() => import("../pages/wiki/WikiSubscriptionsPage")) : () => <FeatureComingSoon title="Wiki" />;
const WikiAllArticlesPage = ENABLE_WIKI ? lazy(() => import("../pages/wiki/WikiAllArticlesPage")) : () => <FeatureComingSoon title="Wiki" />;
const WikiVerificationPage = ENABLE_WIKI ? lazy(() => import("../pages/wiki/WikiVerificationPage")) : () => <FeatureComingSoon title="Wiki" />;
const WikiAnalyticsPage = ENABLE_WIKI ? lazy(() => import("../pages/wiki/WikiAnalyticsPage")) : () => <FeatureComingSoon title="Wiki" />;
const WikiTemplatesPage = ENABLE_WIKI ? lazy(() => import("../pages/wiki/WikiTemplatesPage")) : () => <FeatureComingSoon title="Wiki" />;
const WikiKnowledgeGraphPage = (ENABLE_AI && ENABLE_WIKI) ? lazy(() => import("../pages/wiki/WikiKnowledgeGraphPage")) : () => <FeatureComingSoon title="Knowledge Graph" />;

const CatyFabPlaceholderLazy = ENABLE_AI ? lazy(() => import("../components/caty/CatyFabPlaceholder").then(m => ({ default: m.CatyFabPlaceholder }))) : () => null;
const QAAssistantFabLazy = ENABLE_AI ? lazy(() => import("../components/testhub-ai").then(m => ({ default: m.QAAssistantFab }))) : () => null;
const KnowledgeAssistFabLazy = ENABLE_AI ? lazy(() => import("../components/kb/KAFab").then(m => ({ default: m.KAFab }))) : () => null;

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
const StrategyRoom = lazy(() => import("../pages/strategy/StrategyRoom"));
const StrategyComingSoon = lazy(() => import("../pages/strategy/StrategyComingSoon"));
const CapacityPlannerPage = lazy(() => import("../pages/enterprise/CapacityPlannerPage"));
const BudgetGovernancePage = lazy(() => import("../pages/enterprise/BudgetGovernancePage"));
const BudgetPlannerPage = lazy(() => import("../pages/enterprise/BudgetPlannerPage"));

const Themes = lazy(() => import("../pages/Themes"));
const Initiatives = lazy(() => import("../pages/Initiatives"));
const EpicsPage = lazy(() => import("../pages/items/EpicsPage"));
const EpicsRecycleBinPage = lazy(() => import("../pages/items/EpicsRecycleBinPage"));
const EpicsCanceledPage = lazy(() => import("../pages/items/EpicsCanceledPage"));
const EpicStatusReport = lazy(() => import("../pages/items/reports/EpicStatusReport"));
const EpicTraceReport = lazy(() => import("../pages/items/reports/EpicTraceReport"));
const EpicRequirementHierarchy = lazy(() => import("../pages/items/reports/EpicRequirementHierarchy"));
const EpicResponsibilityMatrix = lazy(() => import("../pages/items/reports/EpicResponsibilityMatrix"));
const EpicPlanningPage = lazy(() => import("../pages/items/reports/EpicPlanningPage"));
const EpicEstimationPage = lazy(() => import("../pages/items/EpicEstimationPage"));
const EpicBacklogWithSidebar = lazy(() => import("../pages/EpicBacklogWithSidebar"));
const Features = lazy(() => import("../pages/Features"));
const FeaturesPage = lazy(() => import("../pages/items/FeaturesPage"));
const FeaturesBacklog = lazy(() => import("../pages/FeaturesBacklog"));
const FeaturePrioritizationView = lazy(() => import("../pages/items/FeaturePrioritizationView"));
const FeatureDetailPage = lazy(() => import("../pages/project/FeatureDetailPage"));
const FeatureBacklogPage = lazy(() => import("../modules/feature-backlog/pages/FeatureBacklogPage"));
const ProjectWorkspace = lazy(() => import("../pages/project/ProjectWorkspace"));
const BoardView = lazy(() => import("../pages/project/BoardView"));
const TimelineView = lazy(() => import("../pages/project/TimelineView"));
const BoardManagerPage = lazy(() => import("../components/boards/BoardManagerPage"));
const BoardCanvasPage = lazy(() => import("../components/boards/BoardCanvasPage"));
const EpicBalancingPage = lazy(() => import("../modules/epic-balancing").then(m => ({ default: m.EpicBalancingPage })));
const UserNotificationSettingsPage = lazy(() => import("../pages/UserNotificationSettingsPage"));
const PlannerPage = lazy(() => import("../modules/planner").then(m => ({ default: m.PlannerPage })));
const KanbanPage = lazy(() => import("../modules/planner").then(m => ({ default: m.KanbanPage })));
const MyTasksPage = lazy(() => import("../modules/planner").then(m => ({ default: m.MyTasksPage })));

const TestHubPage = lazy(() => import("../pages/testhub/TestHubPage"));
const TestHubVerifyPage = lazy(() => import("../pages/testhub/TestHubVerifyPage"));
const TestRepositoryPage = lazy(() => import("../pages/testhub/TestRepositoryPage"));
const TestHubDashboardPage = lazy(() => import("../pages/testhub/TestHubDashboardPage"));
const SharedStepsPage = lazy(() => import("../pages/testhub/SharedStepsPage"));
const SharedStepDetailPage = lazy(() => import("../pages/testhub/SharedStepDetailPage"));
const TestSetsPage = lazy(() => import("../pages/testhub/TestSetsPage"));
const TestSetDetailPage = lazy(() => import("../pages/testhub/TestSetDetailPage"));
const TestCyclesPage = lazy(() => import("../pages/testhub/TestCyclesPage"));
const TestCycleDetailPage = lazy(() => import("../pages/testhub/TestCycleDetailPage"));
const CycleReportPage = lazy(() => import("../pages/testhub/CycleReportPage"));
const ExecutionHubPage = lazy(() => import("../pages/testhub/ExecutionHubPage"));
const TestHubExecutionPage = lazy(() => import("../pages/testhub/TestHubExecutionPage"));
const TestRunsPage = lazy(() => import("../pages/testhub/TestRunsPage"));
const TestPlansListPage = lazy(() => import("../pages/testhub/TestPlansListPage"));
const PlanDetailPage = lazy(() => import("../pages/testhub/PlanDetailPage"));
const TestHubDefectsPage = lazy(() => import("../pages/testhub/DefectsPage"));
const DefectDetailPage = lazy(() => import("../pages/testhub/DefectDetailPage"));
const TestHubRequirementsPage = lazy(() => import("../pages/testhub/RequirementsListPage"));
const RequirementDetailPage = lazy(() => import("../pages/testhub/RequirementDetailPage"));
const CoverageMatrixPage = lazy(() => import("../pages/testhub/CoverageMatrixPage"));
const EnvironmentsListPage = lazy(() => import("../pages/testhub/EnvironmentsListPage"));
const EnvironmentDetailPage = lazy(() => import("../pages/testhub/EnvironmentDetailPage"));
const TraceabilityPage = lazy(() => import("../pages/testhub/TraceabilityPage"));
const TestHubReportsPage = lazy(() => import("../pages/testhub/ReportsListPage"));
const ReportDetailPage = lazy(() => import("../pages/testhub/ReportDetailPage"));
const TagsListPage = lazy(() => import("../pages/testhub/TagsListPage"));
const TestHubSettingsPage = lazy(() => import("../pages/testhub/SettingsPage"));
const ActivityFeedPage = lazy(() => import("../pages/testhub/ActivityFeedPage"));
const ImportExportPage = lazy(() => import("../pages/testhub/ImportExportPage"));
const ReleasesListPage = lazy(() => import("../pages/testhub/ReleasesListPage"));
const ReleaseDetailPage = lazy(() => import("../pages/testhub/ReleaseDetailPage"));
const CommandCenterPage = lazy(() => import("../pages/testhub/CommandCenterPage"));
const CatyAIPage = ENABLE_AI ? lazy(() => import("../pages/testhub/CatyAIPage")) : () => <FeatureComingSoon title="Caty AI" />;
const TestHubDocsPage = lazy(() => import("../pages/testhub/TestHubDocsPage"));
const QualityGatesPage = lazy(() => import("../pages/releases/QualityGatesPage"));
const MyTestScopePage = lazy(() => import("../pages/testhub/MyTestScopePage"));

const T10LandingPage = lazy(() => import("../modules/task10/pages/T10LandingPage").then(m => ({ default: m.T10LandingPage })));
const T10WeekPage = lazy(() => import("../modules/task10/pages/T10WeekPage").then(m => ({ default: m.T10WeekPage })));
const T10WeekPageV3 = lazy(() => import("../modules/task10/pages/T10WeekPageV3").then(m => ({ default: m.T10WeekPageV3 })));
const T10CompletedPage = lazy(() => import("../modules/task10/pages/T10CompletedPage").then(m => ({ default: m.T10CompletedPage })));

const PlanLibraryPage = lazy(() => import("../pages/planhub").then(m => ({ default: m.PlanLibraryPage })));
const PlanEditorPage = lazy(() => import("../pages/planhub").then(m => ({ default: m.PlanEditorPage })));
const ScenarioComparePage = lazy(() => import("../pages/planhub").then(m => ({ default: m.ScenarioComparePage })));
const MasterPlanPage = lazy(() => import("../pages/planhub").then(m => ({ default: m.MasterPlanPage })));
const PlanHubResourcesPage = lazy(() => import("../pages/planhub").then(m => ({ default: m.ResourcesPage })));
const PlanHubAIPage = ENABLE_AI ? lazy(() => import("../pages/planhub").then(m => ({ default: m.AIAssistantPage }))) : () => <FeatureComingSoon title="PlanHub AI" />;
const PlanHubReportsPage = lazy(() => import("../pages/planhub").then(m => ({ default: m.ReportCenterPage })));

const Defects = lazy(() => import("../pages/Defects"));
const Tasks = lazy(() => import("../pages/Tasks"));
const Impediments = lazy(() => import("../pages/Impediments"));
const ReleaseVehicles = lazy(() => import("../pages/ReleaseVehicles"));
const SuccessCriteria = lazy(() => import("../pages/SuccessCriteria"));
const PortfolioKanban = lazy(() => import("../pages/PortfolioKanban"));
const PortfolioRoadmap = lazy(() => import("../pages/PortfolioRoadmap"));
const Roadmaps = lazy(() => import("../pages/Roadmaps"));
const DependenciesPage = lazy(() => import("../pages/work/Dependencies"));
const ProgramRoom = lazy(() => import("../pages/ProgramRoom"));
const ProgramBoardHistory = lazy(() => import("../pages/ProgramBoardHistory"));
const PIObjectives = lazy(() => import("../pages/PIObjectives"));

const Forecast = lazy(() => import("../pages/Forecast"));
const WorkSpendGrid = lazy(() => import("../pages/WorkSpendGrid"));
const RisksGridPage = lazy(() => import("../pages/risks/RisksGridPage"));
const RiskRoamReportPage = lazy(() => import("../pages/risks/RiskRoamReportPage"));
const TeamRoom = lazy(() => import("../pages/TeamRoom"));
const SprintBoard = lazy(() => import("../pages/SprintBoard"));
const Backlog = lazy(() => import("../pages/Backlog"));
const Sprints = lazy(() => import("../pages/Sprints"));
const Stories = lazy(() => import("../pages/Stories"));
const Subtasks = lazy(() => import("../pages/Subtasks"));
const WorkloadDashboard = lazy(() => import("../pages/WorkloadDashboard"));
const EnterpriseComingSoon = lazy(() => import("../pages/enterprise/ComingSoon"));
const ReleaseDashboardV5Page = lazy(() => import("../pages/releases/ReleaseDashboardV5Page"));

const AdminLayout = lazy(() => import('../pages/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminGuard = lazy(() => import("../components/admin/AdminGuard").then(m => ({ default: m.AdminGuard })));
const OrgSetup = lazy(() => import("../pages/admin/OrgSetup"));
const HierarchyConfig = lazy(() => import("../pages/admin/HierarchyConfig"));
const CustomFields = lazy(() => import("../pages/admin/CustomFields"));
const BoardConfig = lazy(() => import("../pages/admin/BoardConfig"));
const Permissions = lazy(() => import("../pages/admin/Permissions"));
const Integrations = lazy(() => import("../pages/admin/Integrations"));
const JiraIntegrationConfig = lazy(() => import("../pages/admin/JiraIntegrationConfig"));

const StoriesPage = lazy(() => import('../pages/stories/StoriesPage').then(m => ({ default: m.StoriesPage })));
const Activity = lazy(() => import("../pages/admin/Activity"));
const Changes = lazy(() => import("../pages/admin/Changes"));
const UseTrend = lazy(() => import("../pages/admin/UseTrend"));
const UsageTrends = lazy(() => import("../pages/admin/UsageTrends"));
const ChangesLog = lazy(() => import("../pages/admin/ChangesLog"));
const DesignAuditPage = lazy(() => import("../pages/admin/DesignAuditPage").then(m => ({ default: m.DesignAuditPage })));
const ThemeAuditPage = lazy(() => import("../pages/admin/ThemeAuditPage"));
const ProgressBarsConfig = lazy(() => import("../pages/admin/ProgressBarsConfig"));
const GeneralConfig = lazy(() => import("../pages/admin/GeneralConfig"));
const WorkCodes = lazy(() => import("../pages/admin/WorkCodes"));
const DetailsPanels = lazy(() => import("../pages/admin/DetailsPanels"));
const Terminology = lazy(() => import("../pages/admin/Terminology"));
const TeamSettings = lazy(() => import("../pages/admin/TeamSettings"));
const ProgramSettings = lazy(() => import("../pages/admin/ProgramSettings"));
const PortfolioSettings = lazy(() => import("../pages/admin/PortfolioSettings"));
const ProgressBars = lazy(() => import("../pages/admin/ProgressBars"));
const EstimationSettings = lazy(() => import("../pages/admin/EstimationSettings"));
const GeneralSettings = lazy(() => import("../pages/admin/GeneralSettings"));
const SecuritySettings = lazy(() => import("../pages/admin/SecuritySettings"));
const Announcements = lazy(() => import("../pages/admin/Announcements"));
const UsersManagement = lazy(() => import("../pages/admin/UsersManagement"));
const RolesPermissions = lazy(() => import("../pages/admin/RolesPermissions"));
const ModuleMatrixPage = lazy(() => import("../components/admin/ModuleMatrixPage"));
const ThemeGroups = lazy(() => import("../pages/admin/ThemeGroups"));
const Programs = lazy(() => import("../pages/admin/Programs"));
const Departments = lazy(() => import("../pages/admin/Departments"));
const CapacityDepartmentsPage = lazy(() => import("../pages/admin/CapacityDepartments"));
const ResourceAssignmentsPage = lazy(() => import("../pages/admin/ResourceAssignments"));
const ResourceLocationsPage = lazy(() => import("../pages/admin/ResourceLocations"));
const ResourceCountriesPage = lazy(() => import("../pages/admin/ResourceCountries"));
const ResourceVendorsPage = lazy(() => import("../pages/admin/ResourceVendors"));
const JiraUserSyncPage = lazy(() => import("../pages/admin/JiraUserSync"));
const BusinessOwnersAdmin = lazy(() => import("../pages/admin/BusinessOwners"));
const BusinessProcesses = lazy(() => import("../pages/admin/BusinessProcesses"));
const Portfolios = lazy(() => import("../pages/admin/Portfolios"));
const Estimation = lazy(() => import("../pages/admin/Estimation"));
const Security = lazy(() => import("../pages/admin/Security"));
const ActivityLog = lazy(() => import("../pages/admin/ActivityLog"));
const ModulesPackages = lazy(() => import("../pages/admin/ModulesPackages"));
const UserRoles = lazy(() => import("../pages/admin/UserRoles"));
const ReportsDiscovery = lazy(() => import("../pages/admin/ReportsDiscovery"));
const PIWizard = lazy(() => import("../pages/admin/PIWizard"));
const JiraIntegration = lazy(() => import("../pages/admin/JiraIntegration"));
const ImportData = lazy(() => import("../pages/admin/ImportData"));
const DataHygiene = lazy(() => import("../pages/admin/DataHygiene"));
const ProductSettings = lazy(() => import("../pages/admin/ProductSettings"));
const AdminOverview = lazy(() => import("../pages/admin/AdminOverview"));
const AuditActivityPage = lazy(() => import("../pages/admin/AuditActivityPage"));
const KanbanSettings = lazy(() => import("../pages/admin/KanbanSettings"));
const ResourceUtilizationPage = lazy(() => import("../pages/admin/ResourceUtilization"));
const UserAccessPage = lazy(() => import("../pages/admin/UserAccessPage"));
const MockDataGenerator = lazy(() => import("../pages/admin/MockDataGenerator"));
const AiIntegrationPage = lazy(() => import("../pages/admin/AiIntegrationPage"));
const ProcessSteps = lazy(() => import("../pages/admin/ProcessSteps"));
const SlackIntegrationPage = lazy(() => import("../pages/admin/SlackIntegrationPage"));
const TaskListPage = lazy(() => import("../modules/planner/pages/TaskListPage"));
const CreateMenuConfig = lazy(() => import("../pages/admin/CreateMenuConfig"));
const DeliveryPlatforms = lazy(() => import("../pages/admin/DeliveryPlatforms"));
const RiskSeverityLevels = lazy(() => import("../pages/admin/RiskSeverityLevels"));
const PlanHubGeneralSettings = lazy(() => import("../pages/admin/planhub").then(m => ({ default: m.PlanHubGeneralSettings })));
const PlanHubTemplates = lazy(() => import("../pages/admin/planhub").then(m => ({ default: m.PlanHubTemplates })));
const PlanHubAIConfig = lazy(() => import("../pages/admin/planhub").then(m => ({ default: m.PlanHubAIConfig })));
const PlanHubActivityLog = lazy(() => import("../pages/admin/planhub").then(m => ({ default: m.PlanHubActivityLog })));
const WorkHubAdminPage = lazy(() => import("../modules/workhub/admin/pages/WorkHubAdmin"));
const WorkHubSettingsLayout = lazy(() => import("../modules/workhub/admin/pages/WorkHubSettingsLayout"));
const WorkHubComingSoon = lazy(() => import("../modules/workhub/admin/pages/WorkHubComingSoon"));
const WorkHubHierarchyPage = lazy(() => import("../modules/workhub/admin/pages/WorkHubHierarchyPage"));
const WorkHubSchedulingPage = lazy(() => import("../modules/workhub/admin/pages/WorkHubSchedulingPage"));
const WorkHubStatusMappingPage = lazy(() => import("../modules/workhub/admin/pages/WorkHubStatusMappingPage"));
const WorkHubUserMappingPage = lazy(() => import("../modules/workhub/admin/pages/WorkHubUserMappingPage"));
const WorkHubDataScopePage = lazy(() => import("../modules/workhub/admin/pages/WorkHubDataScopePage"));
const WorkHubSyncLogs = lazy(() => import("../modules/workhub/admin/pages/WorkHubSyncLogsPage"));
const SoftwareLicensesPage = lazy(() => import("../modules/budget/components/SoftwareLicensesPage").then(m => ({ default: m.SoftwareLicensesPage })));
const RoutesComponentsRegistry = lazy(() => import("../pages/admin/RoutesComponentsRegistry"));
const EpicStatuses = lazy(() => import("../pages/admin/EpicStatuses"));
const FeatureStatuses = lazy(() => import("../pages/admin/FeatureStatuses"));
const ThemeStatuses = lazy(() => import("../pages/admin/ThemeStatuses"));
const WorkflowAdminPage = lazy(() => import("../pages/admin/workflows/WorkflowAdminPage"));
const IncidentWorkgroups = lazy(() => import("../pages/admin/incident").then(m => ({ default: m.IncidentWorkgroups })));
const IncidentFieldsConfig = lazy(() => import("../pages/admin/incident").then(m => ({ default: m.IncidentFieldsConfig })));
const IncidentSLAPolicies = lazy(() => import("../pages/admin/incident").then(m => ({ default: m.IncidentSLAPolicies })));
const IncidentCAPPolicy = lazy(() => import("../pages/admin/incident").then(m => ({ default: m.IncidentCAPPolicy })));
const IncidentConversionRules = lazy(() => import("../pages/admin/incident").then(m => ({ default: m.IncidentConversionRules })));
const IncidentAuditCompliance = lazy(() => import("../pages/admin/incident").then(m => ({ default: m.IncidentAuditCompliance })));
const IncidentOwningTeams = lazy(() => import("../pages/admin/incident").then(m => ({ default: m.IncidentOwningTeams })));
const NotificationTriggers = lazy(() => import("../pages/admin/NotificationTriggers"));

const ValueStreamView = lazy(() => import("../pages/ValueStreamView"));
const UserProfile = lazy(() => import("../pages/UserProfile"));
const ProgramDirectory = lazy(() => import("../pages/ProgramDirectory"));
const ProjectDirectory = lazy(() => import("../pages/ProjectDirectory"));
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

const ProjectSummaryPage = lazy(() => import("../pages/projects/ProjectSummaryPage"));
const ProjectComingSoonPage = lazy(() => import("../pages/projects/ProjectComingSoonPage"));
const ProjectBacklogPage = lazy(() => import("../pages/projects/ProjectBacklogPage"));

const OldWorkHubLayout = lazy(() => import("../modules/work-hub/WorkHubLayout").then(m => ({ default: m.WorkHubLayout })));
const SummaryView = lazy(() => import("../modules/work-hub/views/SummaryView").then(m => ({ default: m.SummaryView })));
const ListView = lazy(() => import("../modules/work-hub/views").then(m => ({ default: m.ListView })));
const AllWorkView = lazy(() => import("../modules/work-hub/views").then(m => ({ default: m.AllWorkView })));
const ReleasesView = lazy(() => import("../modules/work-hub/views").then(m => ({ default: m.ReleasesView })));
const ReleaseDetailsView = lazy(() => import("../modules/work-hub/views").then(m => ({ default: m.ReleaseDetailsView })));

const WorkHubLayout = lazy(() => import("../components/workhub/layout/WorkHubLayout").then(m => ({ default: m.WorkHubLayout })));
const WorkHubDashboard = lazy(() => import("../components/workhub/dashboard/WorkHubDashboard").then(m => ({ default: m.WorkHubDashboard })));
const WorkItemsPage = lazy(() => import("../components/workhub/workitems/WorkItemsPage").then(m => ({ default: m.WorkItemsPage })));
const JiraProjectsPage = lazy(() => import("../components/workhub/jira/JiraProjectsPage").then(m => ({ default: m.JiraProjectsPage })));
const WorkHubReleasesPage = lazy(() => import("../components/workhub/releases/ReleasesPage").then(m => ({ default: m.ReleasesPage })));
const WorkHubReleaseDetail = lazy(() => import("../components/workhub/releases/ReleaseDetail").then(m => ({ default: m.ReleaseDetail })));
const WorkHubThemesPage = lazy(() => import("../components/workhub/themes/ThemesPage").then(m => ({ default: m.ThemesPage })));
const WorkHubThemeDetail = lazy(() => import("../components/workhub/themes/ThemeDetail").then(m => ({ default: m.ThemeDetail })));
const WorkHubResource360Page = lazy(() => import("../components/workhub/resource360/Resource360Page").then(m => ({ default: m.Resource360Page })));
const WorkHubResourceDetail = lazy(() => import("../components/workhub/resource360/ResourceDetail").then(m => ({ default: m.ResourceDetail })));
const WorkHubCalendarPage = lazy(() => import("../components/workhub/calendar/CalendarPage").then(m => ({ default: m.CalendarPage })));
const WorkHubCapacityPage = lazy(() => import("../components/workhub/capacity/CapacityPage").then(m => ({ default: m.CapacityPage })));
const WorkHubAnalyticsPage = lazy(() => import("../components/workhub/analytics/AnalyticsPage").then(m => ({ default: m.AnalyticsPage })));
const WorkHubCatyPage = ENABLE_AI ? lazy(() => import("../components/workhub/caty/CatyPage").then(m => ({ default: m.CatyPage }))) : () => <FeatureComingSoon title="WorkHub AI" />;

const ProductRoadmapPage = lazy(() => import("../pages/ProductRoadmapPage"));
const ProductRoadmapV2Page = lazy(() => import("../pages/ProductRoadmapV2Page"));
const IndustryRoadmapPage = lazy(() => import("../pages/industry/IndustryRoadmapPage"));
const WorkTreePage = lazy(() => import("../pages/work-tree").then(m => ({ default: m.WorkTreePage })));
const WorkManager = lazy(() => import("../pages/WorkManager"));
const SkillsInventory = ENABLE_HEAVY_EXPORTS ? lazy(() => import("../pages/SkillsInventory")) : () => <FeatureComingSoon title="Skills Inventory" />;
const StarredPage = lazy(() => import("../pages/StarredPage"));
const WorkHubAllWork = lazy(() => import("../pages/workhub/AllWork"));
const BusinessRequests = lazy(() => import("../pages/enterprise/BusinessRequests"));
const MiningComingSoon = lazy(() => import("../pages/enterprise/MiningComingSoon"));
const IndustryPage = lazy(() => import("../pages/enterprise/DemandIntakeCatalyst"));
const IndustryComingSoon = lazy(() => import("../pages/enterprise/IndustryComingSoon"));
const DemandSummaryPage = lazy(() => import("../pages/enterprise/DemandSummaryPage"));
const ProductRoomPage = lazy(() => import("../pages/ProductRoomPage"));
const CapacityPlanningPage = lazy(() => import("../pages/CapacityPlanningPage"));
const CatalystDemandKanban = lazy(() => import("../modules/kanban/pages/CatalystDemandKanban"));
const CatalystDemandList = lazy(() => import("../modules/product-backlog/pages/CatalystDemandList"));
const CatalystDemandTable = lazy(() => import("../modules/product-backlog/pages/CatalystDemandTable"));
const SubmitDemandRequest = lazy(() => import("../pages/SubmitDemandRequest"));
const TeamComingSoon = lazy(() => import("../pages/team/ComingSoon"));
const UnauthorizedPage = lazy(() => import("../pages/UnauthorizedPage"));
const KanbanBoardView = lazy(() => import("../pages/KanbanBoardView"));
const KanbanBoardSetup = lazy(() => import("../pages/KanbanBoardSetup"));
const KanbanBoardAnalytics = lazy(() => import("../pages/KanbanBoardAnalytics"));
const KnowledgeHubDocumentPage = ENABLE_KNOWLEDGE_HUB ? lazy(() => import("../pages/KnowledgeHubDocumentPage")) : () => <FeatureComingSoon title="Knowledge Hub" />;
const KnowledgeHubPage = ENABLE_KNOWLEDGE_HUB ? lazy(() => import("../pages/KnowledgeHubPage")) : () => <FeatureComingSoon title="Knowledge Hub" />;
const KnowledgeHubSpacePage = ENABLE_KNOWLEDGE_HUB ? lazy(() => import("../pages/KnowledgeHubSpacePage")) : () => <FeatureComingSoon title="Knowledge Hub" />;

const IncidentsList = lazy(() => import("../pages/release").then(m => ({ default: m.IncidentsList })));
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

const PriListsPage = lazy(() => import("../modules/priorities/pages/PriListsPage").then(m => ({ default: m.PriListsPage })));
const PriWeekPage = lazy(() => import("../modules/priorities/pages/PriWeekPage").then(m => ({ default: m.PriWeekPage })));

const S = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <Suspense fallback={<div className="p-8">Loading...</div>}>{children}</Suspense>
  </ErrorBoundary>
);

/** Runtime module gate wrapper for route elements */
function MG({ k, t, children }: { k: string; t: string; children: React.ReactNode }) {
  return <ModuleGate moduleKey={k} fallbackTitle={t}>{children}</ModuleGate>;
}

function Resource360Redirect() {
  const { id } = useParams();
  return <Navigate to={`/project-hub/resource-360/${id || '009'}`} replace />;
}

function CatyWidgetRouteGuard() {
  const location = useLocation();
  const showCaty = location.pathname.startsWith('/planhub/capacity') || location.pathname.startsWith('/strategyhub/capacity') || location.pathname.startsWith('/enterprise/capacity');
  if (!showCaty) return null;
  return <Suspense fallback={null}><CatyFabPlaceholderLazy /></Suspense>;
}

function QAAssistantRouteGuard() {
  const location = useLocation();
  if (!location.pathname.startsWith('/testhub')) return null;
  return <Suspense fallback={null}><QAAssistantFabLazy /></Suspense>;
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
        
        <Route path="/work-hub-test" element={<S><WorkHubLayout /></S>}>
          <Route index element={<Navigate to="summary" replace />} />
          <Route path="summary" element={<S><SummaryView /></S>} />
          <Route path="list" element={<S><ListView /></S>} />
          <Route path="all-work" element={<S><AllWorkView /></S>} />
          <Route path="releases" element={<S><ReleasesView /></S>} />
          <Route path="releases/:versionId" element={<S><ReleaseDetailsView /></S>} />
        </Route>

        <Route path="/browse/:key" element={<S><BrowsePage /></S>} />

        {/* ═══ ProductHub ═══ */}
        <Route path="/producthub" element={<Navigate to="/producthub/backlog" replace />} />
        <Route path="/producthub/backlog" element={<MG k="producthub" t="ProductHub"><S><InitiativeListingPage /></S></MG>} />
        <Route path="/producthub/table" element={<MG k="producthub" t="ProductHub"><S><CatalystDemandTable /></S></MG>} />
        <Route path="/producthub/kanban" element={<MG k="producthub" t="ProductHub"><S><ProductKanbanPage /></S></MG>} />
        <Route path="/producthub/dashboard" element={<MG k="producthub" t="ProductHub"><S><DemandSummaryPage /></S></MG>} />
        <Route path="/producthub/roadmaps" element={<Navigate to="/producthub/roadmap" replace />} />
        <Route path="/producthub/roadmaps-v1" element={<MG k="producthub" t="ProductHub"><S><IndustryRoadmapPage /></S></MG>} />
        <Route path="/producthub/reports" element={<MG k="producthub" t="ProductHub"><S><IndustryComingSoon /></S></MG>} />
        <Route path="/producthub/roadmap" element={<MG k="producthub" t="ProductHub"><S><RoadmapPage /></S></MG>} />
        <Route path="/producthub/cards" element={<MG k="producthub" t="ProductHub"><S><ProductCardsPage /></S></MG>} />
        <Route path="/producthub/ideation" element={<MG k="ai_features" t="Ideation"><S><IdeationPage /></S></MG>} />
        <Route path="/product/ideas/roadmap" element={<MG k="ai_features" t="Ideas Roadmap"><S><IdeasRoadmapPage /></S></MG>} />
        <Route path="/product/ideas/backlog" element={<MG k="ai_features" t="Ideas Backlog"><S><IdeasBacklogPage /></S></MG>} />
        <Route path="/product/ideas/board" element={<MG k="ai_features" t="Ideas Board"><S><IdeasBoardPage /></S></MG>} />
        <Route path="/product/ideas/roadmap-new" element={<MG k="ai_features" t="Ideas Roadmap"><S><IdeasRoadmapPageNew /></S></MG>} />
        <Route path="/product/ideas/themes" element={<MG k="ai_features" t="Ideas Theme"><S><IdeasThemePage /></S></MG>} />
        <Route path="/product/ideas/analytics" element={<MG k="ai_features" t="Ideas Analytics"><S><IdeasAnalyticsPage /></S></MG>} />
        <Route path="/producthub/requirement-assist" element={<MG k="ai_features" t="Requirement Assist"><S><RequirementAssistWorkspace /></S></MG>} />
        <Route path="/producthub/requirement-assist/compose" element={<MG k="ai_features" t="Requirement Assist"><S><RequirementAssistCompose /></S></MG>} />
        <Route path="/producthub/requirement-assist/categories" element={<MG k="ai_features" t="Requirement Assist"><S><RequirementAssistCategories /></S></MG>} />
        <Route path="/producthub/requirement-assist/:id" element={<MG k="ai_features" t="Requirement Assist"><S><RequirementAssistOutput /></S></MG>} />
        <Route path="/product/req-assist" element={<MG k="ai_features" t="Requirement Assist"><S><ReqAssistLibrary /></S></MG>} />
        <Route path="/product/req-assist/generate" element={<MG k="ai_features" t="Requirement Assist"><S><ReqAssistGenerate /></S></MG>} />
        <Route path="/req-assist/rag-audit" element={<MG k="ai_features" t="RAG Audit"><S><RAGAuditPage /></S></MG>} />
        <Route path="/product-hub/req-assist" element={<Navigate to="/product/req-assist" replace />} />
        <Route path="/product-hub/req-assist/generate" element={<Navigate to="/product/req-assist/generate" replace />} />
        <Route path="/industry/*" element={<Navigate to="/producthub" replace />} />
        
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

        <Route path="/portfolio/:portfolioId/*" element={<S><PortfolioRoutesShell /></S>} />
        <Route path="/program" element={<S><PlaceholderPage /></S>} />
        <Route path="/program/:programId/*" element={<S><ProgramRoutesShell /></S>} />
        <Route path="/programs" element={<S><ProgramDirectory /></S>} />
        <Route path="/programs/program-board" element={<Navigate to="/for-you" replace />} />
        <Route path="/programs/program-board/history" element={<S><ProgramBoardHistory /></S>} />
        <Route path="/programs/:programId/*" element={<S><ProgramsRoutesShell /></S>} />

        <Route path="/teams" element={<S><TeamComingSoon /></S>} />
        <Route path="/teams/:teamId/*" element={<S><TeamsRoutesShell /></S>} />
        <Route path="/team/:teamId/*" element={<S><TeamRoutesShell /></S>} />

        <Route path="/enterprise/*" element={<S><EnterpriseRoutesShell /></S>} />

        <Route path="/work-tree" element={<S><WorkTreePage /></S>} />

        <Route path="/taskhub" element={<Navigate to="/taskhub/boards" replace />} />
        <Route path="/taskhub/:view" element={<S><PlannerPage /></S>} />
        <Route path="/taskhub-kanban" element={<S><KanbanPage /></S>} />
        <Route path="/taskhub/my-tasks" element={<S><MyTasksPage /></S>} />

        {/* ═══ TestHub ═══ */}
        <Route path="/testhub" element={<MG k="testhub" t="TestHub"><S><TestHubPage /></S></MG>}>
          <Route index element={<Navigate to="/testhub/dashboard" replace />} />
          <Route path="repository" element={<S><TestRepositoryPage /></S>} />
          <Route path="dashboard" element={<S><TestHubDashboardPage /></S>} />
          <Route path="shared-steps" element={<S><SharedStepsPage /></S>} />
          <Route path="shared-steps/:stepId" element={<S><SharedStepDetailPage /></S>} />
          <Route path="test-sets" element={<S><TestSetsPage /></S>} />
          <Route path="test-sets/:setId" element={<S><TestSetDetailPage /></S>} />
          <Route path="cycles" element={<S><TestCyclesPage /></S>} />
          <Route path="cycles/:cycleId" element={<S><TestCycleDetailPage /></S>} />
          <Route path="cycles/:cycleId/report" element={<S><CycleReportPage /></S>} />
          <Route path="cycles/:cycleId/execute" element={<S><TestHubExecutionPage /></S>} />
          <Route path="execution" element={<S><ExecutionHubPage /></S>} />
          <Route path="runs" element={<S><TestRunsPage /></S>} />
          <Route path="defects" element={<S><TestHubDefectsPage /></S>} />
          <Route path="defects/:defectId" element={<S><DefectDetailPage /></S>} />
          <Route path="requirements" element={<S><TestHubRequirementsPage /></S>} />
          <Route path="requirements/:requirementId" element={<S><RequirementDetailPage /></S>} />
          <Route path="coverage-matrix" element={<S><CoverageMatrixPage /></S>} />
          <Route path="traceability" element={<S><TraceabilityPage /></S>} />
          <Route path="environments" element={<S><EnvironmentsListPage /></S>} />
          <Route path="environments/:environmentId" element={<S><EnvironmentDetailPage /></S>} />
          <Route path="reports" element={<S><TestHubReportsPage /></S>} />
          <Route path="reports/:reportId" element={<S><ReportDetailPage /></S>} />
          <Route path="tags" element={<S><TagsListPage /></S>} />
          <Route path="settings" element={<S><TestHubSettingsPage /></S>} />
          <Route path="activity" element={<S><ActivityFeedPage /></S>} />
          <Route path="my-scope" element={<S><MyTestScopePage /></S>} />
          <Route path="import-export" element={<S><ImportExportPage /></S>} />
          <Route path="test-plans" element={<S><TestPlansListPage /></S>} />
          <Route path="test-plans/:planId" element={<S><PlanDetailPage /></S>} />
          <Route path="releases" element={<S><ReleasesListPage /></S>} />
          <Route path="releases/command-center" element={<S><CommandCenterPage /></S>} />
          <Route path="releases/quality-gates" element={<S><QualityGatesPage /></S>} />
          <Route path="releases/:releaseId" element={<S><ReleaseDetailPage /></S>} />
          <Route path="caty" element={<MG k="ai_features" t="Caty AI"><S><CatyAIPage /></S></MG>} />
          <Route path="docs" element={<S><TestHubDocsPage /></S>} />
          <Route path="verify" element={<S><TestHubVerifyPage /></S>} />
        </Route>

        {/* ═══ IncidentHub ═══ */}
        <Route path="/incident-hub" element={<MG k="incidenthub" t="IncidentHub"><S><IncidentHubListPage /></S></MG>} />
        <Route path="/incident-hub/kanban" element={<MG k="incidenthub" t="IncidentHub"><S><IncidentHubKanbanPage /></S></MG>} />
        <Route path="/incident-hub/analytics" element={<MG k="incidenthub" t="IncidentHub"><S><IncidentHubAnalyticsPage /></S></MG>} />
        <Route path="/incident-hub/insights" element={<MG k="incidenthub" t="IncidentHub"><S><IncidentHubInsightsPage /></S></MG>} />
        <Route path="/incident-hub/reports" element={<MG k="incidenthub" t="IncidentHub"><S><IncidentHubReportsPage /></S></MG>} />
        <Route path="/incident-hub/committee-queue" element={<MG k="incidenthub" t="IncidentHub"><S><IncidentHubCommitteeQueuePage /></S></MG>} />
        <Route path="/incident-hub/view/:id" element={<MG k="incidenthub" t="IncidentHub"><S><IncidentHubDetailPage /></S></MG>} />

        <Route path="/release-hub" element={<Navigate to="/release-hub/command-center" replace />} />
        <Route path="/release-hub/command-center" element={<S><RH21CommandCenterPage /></S>} />
        <Route path="/release-hub/releases" element={<S><RH21AllReleasesPage /></S>} />
        <Route path="/release-hub/compare" element={<S><RH21ReleaseComparePage /></S>} />
        <Route path="/release-hub/triage" element={<S><RH21TriageQueuePage /></S>} />
        <Route path="/release-hub/changes" element={<S><RH21AllChangesPage /></S>} />
        <Route path="/release-hub/sign-off-queue" element={<S><RH21SignOffQueuePage /></S>} />
        <Route path="/release-hub/production-events" element={<S><ProductionEventsPageLazy /></S>} />
        <Route path="/release-hub/freeze-windows" element={<S><RH21FreezeWindowsPage /></S>} />
        
        <Route path="/release-hub/:releaseId" element={<S><ReleaseDashboardV5Page /></S>} />

        {/* Legacy releasehub redirects */}
        <Route path="/releasehub" element={<Navigate to="/release-hub/command-center" replace />} />
        <Route path="/releasehub/command-center" element={<Navigate to="/release-hub/command-center" replace />} />
        <Route path="/releasehub/all-releases" element={<Navigate to="/release-hub/releases" replace />} />
        <Route path="/releasehub/compare" element={<Navigate to="/release-hub/compare" replace />} />
        <Route path="/releasehub/triage" element={<Navigate to="/release-hub/triage" replace />} />
        <Route path="/releasehub/changes" element={<Navigate to="/release-hub/changes" replace />} />
        <Route path="/releasehub/production-events" element={<Navigate to="/release-hub/production-events" replace />} />
        <Route path="/releasehub/dashboard" element={<Navigate to="/release-hub/command-center" replace />} />
        <Route path="/releasehub/all" element={<Navigate to="/release-hub/releases" replace />} />

        <Route path="/priorities" element={<S><T10LandingPage /></S>} />
        <Route path="/priorities/completed" element={<S><T10CompletedPage /></S>} />
        <Route path="/priorities/list/:listId" element={<S><T10WeekPage /></S>} />
        <Route path="/priorities/list/:listId/week/:weekId" element={<S><T10WeekPageV3 /></S>} />
        <Route path="/taskhub/task10" element={<Navigate to="/priorities" replace />} />
        <Route path="/taskhub/task10/*" element={<Navigate to="/priorities" replace />} />
        <Route path="/planner" element={<Navigate to="/taskhub/boards" replace />} />
        <Route path="/planner/*" element={<Navigate to="/taskhub/boards" replace />} />

        <Route path="/planhub" element={<S><PlanLibraryPage /></S>} />
        <Route path="/planhub/plan/:planId" element={<S><PlanEditorPage /></S>} />
        <Route path="/planhub/compare" element={<S><ScenarioComparePage /></S>} />
        <Route path="/planhub/master" element={<S><MasterPlanPage /></S>} />
        <Route path="/planhub/resources" element={<S><PlanHubResourcesPage /></S>} />
        <Route path="/planhub/ai" element={<S><PlanHubAIPage /></S>} />
        <Route path="/planhub/reports" element={<S><PlanHubReportsPage /></S>} />
        <Route path="/planhub/capacity" element={<S><CapacityPlannerPage /></S>} />
        <Route path="/planhub/budget-planner" element={<S><BudgetPlannerPage /></S>} />

        <Route path="/wiki" element={<S><WikiHomePage /></S>} />
        <Route path="/wiki/search" element={<S><WikiSearchPage /></S>} />
        <Route path="/wiki/whats-new" element={<S><WikiWhatsNewPage /></S>} />
        <Route path="/wiki/learning-paths" element={<S><WikiLearningPathsPage /></S>} />
        <Route path="/wiki/learning-paths/:pathId" element={<S><WikiLearningPathDetailPage /></S>} />
        <Route path="/wiki/subscriptions" element={<S><WikiSubscriptionsPage /></S>} />
        <Route path="/wiki/all-articles" element={<S><WikiAllArticlesPage /></S>} />
        <Route path="/wiki/verification" element={<S><WikiVerificationPage /></S>} />
        <Route path="/wiki/analytics" element={<S><WikiAnalyticsPage /></S>} />
        <Route path="/wiki/templates" element={<S><WikiTemplatesPage /></S>} />
        <Route path="/wiki/knowledge-graph" element={<S><WikiKnowledgeGraphPage /></S>} />
        <Route path="/wiki/category/:slug" element={<S><WikiCategoryPage /></S>} />
        <Route path="/wiki/:pageSlug" element={<S><WikiArticlePage /></S>} />

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
        <Route path="/items/defects" element={<S><Defects /></S>} />
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
        <Route path="/release-train-calendar" element={<div className="p-8"><h1 className="text-2xl font-bold">Release Calendar</h1><p className="text-muted-foreground">Coming soon</p></div>} />
        <Route path="/program-backlog" element={<div className="p-8"><h1 className="text-2xl font-bold">Program Backlog</h1><p className="text-muted-foreground">Coming soon</p></div>} />

        <Route path="/projects" element={<S><ProjectDirectory /></S>} />
        <Route path="/projects/:projectKey" element={<Navigate to={`/projects`} replace />} />
        <Route path="/projects/:projectKey/summary" element={<Navigate to={`/projects`} replace />} />
        <Route path="/workhub/all-work" element={<S><WorkHubAllWork /></S>} />
        <Route path="/workhub" element={<Navigate to="/project-hub" replace />} />
        <Route path="/projecthub" element={<Navigate to="/project-hub" replace />} />
        <Route path="/projecthub/resource360" element={<Navigate to="/project-hub/resource-360/009" replace />} />
        <Route path="/projecthub/resource360/:id" element={<Resource360Redirect />} />
        <Route path="/resource-360/:resourceId" element={<Navigate to="/project-hub/resource-360/009" replace />} />

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
        <Route path="/releases/*" element={<Navigate to="/release-hub/command-center" replace />} />

        <Route path="/unauthorized" element={<S><UnauthorizedPage /></S>} />

        <Route path="/knowledge-hub" element={<S><KnowledgeHubPage /></S>} />
        <Route path="/knowledge-hub/spaces/:spaceId" element={<S><KnowledgeHubSpacePage /></S>} />
        <Route path="/knowledge-hub/documents/:documentId" element={<S><KnowledgeHubDocumentPage /></S>} />

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

        <Route path="/admin/org-setup" element={<S><AdminGuard><OrgSetup /></AdminGuard></S>} />
        <Route path="/admin/hierarchy" element={<S><AdminGuard><HierarchyConfig /></AdminGuard></S>} />
        <Route path="/admin/custom-fields" element={<S><AdminGuard><CustomFields /></AdminGuard></S>} />
        <Route path="/admin/boards" element={<S><AdminGuard><BoardConfig /></AdminGuard></S>} />
        <Route path="/admin/user-roles" element={<S><AdminGuard><UserRoles /></AdminGuard></S>} />
        <Route path="/admin/permissions" element={<S><AdminGuard><Permissions /></AdminGuard></S>} />
        <Route path="/admin/integrations" element={<S><AdminGuard><Integrations /></AdminGuard></S>} />
        <Route path="/admin/activity-log" element={<S><AdminGuard><ActivityLog /></AdminGuard></S>} />

        <Route path="/admin" element={<S><AdminLayout /></S>}>
          <Route index element={<Navigate to="/admin/overview" replace />} />
          <Route path="overview" element={<S><AdminOverview /></S>} />
          <Route path="activity" element={<S><AuditActivityPage /></S>} />
          <Route path="changes" element={<S><Changes /></S>} />
          <Route path="changes-log" element={<S><ChangesLog /></S>} />
          <Route path="use-trend" element={<S><UseTrend /></S>} />
          <Route path="usage-trends" element={<S><UsageTrends /></S>} />
          <Route path="work-codes" element={<S><WorkCodes /></S>} />
          <Route path="modules-packages" element={<S><ModulesPackages /></S>} />
          <Route path="details-panels" element={<S><DetailsPanels /></S>} />
          <Route path="terminology" element={<S><Terminology /></S>} />
          <Route path="team-settings" element={<S><TeamSettings /></S>} />
          <Route path="program-settings" element={<S><ProgramSettings /></S>} />
          <Route path="portfolio-settings" element={<S><PortfolioSettings /></S>} />
          <Route path="progress-bars" element={<S><ProgressBars /></S>} />
          <Route path="progress-bars-config" element={<S><ProgressBarsConfig /></S>} />
          <Route path="estimation-settings" element={<S><EstimationSettings /></S>} />
          <Route path="general-settings" element={<S><GeneralSettings /></S>} />
          <Route path="general-config" element={<S><GeneralConfig /></S>} />
          <Route path="security-settings" element={<S><SecuritySettings /></S>} />
          <Route path="announcements" element={<S><Announcements /></S>} />
          <Route path="user-access" element={<S><UserAccessPage /></S>} />
          <Route path="users" element={<S><UsersManagement /></S>} />
          <Route path="roles-permissions" element={<S><RolesPermissions /></S>} />
          <Route path="module-matrix" element={<S><ModuleMatrixPage /></S>} />
          <Route path="theme-groups" element={<S><ThemeGroups /></S>} />
          <Route path="programs" element={<S><Programs /></S>} />
          <Route path="portfolios" element={<S><Portfolios /></S>} />
          <Route path="departments" element={<S><Departments /></S>} />
          <Route path="capacity-departments" element={<S><CapacityDepartmentsPage /></S>} />
          <Route path="resource-assignments" element={<S><ResourceAssignmentsPage /></S>} />
          <Route path="resource-locations" element={<S><ResourceLocationsPage /></S>} />
          <Route path="resource-countries" element={<S><ResourceCountriesPage /></S>} />
          <Route path="resource-vendors" element={<S><ResourceVendorsPage /></S>} />
          <Route path="jira-user-sync" element={<S><JiraUserSyncPage /></S>} />
          <Route path="business-owners" element={<S><BusinessOwnersAdmin /></S>} />
          <Route path="business-processes" element={<S><BusinessProcesses /></S>} />
          <Route path="business/ProcessStep" element={<S><ProcessSteps /></S>} />
          <Route path="business/EpicStatus" element={<S><EpicStatuses /></S>} />
          <Route path="business/FeatureStatus" element={<S><FeatureStatuses /></S>} />
          <Route path="business/ThemeStatus" element={<S><ThemeStatuses /></S>} />
          <Route path="create-menu-config" element={<S><CreateMenuConfig /></S>} />
          <Route path="business/RiskSeverity" element={<S><RiskSeverityLevels /></S>} />
          <Route path="business/DeliveryPlatforms" element={<S><DeliveryPlatforms /></S>} />
          <Route path="estimation" element={<S><Estimation /></S>} />
          <Route path="security" element={<S><Security /></S>} />
          <Route path="jira-config" element={<S><JiraIntegrationConfig /></S>} />
          
          <Route path="product-settings" element={<S><ProductSettings /></S>} />
          <Route path="import-data" element={<S><ImportData /></S>} />
          <Route path="data-hygiene" element={<S><DataHygiene /></S>} />
          <Route path="design-audit" element={<S><DesignAuditPage /></S>} />
          <Route path="theme-audit" element={<S><ThemeAuditPage /></S>} />
          <Route path="kanban-settings" element={<S><KanbanSettings /></S>} />
          <Route path="resource-utilization" element={<S><ResourceUtilizationPage /></S>} />
          <Route path="software-licenses" element={<S><SoftwareLicensesPage /></S>} />
          <Route path="routes-registry" element={<S><RoutesComponentsRegistry /></S>} />
          <Route path="snapshots" element={<S><PlaceholderPage /></S>} />
          <Route path="incidents/workgroups" element={<S><IncidentWorkgroups /></S>} />
          <Route path="incidents/fields" element={<S><IncidentFieldsConfig /></S>} />
          <Route path="incidents/sla" element={<S><IncidentSLAPolicies /></S>} />
          <Route path="incidents/cap-policy" element={<S><IncidentCAPPolicy /></S>} />
          <Route path="incidents/conversion" element={<S><IncidentConversionRules /></S>} />
          <Route path="incidents/audit" element={<S><IncidentAuditCompliance /></S>} />
          <Route path="incidents/owning-teams" element={<S><IncidentOwningTeams /></S>} />
          <Route path="mock-data" element={<S><MockDataGenerator /></S>} />
          <Route path="ai-integration" element={<S><AiIntegrationPage /></S>} />
          <Route path="planhub" element={<Navigate to="/admin/planhub/general" replace />} />
          <Route path="planhub/general" element={<S><PlanHubGeneralSettings /></S>} />
          <Route path="planhub/templates" element={<S><PlanHubTemplates /></S>} />
          <Route path="planhub/ai" element={<S><PlanHubAIConfig /></S>} />
          <Route path="planhub/audit" element={<S><PlanHubActivityLog /></S>} />
          <Route path="planhub/*" element={<Navigate to="/admin/planhub/general" replace />} />
          <Route path="slack" element={<S><SlackIntegrationPage /></S>} />
          <Route path="task-list" element={<S><TaskListPage /></S>} />
          <Route path="workhub-connection" element={<Navigate to="/admin/workhub/jira-connection" replace />} />
          <Route path="workhub" element={<Navigate to="/admin/workhub/jira-connection" replace />} />
          <Route path="workhub/jira-connection" element={<S><WorkHubAdminPage /></S>} />
          <Route path="workhub/hierarchy-mapping" element={<S><WorkHubHierarchyPage /></S>} />
          <Route path="workhub/scheduling-rules" element={<S><WorkHubSchedulingPage /></S>} />
          <Route path="workhub/status-mapping" element={<S><WorkHubStatusMappingPage /></S>} />
          <Route path="workhub/user-mapping" element={<S><WorkHubUserMappingPage /></S>} />
          <Route path="workhub/data-scope" element={<S><WorkHubDataScopePage /></S>} />
          <Route path="workhub/sync-logs" element={<S><WorkHubSyncLogs /></S>} />
          <Route path="workhub/*" element={<Navigate to="/admin/workhub/jira-connection" replace />} />
          <Route path="kb" element={<S><KBAdminPage /></S>} />
          <Route path="kb/*" element={<S><KBAdminPage /></S>} />
          <Route path="wiki" element={<S><WikiAdminPage /></S>} />
          <Route path="wiki-diagnostic" element={<S><WikiDiagnosticPage /></S>} />
          <Route path="diagnostic" element={<S><AdminDiagnosticPage /></S>} />
          <Route path="notification-triggers" element={<S><NotificationTriggers /></S>} />
          <Route path="feature-flags" element={<S><FeatureFlagsPage /></S>} />
        </Route>

        <Route path="/reports-discovery" element={<S><AdminGuard><ReportsDiscovery /></AdminGuard></S>} />
        <Route path="/pi-wizard" element={<S><AdminGuard><PIWizard /></AdminGuard></S>} />
        <Route path="/jira-integration" element={<S><AdminGuard><JiraIntegration /></AdminGuard></S>} />
        <Route path="/value-stream" element={<S><ValueStreamView /></S>} />
        <Route path="/profile" element={<S><UserProfile /></S>} />
        <Route path="/admin/settings/notifications" element={<S><UserNotificationSettingsPage /></S>} />
        <Route path="/items/:type" element={<S><PlaceholderPage /></S>} />

        <Route path="/project-hub" element={<Navigate to="/project-hub/projects" replace />} />
        <Route path="/project-hub/projects" element={<S><AllProjectsPageLazy /></S>} />
        <Route path="/project/all-projects" element={<S><AllProjectsPageLazy /></S>} />
        <Route path="/project-hub/projects-legacy" element={<S><ProjectListPageLazy /></S>} />
        <Route path="/project-hub/portfolio-health" element={<S><div className="flex h-full items-center justify-center" style={{ color: 'var(--text-3)' }}>Portfolio Health — Coming Soon</div></S>} />
        <Route path="/project-hub/resources" element={<S><ResourceListingPageLazy /></S>} />
        <Route path="/project-hub/resources/:resourceId" element={<S><R360MemberDetailLazy /></S>} />
        <Route path="/project-hub/resources-v2" element={<Navigate to="/project-hub/resources" replace />} />
        <Route path="/project-hub/resources-v2/:resourceId" element={<S><R360MemberDetailLazy /></S>} />
        <Route path="/project-hub/resource360" element={<Navigate to="/project-hub/resource-360/009" replace />} />
        <Route path="/project-hub/resource360/:id" element={<Navigate to="/project-hub/resource-360/009" replace />} />
        <Route path="/project-hub/resource-360/:resourceId" element={<S><Resource360PageNew /></S>} />
        <Route path="/resource360/members/:memberId" element={<S><Resource360MemberDetail /></S>} />
        <Route path="/resources" element={<S><R360ProfilePageLazy /></S>} />
        <Route path="/project-hub/:key" element={<Navigate to="dashboard" replace />} />
        <Route path="/project-hub/:key/dashboard" element={<S><ProjectDashboardPageLazy /></S>} />
        <Route path="/project-hub/:key/settings" element={<S><PHProjectSettingsPageLazy /></S>} />
        <Route path="/project-hub/:key/backlog" element={<PHPlaceholder title="Backlog" phase="Phase 2" />} />
        <Route path="/project-hub/:key/epic-backlog" element={<S><NativeEpicBacklogPageLazy /></S>} />
        <Route path="/project-hub/:key/feature-backlog" element={<S><NativeFeatureBacklogPageLazy /></S>} />
        <Route path="/project-hub/:key/story-backlog" element={<S><NativeStoryBacklogPageLazy /></S>} />
        <Route path="/project-hub/:key/story/:itemId" element={<S><StoryDetailPageLazy /></S>} />
        <Route path="/project-hub/:key/issue/:issueKey" element={<S><IssueDetailPageLazy /></S>} />
        <Route path="/project-hub/:key/board" element={<S><ProjectBoardPageLazy /></S>} />
        <Route path="/project-hub/:key/boards" element={<S><KanbanBoardPageLazy /></S>} />
        <Route path="/project-hub/:key/boards/:boardId" element={<S><KanbanBoardPageLazy /></S>} />
        <Route path="/project-hub/:key/hierarchy/allwork" element={<S><HierarchyAllWorkPageLazy /></S>} />
        <Route path="/project-hub/:key/hierarchy" element={<Navigate to="allwork" replace />} />
        <Route path="/project-hub/:key/list" element={<S><ProjectJiraLayoutLazy /></S>} />
        <Route path="/project-hub/:key/allwork" element={<S><ProjectJiraLayoutLazy /></S>} />
        <Route path="/project-hub/:key/timeline" element={<PHPlaceholder title="Timeline" phase="Phase 3" />} />
        <Route path="/project-hub/:key/releases" element={<PHPlaceholder title="Releases" phase="Phase 3" />} />
        <Route path="/project-hub/:key/reports" element={<PHPlaceholder title="Reports" phase="Phase 4" />} />
        <Route path="/project-hub/:key/sprint-predictor" element={<PHPlaceholder title="Sprint Predictor" phase="Phase 5" />} />
        <Route path="/project-hub/:key/risk-scanner" element={<PHPlaceholder title="Risk Scanner" phase="Phase 5" />} />
      </Routes>
      <CatyWidgetRouteGuard />
      <QAAssistantRouteGuard />
      <KnowledgeAssistFabRouteGuard />
    </>
  );
}
