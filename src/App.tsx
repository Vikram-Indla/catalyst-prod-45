import React, { lazy, Suspense } from "react";

// ─── Lazy page imports ───────────────────────────────────────────
const KBAdminSetup = lazy(() => import("./pages/KBAdminSetup"));
const KBAdminPage = lazy(() => import("./pages/KBAdminPage"));
const KBDataAuditPage = lazy(() => import("./pages/KBDataAudit"));
const RAGAuditPage = lazy(() => import("./pages/RAGAuditPage"));
const WikiAdminPage = lazy(() => import("./pages/admin/WikiAdminPage"));
const WikiDiagnosticPage = lazy(() => import("./pages/admin/WikiDiagnosticPage"));
const AdminDiagnosticPage = lazy(() => import("./pages/admin/AdminDiagnosticPage"));

const Resource360PageNew = lazy(() => import("./components/resource360/Resource360PageNew"));
const Resource360MemberDetail = lazy(() => import("./pages/Resource360MemberDetail"));
const ResourceListingPageLazy = lazy(() => import("./pages/ResourceListingPage"));
const R360ResourcesListingLazy = lazy(() => import("./pages/R360ResourcesListing"));
const R360MemberDetailLazy = lazy(() => import("./pages/R360MemberDetail"));
const R360ProfilePageLazy = lazy(() => import("./pages/R360ProfilePage"));

// ProjectHub V5 lazy imports
const ProjectHubShellLazy = lazy(() => import("./components/project-hub/ProjectHubShell").then(m => ({ default: m.ProjectHubShell })));
const ProjectListPageLazy = lazy(() => import("./pages/project-hub/ProjectListPage"));
const ProjectDashboardPageLazy = lazy(() => import("./pages/project-hub/ProjectDashboardPage"));
const PHProjectSettingsPageLazy = lazy(() => import("./pages/project-hub/ProjectSettingsPage"));
const WorkItemsListPageLazy = lazy(() => import("./pages/project-hub/WorkItemsListPage"));
const ProjectBoardPageLazy = lazy(() => import("./pages/project-hub/ProjectBoardPage"));
const ProjectBoardManagerPageLazy = lazy(() => import("./pages/project-hub/ProjectBoardManagerPage"));
const ProjectBoardCanvasPageLazy = lazy(() => import("./pages/project-hub/ProjectBoardCanvasPage"));
const AllProjectsPageLazy = lazy(() => import("./pages/projecthub/AllProjectsPage"));
const NativeEpicBacklogPageLazy = lazy(() => import("./pages/project-hub/NativeEpicBacklogPage"));
const NativeFeatureBacklogPageLazy = lazy(() => import("./pages/project-hub/NativeFeatureBacklogPage"));
const NativeStoryBacklogPageLazy = lazy(() => import("./pages/project-hub/NativeStoryBacklogPage"));
const HierarchyPageLazy = lazy(() => import("./pages/project-hub/HierarchyPage"));
import { List, Columns3, AlignJustify, GanttChart, Tag, BarChart3, Sparkles as SparklesIcon, Activity as ActivityIcon } from 'lucide-react';
const PHPlaceholderBase = lazy(() => import("./pages/project-hub/PhasePlaceholderPage"));
const PH_ICONS: Record<string, any> = { Backlog: List, Board: Columns3, List: AlignJustify, Timeline: GanttChart, Releases: Tag, Reports: BarChart3, 'Sprint Predictor': SparklesIcon, 'Risk Scanner': ActivityIcon };
const PH_DESCRIPTIONS: Record<string, string> = {
  Backlog: 'Sprint backlog with drag-and-drop prioritization.',
  Board: 'Kanban board with customizable swim lanes.',
  List: 'Flat list view with inline editing and bulk actions.',
  Timeline: 'Gantt-style timeline with dependency tracking.',
  Releases: 'Release planning and version management.',
  Reports: 'Velocity charts, burn-down, and team analytics.',
  'Sprint Predictor': 'AI-powered sprint completion predictions.',
  'Risk Scanner': 'AI-driven risk detection and mitigation.',
};
function PHPlaceholder({ title, phase }: { title: string; phase: string }) {
  return <Suspense fallback={<div className="p-8">Loading...</div>}><PHPlaceholderBase title={title} phase={phase} icon={PH_ICONS[title] || List} description={PH_DESCRIPTIONS[title] || `Coming in ${phase}`} /></Suspense>;
}
const ProductionEventsPageLazy = lazy(() => import("@/pages/release-hub/production-events/ProductionEventsPage"));
// ReleaseHub v2.1 page shells
const RH21CommandCenterPage = lazy(() => import("./pages/releasehub/CommandCenterPage"));
const RH21AllReleasesPage = lazy(() => import("./pages/releasehub/AllReleasesPage"));
const RH21ReleaseComparePage = lazy(() => import("./pages/releasehub/ReleaseComparePage"));
const RH21TriageQueuePage = lazy(() => import("./pages/releasehub/TriageQueuePage"));
const RH21AllChangesPage = lazy(() => import("./pages/releasehub/AllChangesPage"));
const RH21ProductionEventsPage = lazy(() => import("./pages/releasehub/ProductionEventsPage"));
const StrategicThemesPage = lazy(() => import("./pages/strategyhub/StrategicThemesPage"));
const GoalsKeyResultsPage = lazy(() => import("./pages/strategyhub/GoalsKeyResultsPage"));
const InitiativeListingPage = lazy(() => import("./pages/producthub/InitiativeListingPage"));
const RoadmapPage = lazy(() => import("./pages/producthub/RoadmapPage"));
const ProductKanbanPage = lazy(() => import("./pages/producthub/KanbanPage"));
const RequirementAssistWorkspace = lazy(() => import("./pages/producthub/requirement-assist/index"));
const RequirementAssistCompose = lazy(() => import("./pages/producthub/requirement-assist/compose"));
const RequirementAssistCategories = lazy(() => import("./pages/producthub/requirement-assist/categories"));
const RequirementAssistOutput = lazy(() => import("./pages/producthub/requirement-assist/output"));
const ProductCardsPage = lazy(() => import("./pages/producthub/CardsPage"));
const IdeationPage = lazy(() => import("./pages/producthub/IdeationPage"));
const IdeasRoadmapPage = lazy(() => import("./pages/product/ideas/IdeasRoadmapPage"));
const ReqAssistLibrary = lazy(() => import("./pages/ReqAssistLibrary"));
const ReqAssistGenerate = lazy(() => import("./pages/ReqAssistGenerate"));

// IncidentHub lazy imports
const IncidentHubListPage = lazy(() => import("./pages/release/IncidentRoomList"));
const IncidentHubKanbanPage = lazy(() => import("./modules/incidents/kanban/pages/IncidentKanbanPage"));
const IncidentHubAnalyticsPage = lazy(() => import("./modules/incidents/analytics/pages/IncidentAnalyticsPage"));
const IncidentHubInsightsPage = lazy(() => import("./modules/incidents/analytics/pages/IncidentInsightsPage"));
const IncidentHubReportsPage = lazy(() => import("./pages/release/IncidentReportsPage"));
const IncidentHubCommitteeQueuePage = lazy(() => import("./pages/release/CAPCommitteeQueuePage"));

// Wiki Module lazy imports
const WikiHomePage = lazy(() => import("./pages/wiki/WikiHomePage"));
const WikiSearchPage = lazy(() => import("./pages/wiki/WikiSearchPage"));
const WikiCategoryPage = lazy(() => import("./pages/wiki/WikiCategoryPage"));
const WikiArticlePage = lazy(() => import("./pages/wiki/WikiArticlePage"));
const WikiWhatsNewPage = lazy(() => import("./pages/wiki/WikiWhatsNewPage"));
const WikiLearningPathsPage = lazy(() => import("./pages/wiki/WikiLearningPathsPage"));
const WikiLearningPathDetailPage = lazy(() => import("./pages/wiki/WikiLearningPathDetailPage"));
const WikiSubscriptionsPage = lazy(() => import("./pages/wiki/WikiSubscriptionsPage"));
const WikiAllArticlesPage = lazy(() => import("./pages/wiki/WikiAllArticlesPage"));
const WikiVerificationPage = lazy(() => import("./pages/wiki/WikiVerificationPage"));
const WikiAnalyticsPage = lazy(() => import("./pages/wiki/WikiAnalyticsPage"));
const WikiTemplatesPage = lazy(() => import("./pages/wiki/WikiTemplatesPage"));
const WikiKnowledgeGraphPage = lazy(() => import("./pages/wiki/WikiKnowledgeGraphPage"));

// ─── Core infrastructure (keep eager) ────────────────────────────
import { Resource360Redirect } from './components/workhub/resource360/Resource360Redirect';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Toaster as HotToaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./lib/auth";
import { NavigationProvider } from "./contexts/NavigationContext";
import { ProcessStepsProvider } from "./contexts/ProcessStepsContext";
import { CatalystToastProvider } from "./contexts/CatalystToastContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
const CatalystShell = lazy(() => import("./components/layout/CatalystShell").then(m => ({ default: m.CatalystShell })));
import { ErrorBoundary } from "./components/ErrorBoundary";
const CatalystLoginPageLazy = lazy(() => import("./components/auth/login").then(m => ({ default: m.CatalystLoginPage })));
const CatyFabPlaceholderLazy = lazy(() => import("./components/caty/CatyFabPlaceholder").then(m => ({ default: m.CatyFabPlaceholder })));
const QAAssistantFabLazy = lazy(() => import("./components/testhub-ai").then(m => ({ default: m.QAAssistantFab })));
const KnowledgeAssistFabLazy = lazy(() => import("./components/kb/KAFab").then(m => ({ default: m.KAFab })));

// ─── All page imports converted to lazy ──────────────────────────
const SlackOAuthCallback = lazy(() => import("./pages/SlackOAuthCallback"));
const BrowsePage = lazy(() => import("./pages/BrowsePage"));
const DependencyMapsPage = lazy(() => import("./pages/reports/DependencyMapsPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const PlaceholderPage = lazy(() => import("./pages/jira-align/PlaceholderPage"));

// Strategy Hub pages
const StrategyRoom = lazy(() => import("./pages/strategy/StrategyRoom"));
const StrategyComingSoon = lazy(() => import("./pages/strategy/StrategyComingSoon"));
const CapacityPlannerPage = lazy(() => import("./pages/enterprise/CapacityPlannerPage"));
const BudgetGovernancePage = lazy(() => import("./pages/enterprise/BudgetGovernancePage"));
const BudgetPlannerPage = lazy(() => import("./pages/enterprise/BudgetPlannerPage"));

const Themes = lazy(() => import("./pages/Themes"));
const Initiatives = lazy(() => import("./pages/Initiatives"));
const EpicsPage = lazy(() => import("./pages/items/EpicsPage"));
const EpicsRecycleBinPage = lazy(() => import("./pages/items/EpicsRecycleBinPage"));
const EpicsCanceledPage = lazy(() => import("./pages/items/EpicsCanceledPage"));
const EpicStatusReport = lazy(() => import("./pages/items/reports/EpicStatusReport"));
const EpicTraceReport = lazy(() => import("./pages/items/reports/EpicTraceReport"));
const EpicRequirementHierarchy = lazy(() => import("./pages/items/reports/EpicRequirementHierarchy"));
const EpicResponsibilityMatrix = lazy(() => import("./pages/items/reports/EpicResponsibilityMatrix"));
const EpicPlanningPage = lazy(() => import("./pages/items/reports/EpicPlanningPage"));
const EpicEstimationPage = lazy(() => import("./pages/items/EpicEstimationPage"));
const EpicBacklogWithSidebar = lazy(() => import("./pages/EpicBacklogWithSidebar"));
const Features = lazy(() => import("./pages/Features"));
const FeaturesPage = lazy(() => import("./pages/items/FeaturesPage"));
const FeaturesBacklog = lazy(() => import("./pages/FeaturesBacklog"));
const FeaturePrioritizationView = lazy(() => import("./pages/items/FeaturePrioritizationView"));
const FeatureDetailPage = lazy(() => import("./pages/project/FeatureDetailPage"));
const FeatureBacklogPage = lazy(() => import("./modules/feature-backlog/pages/FeatureBacklogPage"));
const ProjectWorkspace = lazy(() => import("./pages/project/ProjectWorkspace"));
const BoardView = lazy(() => import("./pages/project/BoardView"));
const TimelineView = lazy(() => import("./pages/project/TimelineView"));
const BoardManagerPage = lazy(() => import("./components/boards/BoardManagerPage"));
const BoardCanvasPage = lazy(() => import("./components/boards/BoardCanvasPage"));

const EpicBalancingPage = lazy(() => import("./modules/epic-balancing").then(m => ({ default: m.EpicBalancingPage })));
const UserNotificationSettingsPage = lazy(() => import("./pages/UserNotificationSettingsPage"));
const PlannerPage = lazy(() => import("./modules/planner").then(m => ({ default: m.PlannerPage })));
const KanbanPage = lazy(() => import("./modules/planner").then(m => ({ default: m.KanbanPage })));
const MyTasksPage = lazy(() => import("./modules/planner").then(m => ({ default: m.MyTasksPage })));

// TestHub pages
const TestHubPage = lazy(() => import("./pages/testhub/TestHubPage"));
const TestRepositoryPage = lazy(() => import("./pages/testhub/TestRepositoryPage"));
const TestHubDashboardPage = lazy(() => import("./pages/testhub/TestHubDashboardPage"));
const SharedStepsPage = lazy(() => import("./pages/testhub/SharedStepsPage"));
const TestSetsPage = lazy(() => import("./pages/testhub/TestSetsPage"));
const TestSetDetailPage = lazy(() => import("./pages/testhub/TestSetDetailPage"));
const TestCyclesPage = lazy(() => import("./pages/testhub/TestCyclesPage"));
const TestCycleDetailPage = lazy(() => import("./pages/testhub/TestCycleDetailPage"));
const CycleReportPage = lazy(() => import("./pages/testhub/CycleReportPage"));
const ExecutionHubPage = lazy(() => import("./pages/testhub/ExecutionHubPage"));
const TestHubExecutionPage = lazy(() => import("./pages/testhub/TestHubExecutionPage"));
const TestRunsPage = lazy(() => import("./pages/testhub/TestRunsPage"));
const TestPlansListPage = lazy(() => import("./pages/testhub/TestPlansListPage"));
const PlanDetailPage = lazy(() => import("./pages/testhub/PlanDetailPage"));
const TestHubDefectsPage = lazy(() => import("./pages/testhub/DefectsPage"));
const DefectDetailPage = lazy(() => import("./pages/testhub/DefectDetailPage"));
const TestHubRequirementsPage = lazy(() => import("./pages/testhub/RequirementsListPage"));
const RequirementDetailPage = lazy(() => import("./pages/testhub/RequirementDetailPage"));
const CoverageMatrixPage = lazy(() => import("./pages/testhub/CoverageMatrixPage"));
const EnvironmentsListPage = lazy(() => import("./pages/testhub/EnvironmentsListPage"));
const EnvironmentDetailPage = lazy(() => import("./pages/testhub/EnvironmentDetailPage"));
const TraceabilityPage = lazy(() => import("./pages/testhub/TraceabilityPage"));
const TestHubReportsPage = lazy(() => import("./pages/testhub/ReportsListPage"));
const ReportDetailPage = lazy(() => import("./pages/testhub/ReportDetailPage"));
const TagsListPage = lazy(() => import("./pages/testhub/TagsListPage"));
const TestHubSettingsPage = lazy(() => import("./pages/testhub/SettingsPage"));
const ActivityFeedPage = lazy(() => import("./pages/testhub/ActivityFeedPage"));
const ImportExportPage = lazy(() => import("./pages/testhub/ImportExportPage"));
const ReleasesListPage = lazy(() => import("./pages/testhub/ReleasesListPage"));
const ReleaseDetailPage = lazy(() => import("./pages/testhub/ReleaseDetailPage"));
const CommandCenterPage = lazy(() => import("./pages/testhub/CommandCenterPage"));
const CatyAIPage = lazy(() => import("./pages/testhub/CatyAIPage"));
const TestHubDocsPage = lazy(() => import("./pages/testhub/TestHubDocsPage"));

// Task10 pages
const T10LandingPage = lazy(() => import("./modules/task10/pages/T10LandingPage").then(m => ({ default: m.T10LandingPage })));
const T10WeekPage = lazy(() => import("./modules/task10/pages/T10WeekPage").then(m => ({ default: m.T10WeekPage })));
const T10WeekPageV3 = lazy(() => import("./modules/task10/pages/T10WeekPageV3").then(m => ({ default: m.T10WeekPageV3 })));
const T10CompletedPage = lazy(() => import("./modules/task10/pages/T10CompletedPage").then(m => ({ default: m.T10CompletedPage })));
// Priorities pages
const PriListsPage = lazy(() => import("./modules/priorities/pages/PriListsPage").then(m => ({ default: m.PriListsPage })));
const PriWeekPage = lazy(() => import("./modules/priorities/pages/PriWeekPage").then(m => ({ default: m.PriWeekPage })));

// PlanHub pages
const PlanLibraryPage = lazy(() => import("./pages/planhub").then(m => ({ default: m.PlanLibraryPage })));
const PlanEditorPage = lazy(() => import("./pages/planhub").then(m => ({ default: m.PlanEditorPage })));
const ScenarioComparePage = lazy(() => import("./pages/planhub").then(m => ({ default: m.ScenarioComparePage })));
const MasterPlanPage = lazy(() => import("./pages/planhub").then(m => ({ default: m.MasterPlanPage })));
const PlanHubResourcesPage = lazy(() => import("./pages/planhub").then(m => ({ default: m.ResourcesPage })));
const PlanHubAIPage = lazy(() => import("./pages/planhub").then(m => ({ default: m.AIAssistantPage })));
const PlanHubReportsPage = lazy(() => import("./pages/planhub").then(m => ({ default: m.ReportCenterPage })));

const Defects = lazy(() => import("./pages/Defects"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Impediments = lazy(() => import("./pages/Impediments"));
const ReleaseVehicles = lazy(() => import("./pages/ReleaseVehicles"));
const SuccessCriteria = lazy(() => import("./pages/SuccessCriteria"));
const PortfolioKanban = lazy(() => import("./pages/PortfolioKanban"));
const PortfolioRoadmap = lazy(() => import("./pages/PortfolioRoadmap"));
const Roadmaps = lazy(() => import("./pages/Roadmaps"));
const DependenciesPage = lazy(() => import("./pages/work/Dependencies"));
const ProgramRoom = lazy(() => import("./pages/ProgramRoom"));
const ProgramEpicsPage = lazy(() => import("./pages/ProgramEpicsPage"));
const ProgramBoardHistory = lazy(() => import("./pages/ProgramBoardHistory"));
const QuartersPage = lazy(() => import("./pages/program/QuartersPage"));
const CapacityWithSidebar = lazy(() => import("./pages/program/CapacityWithSidebar"));
const BacklogWithSidebar = lazy(() => import("./pages/program/BacklogWithSidebar"));
const RoadmapsWithSidebar = lazy(() => import("./pages/program/RoadmapsWithSidebar"));
const ProgramRoadmapPage = lazy(() => import("./pages/program/ProgramRoadmapPage"));
const RoadmapsTestPage = lazy(() => import("./pages/program/RoadmapsTestPage"));
const ExecutionWorkbenchPage = lazy(() => import("./pages/program/ExecutionWorkbench"));
const FeaturesWithSidebar = lazy(() => import("./pages/program/FeaturesWithSidebar"));
const ProgramRedirect = lazy(() => import("./pages/program/ProgramRedirect").then(m => ({ default: m.ProgramRedirect })));
const PIObjectives = lazy(() => import("./pages/PIObjectives"));
const CapacityPlanning = lazy(() => import("./pages/CapacityPlanning"));
const Forecast = lazy(() => import("./pages/Forecast"));
const WorkSpendGrid = lazy(() => import("./pages/WorkSpendGrid"));
const RisksGridPage = lazy(() => import("./pages/risks/RisksGridPage"));
const RiskRoamReportPage = lazy(() => import("./pages/risks/RiskRoamReportPage"));
const TeamRoom = lazy(() => import("./pages/TeamRoom"));
const SprintBoard = lazy(() => import("./pages/SprintBoard"));
const Backlog = lazy(() => import("./pages/Backlog"));
const Sprints = lazy(() => import("./pages/Sprints"));
const Stories = lazy(() => import("./pages/Stories"));
const Subtasks = lazy(() => import("./pages/Subtasks"));
const Releases = lazy(() => import("./pages/Releases"));
const ReleasesCommandCenter = lazy(() => import("./pages/releases/CommandCenterPage"));
const ReleasesPlaceholderPage = lazy(() => import("./pages/releases/PlaceholderPage"));
const AllReleasesPage = lazy(() => import("./pages/releases/AllReleasesPageV2"));
const ReleasesTestCasesPage = lazy(() => import("./pages/releases/TestCasesPage"));
const ReleasesTestCasesLibraryPage = lazy(() => import("./pages/releases/TestCasesLibraryPage"));
const ReleasesTestCaseDetailPage = lazy(() => import("./pages/releases/TestCaseDetailPage"));
const ReleasesTestPlansPage = lazy(() => import("./pages/releases/TestPlansPage"));
const ReleasesTestPlanDetailPage = lazy(() => import("./pages/releases/TestPlanDetailPage"));
const ReleasesTestExecutionPage = lazy(() => import("./pages/releases/TestExecutionPage"));
const TestExecutionFocusPage = lazy(() => import("./features/test-execution").then(m => ({ default: m.TestExecutionFocusPage })));
const AskAIPage = lazy(() => import("./features/ask-ai/AskAIPage"));
const RTMPage = lazy(() => import("./features/rtm/RTMPage"));
const MyTestScopePage = lazy(() => import("./pages/releases/MyTestScopePage"));
const CalendarPage = lazy(() => import("./pages/releases/CalendarPage"));
const ComparePage = lazy(() => import("./pages/releases/ComparePage"));
const CoverageReportsPage = lazy(() => import("./pages/releases/CoverageReportsPage"));
const ReleaseDashboardV5Page = lazy(() => import("./pages/releases/ReleaseDashboardV5Page"));
const ReleaseDashboardOverviewPage = lazy(() => import("./pages/releases/ReleaseDashboardOverviewPage"));
const ReleasesTestCyclesPage = lazy(() => import("./pages/releases/TestCyclesPage"));
const ReleasesCycleCommandCenter = lazy(() => import("./pages/releases/CycleCommandCenter"));
const ReleasesCycleTemplatesPage = lazy(() => import("./pages/releases/CycleTemplatesPage"));
const ReleasesDefectsPage = lazy(() => import("./pages/releases/DefectsPage"));
const ReleasesDefectDetailPage = lazy(() => import("./pages/releases/DefectDetailPage"));
const WorkloadDashboard = lazy(() => import("./pages/WorkloadDashboard"));

// Admin pages
const OrgSetup = lazy(() => import("./pages/admin/OrgSetup"));
const HierarchyConfig = lazy(() => import("./pages/admin/HierarchyConfig"));
const CustomFields = lazy(() => import("./pages/admin/CustomFields"));
const BoardConfig = lazy(() => import("./pages/admin/BoardConfig"));
const Permissions = lazy(() => import("./pages/admin/Permissions"));
const Integrations = lazy(() => import("./pages/admin/Integrations"));
const JiraIntegrationConfig = lazy(() => import("./pages/admin/JiraIntegrationConfig"));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const StoriesPage = lazy(() => import('./pages/stories/StoriesPage').then(m => ({ default: m.StoriesPage })));
const Activity = lazy(() => import("./pages/admin/Activity"));
const Changes = lazy(() => import("./pages/admin/Changes"));
const UseTrend = lazy(() => import("./pages/admin/UseTrend"));
const UsageTrends = lazy(() => import("./pages/admin/UsageTrends"));
const ChangesLog = lazy(() => import("./pages/admin/ChangesLog"));
const DesignAuditPage = lazy(() => import("./pages/admin/DesignAuditPage").then(m => ({ default: m.DesignAuditPage })));
const ThemeAuditPage = lazy(() => import("./pages/admin/ThemeAuditPage"));
const ProgressBarsConfig = lazy(() => import("./pages/admin/ProgressBarsConfig"));
const GeneralConfig = lazy(() => import("./pages/admin/GeneralConfig"));
const WorkCodes = lazy(() => import("./pages/admin/WorkCodes"));
const DetailsPanels = lazy(() => import("./pages/admin/DetailsPanels"));
const Terminology = lazy(() => import("./pages/admin/Terminology"));
const TeamSettings = lazy(() => import("./pages/admin/TeamSettings"));
const ProgramSettings = lazy(() => import("./pages/admin/ProgramSettings"));
const PortfolioSettings = lazy(() => import("./pages/admin/PortfolioSettings"));
const ProgressBars = lazy(() => import("./pages/admin/ProgressBars"));
const EstimationSettings = lazy(() => import("./pages/admin/EstimationSettings"));
const GeneralSettings = lazy(() => import("./pages/admin/GeneralSettings"));
const SecuritySettings = lazy(() => import("./pages/admin/SecuritySettings"));
const Announcements = lazy(() => import("./pages/admin/Announcements"));
const UsersManagement = lazy(() => import("./pages/admin/UsersManagement"));
const RolesPermissions = lazy(() => import("./pages/admin/RolesPermissions"));
const ModuleMatrixPage = lazy(() => import("./components/admin/ModuleMatrixPage"));
const ThemeGroups = lazy(() => import("./pages/admin/ThemeGroups"));
const Programs = lazy(() => import("./pages/admin/Programs"));
const Departments = lazy(() => import("./pages/admin/Departments"));
const CapacityDepartmentsPage = lazy(() => import("./pages/admin/CapacityDepartments"));
const ResourceAssignmentsPage = lazy(() => import("./pages/admin/ResourceAssignments"));
const ResourceLocationsPage = lazy(() => import("./pages/admin/ResourceLocations"));
const ResourceCountriesPage = lazy(() => import("./pages/admin/ResourceCountries"));
const ResourceVendorsPage = lazy(() => import("./pages/admin/ResourceVendors"));
const BusinessOwnersAdmin = lazy(() => import("./pages/admin/BusinessOwners"));
const BusinessProcesses = lazy(() => import("./pages/admin/BusinessProcesses"));
const Portfolios = lazy(() => import("./pages/admin/Portfolios"));
const Estimation = lazy(() => import("./pages/admin/Estimation"));
const Security = lazy(() => import("./pages/admin/Security"));
const ActivityLog = lazy(() => import("./pages/admin/ActivityLog"));
const ModulesPackages = lazy(() => import("./pages/admin/ModulesPackages"));
const UserRoles = lazy(() => import("./pages/admin/UserRoles"));
const ReportsDiscovery = lazy(() => import("./pages/admin/ReportsDiscovery"));
const PIWizard = lazy(() => import("./pages/admin/PIWizard"));
const JiraIntegration = lazy(() => import("./pages/admin/JiraIntegration"));
const ImportData = lazy(() => import("./pages/admin/ImportData"));
const DataHygiene = lazy(() => import("./pages/admin/DataHygiene"));
const ProductSettings = lazy(() => import("./pages/admin/ProductSettings"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AuditActivityPage = lazy(() => import("./pages/admin/AuditActivityPage"));
const KanbanSettings = lazy(() => import("./pages/admin/KanbanSettings"));
const ResourceUtilizationPage = lazy(() => import("./pages/admin/ResourceUtilization"));
const UserAccessPage = lazy(() => import("./pages/admin/UserAccessPage"));
const MockDataGenerator = lazy(() => import("./pages/admin/MockDataGenerator"));
const AiIntegrationPage = lazy(() => import("./pages/admin/AiIntegrationPage"));
const ProcessSteps = lazy(() => import("./pages/admin/ProcessSteps"));
const SlackIntegrationPage = lazy(() => import("./pages/admin/SlackIntegrationPage"));
const TaskListPage = lazy(() => import("./modules/planner/pages/TaskListPage"));
const CreateMenuConfig = lazy(() => import("./pages/admin/CreateMenuConfig"));
const DeliveryPlatforms = lazy(() => import("./pages/admin/DeliveryPlatforms"));
const RiskSeverityLevels = lazy(() => import("./pages/admin/RiskSeverityLevels"));
const PlanHubGeneralSettings = lazy(() => import("./pages/admin/planhub").then(m => ({ default: m.PlanHubGeneralSettings })));
const PlanHubTemplates = lazy(() => import("./pages/admin/planhub").then(m => ({ default: m.PlanHubTemplates })));
const PlanHubAIConfig = lazy(() => import("./pages/admin/planhub").then(m => ({ default: m.PlanHubAIConfig })));
const PlanHubActivityLog = lazy(() => import("./pages/admin/planhub").then(m => ({ default: m.PlanHubActivityLog })));
const WorkHubAdminPage = lazy(() => import("./modules/workhub/admin/pages/WorkHubAdmin"));
const WorkHubSettingsLayout = lazy(() => import("./modules/workhub/admin/pages/WorkHubSettingsLayout"));
const WorkHubComingSoon = lazy(() => import("./modules/workhub/admin/pages/WorkHubComingSoon"));
const WorkHubHierarchyPage = lazy(() => import("./modules/workhub/admin/pages/WorkHubHierarchyPage"));
const WorkHubSchedulingPage = lazy(() => import("./modules/workhub/admin/pages/WorkHubSchedulingPage"));
const WorkHubStatusMappingPage = lazy(() => import("./modules/workhub/admin/pages/WorkHubStatusMappingPage"));
const WorkHubUserMappingPage = lazy(() => import("./modules/workhub/admin/pages/WorkHubUserMappingPage"));
const WorkHubDataScopePage = lazy(() => import("./modules/workhub/admin/pages/WorkHubDataScopePage"));
const WorkHubSyncLogs = lazy(() => import("./modules/workhub/admin/pages/WorkHubSyncLogsPage"));

const SoftwareLicensesPage = lazy(() => import("./modules/budget/components/SoftwareLicensesPage").then(m => ({ default: m.SoftwareLicensesPage })));
const RoutesComponentsRegistry = lazy(() => import("./pages/admin/RoutesComponentsRegistry"));
const EpicStatuses = lazy(() => import("./pages/admin/EpicStatuses"));
const FeatureStatuses = lazy(() => import("./pages/admin/FeatureStatuses"));
const ThemeStatuses = lazy(() => import("./pages/admin/ThemeStatuses"));
const IncidentWorkgroups = lazy(() => import("./pages/admin/incident").then(m => ({ default: m.IncidentWorkgroups })));
const IncidentFieldsConfig = lazy(() => import("./pages/admin/incident").then(m => ({ default: m.IncidentFieldsConfig })));
const IncidentSLAPolicies = lazy(() => import("./pages/admin/incident").then(m => ({ default: m.IncidentSLAPolicies })));
const IncidentCAPPolicy = lazy(() => import("./pages/admin/incident").then(m => ({ default: m.IncidentCAPPolicy })));
const IncidentConversionRules = lazy(() => import("./pages/admin/incident").then(m => ({ default: m.IncidentConversionRules })));
const IncidentAuditCompliance = lazy(() => import("./pages/admin/incident").then(m => ({ default: m.IncidentAuditCompliance })));
const IncidentOwningTeams = lazy(() => import("./pages/admin/incident").then(m => ({ default: m.IncidentOwningTeams })));

const ValueStreamView = lazy(() => import("./pages/ValueStreamView"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProgramDirectory = lazy(() => import("./pages/ProgramDirectory"));
const ProjectDirectory = lazy(() => import("./pages/ProjectDirectory"));
const ProjectSettingsPage = lazy(() => import("./pages/ProjectSettingsPage"));
const ProjectWorkHubPage = lazy(() => import("./modules/project-work-hub/ProjectWorkHubPage").then(m => ({ default: m.ProjectWorkHubPage })));

const InJiraLayout = lazy(() => import("./modules/in-jira").then(m => ({ default: m.InJiraLayout })));
const InJiraSummaryPage = lazy(() => import("./modules/in-jira").then(m => ({ default: m.SummaryPage })));
const KanbanBoardPage = lazy(() => import("./modules/in-jira").then(m => ({ default: m.KanbanBoardPage })));
const ScrumBoardPage = lazy(() => import("./modules/in-jira").then(m => ({ default: m.ScrumBoardPage })));
const InJiraListPage = lazy(() => import("./modules/in-jira").then(m => ({ default: m.ListPage })));
const InJiraAllWorkPage = lazy(() => import("./modules/in-jira").then(m => ({ default: m.AllWorkPage })));
const InJiraReleasesPage = lazy(() => import("./modules/in-jira").then(m => ({ default: m.ReleasesPage })));
const ReleaseManagementPage = lazy(() => import("./modules/in-jira").then(m => ({ default: m.ReleaseManagementPage })));
const InJiraSettingsPage = lazy(() => import("./modules/in-jira").then(m => ({ default: m.InJiraSettingsPage })));

const ProjectSummaryPage = lazy(() => import("./pages/projects/ProjectSummaryPage"));
const ProjectComingSoonPage = lazy(() => import("./pages/projects/ProjectComingSoonPage"));
const ProjectBacklogPage = lazy(() => import("./pages/projects/ProjectBacklogPage"));

const OldWorkHubLayout = lazy(() => import("./modules/work-hub/WorkHubLayout").then(m => ({ default: m.WorkHubLayout })));
const SummaryView = lazy(() => import("./modules/work-hub/views/SummaryView").then(m => ({ default: m.SummaryView })));
const ListView = lazy(() => import("./modules/work-hub/views").then(m => ({ default: m.ListView })));
const AllWorkView = lazy(() => import("./modules/work-hub/views").then(m => ({ default: m.AllWorkView })));
const ReleasesView = lazy(() => import("./modules/work-hub/views").then(m => ({ default: m.ReleasesView })));
const ReleaseDetailsView = lazy(() => import("./modules/work-hub/views").then(m => ({ default: m.ReleaseDetailsView })));

const WorkHubLayout = lazy(() => import("./components/workhub/layout/WorkHubLayout").then(m => ({ default: m.WorkHubLayout })));
const WorkHubDashboard = lazy(() => import("./components/workhub/dashboard/WorkHubDashboard").then(m => ({ default: m.WorkHubDashboard })));
const WorkItemsPage = lazy(() => import("./components/workhub/workitems/WorkItemsPage").then(m => ({ default: m.WorkItemsPage })));
const JiraProjectsPage = lazy(() => import("./components/workhub/jira/JiraProjectsPage").then(m => ({ default: m.JiraProjectsPage })));
const WorkHubReleasesPage = lazy(() => import("./components/workhub/releases/ReleasesPage").then(m => ({ default: m.ReleasesPage })));
const WorkHubReleaseDetail = lazy(() => import("./components/workhub/releases/ReleaseDetail").then(m => ({ default: m.ReleaseDetail })));
const WorkHubThemesPage = lazy(() => import("./components/workhub/themes/ThemesPage").then(m => ({ default: m.ThemesPage })));
const WorkHubThemeDetail = lazy(() => import("./components/workhub/themes/ThemeDetail").then(m => ({ default: m.ThemeDetail })));
const WorkHubResource360Page = lazy(() => import("./components/workhub/resource360/Resource360Page").then(m => ({ default: m.Resource360Page })));
const WorkHubResourceDetail = lazy(() => import("./components/workhub/resource360/ResourceDetail").then(m => ({ default: m.ResourceDetail })));
const WorkHubCalendarPage = lazy(() => import("./components/workhub/calendar/CalendarPage").then(m => ({ default: m.CalendarPage })));
const WorkHubCapacityPage = lazy(() => import("./components/workhub/capacity/CapacityPage").then(m => ({ default: m.CapacityPage })));
const WorkHubAnalyticsPage = lazy(() => import("./components/workhub/analytics/AnalyticsPage").then(m => ({ default: m.AnalyticsPage })));
const WorkHubCatyPage = lazy(() => import("./components/workhub/caty/CatyPage").then(m => ({ default: m.CatyPage })));

const AdminGuard = lazy(() => import("./components/admin/AdminGuard").then(m => ({ default: m.AdminGuard })));

const ForYouPage = lazy(() => import("./pages/ForYouPage"));
const ProductRoadmapPage = lazy(() => import("./pages/ProductRoadmapPage"));
const ProductRoadmapV2Page = lazy(() => import("./pages/ProductRoadmapV2Page"));
const IndustryRoadmapPage = lazy(() => import("./pages/industry/IndustryRoadmapPage"));

const EnterpriseEpics = lazy(() => import("./pages/enterprise/EnterpriseEpics"));
const WorkTreePage = lazy(() => import("./pages/work-tree").then(m => ({ default: m.WorkTreePage })));
const WorkManager = lazy(() => import("./pages/WorkManager"));
const EnterpriseTasks = lazy(() => import("./pages/enterprise/EnterpriseTasks"));
const EnterpriseObjectives = lazy(() => import("./pages/enterprise/EnterpriseObjectives"));
const EnterpriseDependencies = lazy(() => import("./pages/enterprise/EnterpriseDependencies"));
const EnterpriseReleaseVehicles = lazy(() => import("./pages/enterprise/EnterpriseReleaseVehicles"));
const EnterpriseSuccessCriteria = lazy(() => import("./pages/enterprise/EnterpriseSuccessCriteria"));
const EnterpriseRisks = lazy(() => import("./pages/enterprise/EnterpriseRisks"));
const EnterpriseComingSoon = lazy(() => import("./pages/enterprise/ComingSoon"));
const SkillsInventory = lazy(() => import("./pages/SkillsInventory"));
const StarredPage = lazy(() => import("./pages/StarredPage"));

// WorkHub lazy imports
const WorkHubAllWork = lazy(() => import("./pages/workhub/AllWork"));

const BusinessRequests = lazy(() => import("./pages/enterprise/BusinessRequests"));
const MiningComingSoon = lazy(() => import("./pages/enterprise/MiningComingSoon"));
const IndustryPage = lazy(() => import("./pages/enterprise/DemandIntakeCatalyst"));
const IndustryComingSoon = lazy(() => import("./pages/enterprise/IndustryComingSoon"));
const DemandSummaryPage = lazy(() => import("./pages/enterprise/DemandSummaryPage"));
const ProductRoomPage = lazy(() => import("./pages/ProductRoomPage"));
const CapacityPlanningPage = lazy(() => import("./pages/CapacityPlanningPage"));
const CatalystDemandKanban = lazy(() => import("./modules/kanban/pages/CatalystDemandKanban"));
const CatalystDemandList = lazy(() => import("./modules/product-backlog/pages/CatalystDemandList"));
const CatalystDemandTable = lazy(() => import("./modules/product-backlog/pages/CatalystDemandTable"));

const SubmitDemandRequest = lazy(() => import("./pages/SubmitDemandRequest"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const TeamComingSoon = lazy(() => import("./pages/team/ComingSoon"));
const UnauthorizedPage = lazy(() => import("./pages/UnauthorizedPage"));
const KanbanBoardView = lazy(() => import("./pages/KanbanBoardView"));
const KanbanBoardSetup = lazy(() => import("./pages/KanbanBoardSetup"));
const KanbanBoardAnalytics = lazy(() => import("./pages/KanbanBoardAnalytics"));
const KnowledgeHubDocumentPage = lazy(() => import("./pages/KnowledgeHubDocumentPage"));
const KnowledgeHubPage = lazy(() => import("./pages/KnowledgeHubPage"));
const KnowledgeHubSpacePage = lazy(() => import("./pages/KnowledgeHubSpacePage"));

// Release Management Module (Incidents only)
const IncidentsList = lazy(() => import("./pages/release").then(m => ({ default: m.IncidentsList })));
const IncidentDetail = lazy(() => import("./pages/release").then(m => ({ default: m.IncidentDetail })));
const IncidentsDashboard = lazy(() => import("./pages/release").then(m => ({ default: m.IncidentsDashboard })));
const CreateIncident = lazy(() => import("./pages/release").then(m => ({ default: m.CreateIncident })));
const CommitteeQueue = lazy(() => import("./pages/release").then(m => ({ default: m.CommitteeQueue })));
const IncidentReports = lazy(() => import("./pages/release").then(m => ({ default: m.IncidentReports })));

// Releases - Test Execution
const ExecutionPage = lazy(() => import("./pages/releases/ExecutionPage"));
const QualityGatesPage = lazy(() => import("./pages/releases/QualityGatesPage"));

// Incident Room (New)
const IncidentRoomList = lazy(() => import("./pages/release/IncidentRoomList"));
const IncidentRoomDetail = lazy(() => import("./pages/release/IncidentRoomDetail"));
const IncidentCommandCenter = lazy(() => import("./pages/release/IncidentCommandCenter"));

// Incident Analytics
const IncidentAnalyticsPage = lazy(() => import("./modules/incidents/analytics/pages/IncidentAnalyticsPage"));
const IncidentInsightsPage = lazy(() => import("./modules/incidents/analytics/pages/IncidentInsightsPage"));
const IncidentKanbanPage = lazy(() => import("./modules/incidents/kanban/pages/IncidentKanbanPage"));


const queryClient = new QueryClient();

// Helper to wrap lazy components in Suspense
const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="p-8">Loading...</div>}>{children}</Suspense>
);

// Caty FAB on capacity planner and project hub routes
function CatyWidgetRouteGuard() {
  const location = useLocation();
  const showCaty = location.pathname.startsWith('/planhub/capacity') || location.pathname.startsWith('/strategyhub/capacity') || location.pathname.startsWith('/enterprise/capacity');
  if (!showCaty) return null;
  return <Suspense fallback={null}><CatyFabPlaceholderLazy /></Suspense>;
}

// QA Assistant FAB on TestHub routes
function QAAssistantRouteGuard() {
  const location = useLocation();
  const isTestHubRoute = location.pathname.startsWith('/testhub');
  if (!isTestHubRoute) return null;
  return <Suspense fallback={null}><QAAssistantFabLazy /></Suspense>;
}

// Knowledge Assist FAB — shown only on /for-you route
function KnowledgeAssistFabRouteGuard() {
  const location = useLocation();
  if (location.pathname !== '/for-you') return null;
  return <Suspense fallback={null}><KnowledgeAssistFabLazy /></Suspense>;
}

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <Toaster />
      <HotToaster 
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '14px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#f8fafc',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#f8fafc',
            },
          },
        }}
      />
      <AuthProvider>
        <NavigationProvider>
          <ProcessStepsProvider>
          <CatalystToastProvider position="top-right" maxToasts={5}>
            <TooltipProvider>
              <BrowserRouter>
              <Routes>
 <Route path="/" element={<Navigate to="/for-you" replace />} />
              <Route path="/auth" element={<S><CatalystLoginPageLazy /></S>} />
              <Route path="/auth/slack/callback" element={<S><SlackOAuthCallback /></S>} />
              <Route path="/submit-request" element={<S><SubmitDemandRequest /></S>} />
              <Route path="/kb-admin-setup" element={<S><KBAdminSetup /></S>} />
              <Route path="/kb-admin" element={<Navigate to="/admin/kb" replace />} />
              <Route path="/kb-data-audit" element={<S><KBDataAuditPage /></S>} />
              
              {/* Work Hub Test Route */}
              <Route path="/work-hub-test" element={<S><WorkHubLayout /></S>}>
                <Route index element={<Navigate to="summary" replace />} />
                <Route path="summary" element={<S><SummaryView /></S>} />
                <Route path="list" element={<S><ListView /></S>} />
                <Route path="all-work" element={<S><AllWorkView /></S>} />
                <Route path="releases" element={<S><ReleasesView /></S>} />
                <Route path="releases/:versionId" element={<S><ReleaseDetailsView /></S>} />
              </Route>
              <Route path="/reset-password" element={<S><ResetPassword /></S>} />
              
              {/* Deep-link resolver for work items */}
              <Route path="/browse/:key" element={<ProtectedRoute><S><CatalystShell /></S></ProtectedRoute>}>
                <Route index element={<S><BrowsePage /></S>} />
              </Route>

              {/* All Routes - Catalyst Style */}
              <Route element={<ProtectedRoute><S><CatalystShell /></S></ProtectedRoute>}>
              <Route path="/for-you" element={<S><ForYouPage /></S>} />
              <Route path="/home" element={<Navigate to="/for-you" replace />} />
              
              {/* Product Hub routes */}
              <Route path="/producthub" element={<Navigate to="/producthub/backlog" replace />} />
              <Route path="/producthub/backlog" element={<S><InitiativeListingPage /></S>} />
              <Route path="/producthub/table" element={<S><CatalystDemandTable /></S>} />
              <Route path="/producthub/kanban" element={<S><ProductKanbanPage /></S>} />
              <Route path="/producthub/dashboard" element={<S><DemandSummaryPage /></S>} />
              <Route path="/producthub/roadmaps" element={<Navigate to="/producthub/roadmap" replace />} />
              <Route path="/producthub/roadmaps-v1" element={<S><IndustryRoadmapPage /></S>} />
              <Route path="/producthub/reports" element={<S><IndustryComingSoon /></S>} />
              <Route path="/producthub/roadmap" element={<S><RoadmapPage /></S>} />
              <Route path="/producthub/cards" element={<S><ProductCardsPage /></S>} />
              <Route path="/producthub/ideation" element={<S><IdeationPage /></S>} />
              <Route path="/product/ideas/roadmap" element={<S><IdeasRoadmapPage /></S>} />
              {/* Requirement Assist routes */}
              <Route path="/producthub/requirement-assist" element={<S><RequirementAssistWorkspace /></S>} />
              <Route path="/producthub/requirement-assist/compose" element={<S><RequirementAssistCompose /></S>} />
              <Route path="/producthub/requirement-assist/categories" element={<S><RequirementAssistCategories /></S>} />
              <Route path="/producthub/requirement-assist/:id" element={<S><RequirementAssistOutput /></S>} />
              {/* Req Assist V2 — Document Library */}
              <Route path="/product/req-assist" element={<S><ReqAssistLibrary /></S>} />
              <Route path="/product/req-assist/generate" element={<S><ReqAssistGenerate /></S>} />
              <Route path="/req-assist/rag-audit" element={<S><RAGAuditPage /></S>} />
              <Route path="/product-hub/req-assist" element={<Navigate to="/product/req-assist" replace />} />
              <Route path="/product-hub/req-assist/generate" element={<Navigate to="/product/req-assist/generate" replace />} />
              {/* Legacy industry redirects */}
              <Route path="/industry/*" element={<Navigate to="/producthub" replace />} />
              
              {/* Starred items page */}
              <Route path="/starred" element={<S><StarredPage /></S>} />

              <Route path="/search" element={<S><SearchPage /></S>} />
              <Route path="/portfolio/:portfolioId/room" element={<S><PlaceholderPage /></S>} />
              <Route path="/portfolio/:portfolioId/epics" element={<S><EpicsPage /></S>} />
              <Route path="/portfolio/:portfolioId/backlog" element={<S><EpicBacklogWithSidebar /></S>} />
              <Route path="/portfolio/:portfolioId/roadmaps" element={<S><PlaceholderPage /></S>} />
              <Route path="/portfolio/:portfolioId/objective-tree" element={<S><PlaceholderPage /></S>} />
              <Route path="/portfolio/:portfolioId/work-tree" element={<S><WorkTreePage /></S>} />
              <Route path="/portfolio/:portfolioId/forecast" element={<S><Forecast /></S>} />
              <Route path="/portfolio/:portfolioId/capacity" element={<S><PlaceholderPage /></S>} />
              <Route path="/portfolio/:portfolioId/programs" element={<S><PlaceholderPage /></S>} />
              {/* ═══ Strategy Hub Routes ═══ */}
              <Route path="/strategyhub" element={<S><StrategyRoom /></S>} />
              <Route path="/strategyhub/themes" element={<S><StrategicThemesPage /></S>} />
              <Route path="/strategyhub/goals" element={<S><GoalsKeyResultsPage /></S>} />
              <Route path="/strategyhub/initiatives" element={<Navigate to="/producthub/backlog" replace />} />
              <Route path="/strategyhub/investment" element={<S><StrategyComingSoon title="Investment Allocation" /></S>} />
              <Route path="/strategyhub/snapshots" element={<S><StrategyComingSoon title="Snapshots" /></S>} />
              <Route path="/strategyhub/ai-insights" element={<S><StrategyComingSoon title="AI Insights" /></S>} />
              <Route path="/strategyhub/team-alignment" element={<S><StrategyComingSoon title="Team Alignment" /></S>} />
              <Route path="/strategyhub/settings" element={<S><StrategyComingSoon title="Settings" /></S>} />
              {/* Legacy strategy redirects */}
              <Route path="/strategy-room" element={<Navigate to="/strategyhub" replace />} />
              <Route path="/strategyhub/strategy-room" element={<Navigate to="/strategyhub" replace />} />
              <Route path="/portfolio/:portfolioId/okr-hub" element={<S><PlaceholderPage /></S>} />
              <Route path="/program/:programId/okr-hub" element={<S><PlaceholderPage /></S>} />
              <Route path="/program" element={<S><ProgramRedirect /></S>} />
              <Route path="/program/:programId/work-tree" element={<S><ExecutionWorkbenchPage /></S>} />
              <Route path="/program/:programId/room" element={<S><ProgramRoom /></S>} />
              <Route path="/program/:programId/epics" element={<S><ProgramEpicsPage /></S>} />
              <Route path="/program/:programId/epic-backlog" element={<S><EpicBacklogWithSidebar /></S>} />
              <Route path="/program/:programId/feature-backlog" element={<S><FeatureBacklogPage /></S>} />
              <Route path="/program/:programId/features" element={<S><FeaturesWithSidebar /></S>} />
              <Route path="/program/:programId/program-board" element={<S><PlaceholderPage /></S>} />
              <Route path="/program/:programId/dependencies" element={<S><DependenciesPage /></S>} />
              <Route path="/program/:programId/roadmaps" element={<S><ProgramRoadmapPage /></S>} />
              <Route path="/program/:programId/roadmaps-test" element={<S><RoadmapsTestPage /></S>} />
              <Route path="/program/:programId/objectives-tree" element={<S><PlaceholderPage /></S>} />
              <Route path="/program/:programId/forecast" element={<S><PlaceholderPage /></S>} />
              <Route path="/program/:programId/capacity" element={<S><CapacityWithSidebar /></S>} />
              <Route path="/program/:programId/quarters" element={<S><QuartersPage /></S>} />
              <Route path="/program/:programId/epic-balancing" element={<S><EpicBalancingPage /></S>} />
              <Route path="/program/:programId/reports" element={<S><PlaceholderPage /></S>} />
              <Route path="/team/:teamId/okr-hub" element={<S><PlaceholderPage /></S>} />
              <Route path="/strategyhub/roadmaps" element={<Navigate to="/strategyhub/risks" replace />} />
              <Route path="/enterprise/roadmaps" element={<Navigate to="/strategyhub/risks" replace />} />
              <Route path="/work-tree" element={<S><WorkTreePage /></S>} />
              <Route path="/enterprise/work-tree" element={<S><WorkTreePage /></S>} />
              <Route path="/enterprise/kanban-boards" element={<S><EnterpriseComingSoon /></S>} />
              
              {/* Taskhub Module */}
              <Route path="/taskhub" element={<Navigate to="/taskhub/boards" replace />} />
              <Route path="/taskhub/:view" element={<S><PlannerPage /></S>} />
              <Route path="/taskhub-kanban" element={<S><KanbanPage /></S>} />
              <Route path="/taskhub/my-tasks" element={<S><MyTasksPage /></S>} />
              
              {/* TestHub Module */}
              <Route path="/testhub" element={<S><TestHubPage /></S>}>
                <Route index element={<Navigate to="/testhub/dashboard" replace />} />
                <Route path="repository" element={<S><TestRepositoryPage /></S>} />
                <Route path="dashboard" element={<S><TestHubDashboardPage /></S>} />
                <Route path="shared-steps" element={<S><SharedStepsPage /></S>} />
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
                <Route path="caty" element={<S><CatyAIPage /></S>} />
                <Route path="docs" element={<S><TestHubDocsPage /></S>} />
              </Route>
              
              {/* IncidentHub — Incident Management */}
              <Route path="/incident-hub" element={<S><IncidentHubListPage /></S>} />
              <Route path="/incident-hub/kanban" element={<S><IncidentHubKanbanPage /></S>} />
              <Route path="/incident-hub/analytics" element={<S><IncidentHubAnalyticsPage /></S>} />
              <Route path="/incident-hub/insights" element={<S><IncidentHubInsightsPage /></S>} />
              <Route path="/incident-hub/reports" element={<S><IncidentHubReportsPage /></S>} />
              <Route path="/incident-hub/committee-queue" element={<S><IncidentHubCommitteeQueuePage /></S>} />
              <Route path="/incident-hub/view/:id" element={<S><IncidentRoomDetail /></S>} />

              {/* ReleaseHub v2.1 — Release & Change Management */}
              <Route path="/releasehub" element={<Navigate to="/releasehub/command-center" replace />} />
              <Route path="/releasehub/command-center" element={<S><RH21CommandCenterPage /></S>} />
              <Route path="/releasehub/all-releases" element={<S><RH21AllReleasesPage /></S>} />
              <Route path="/releasehub/compare" element={<S><RH21ReleaseComparePage /></S>} />
              <Route path="/releasehub/triage" element={<S><RH21TriageQueuePage /></S>} />
              <Route path="/releasehub/changes" element={<S><RH21AllChangesPage /></S>} />
              <Route path="/releasehub/production-events" element={<S><RH21ProductionEventsPage /></S>} />
              {/* Legacy releasehub routes */}
              <Route path="/releasehub/dashboard" element={<Navigate to="/releasehub/command-center" replace />} />
              <Route path="/releasehub/all" element={<Navigate to="/releasehub/all-releases" replace />} />
              <Route path="/releasehub/:releaseId" element={<S><ReleaseDashboardV5Page /></S>} />
              
               {/* Priorities Module */}
               <Route path="/priorities" element={<S><T10LandingPage /></S>} />
               <Route path="/priorities/completed" element={<S><T10CompletedPage /></S>} />
               <Route path="/priorities/list/:listId" element={<S><T10WeekPage /></S>} />
               <Route path="/priorities/list/:listId/week/:weekId" element={<S><T10WeekPageV3 /></S>} />
               
               {/* Legacy task10 routes - redirect to priorities */}
               <Route path="/taskhub/task10" element={<Navigate to="/priorities" replace />} />
               <Route path="/taskhub/task10/*" element={<Navigate to="/priorities" replace />} />
               
               {/* Legacy planner routes - redirect to taskhub */}
               <Route path="/planner" element={<Navigate to="/taskhub/boards" replace />} />
               <Route path="/planner/*" element={<Navigate to="/taskhub/boards" replace />} />
              
              {/* PlanHub Module */}
              <Route path="/planhub" element={<S><PlanLibraryPage /></S>} />
              <Route path="/planhub/plan/:planId" element={<S><PlanEditorPage /></S>} />
              <Route path="/planhub/compare" element={<S><ScenarioComparePage /></S>} />
              <Route path="/planhub/master" element={<S><MasterPlanPage /></S>} />
              <Route path="/planhub/resources" element={<S><PlanHubResourcesPage /></S>} />
              <Route path="/planhub/ai" element={<S><PlanHubAIPage /></S>} />
              <Route path="/planhub/reports" element={<S><PlanHubReportsPage /></S>} />
              <Route path="/planhub/capacity" element={<S><CapacityPlannerPage /></S>} />
              <Route path="/planhub/budget-planner" element={<S><BudgetPlannerPage /></S>} />
              
              {/* Wiki Module */}
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

              {/* Mining */}
              <Route path="/mining" element={<S><MiningComingSoon /></S>} />
              
              {/* Product routes */}
              <Route path="/product/room" element={<S><ProductRoomPage /></S>} />
              <Route path="/product/:productId/room" element={<S><ProductRoomPage /></S>} />
              <Route path="/product/capacity" element={<S><CapacityPlanningPage /></S>} />

              <Route path="/strategyhub/risks" element={<S><EnterpriseRisks /></S>} />
              <Route path="/enterprise/risks" element={<Navigate to="/strategyhub/risks" replace />} />
              <Route path="/enterprise/impediments" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/epics" element={<S><EnterpriseEpics /></S>} />
              
              <Route path="/enterprise/features" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/stories" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/defects" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/tasks" element={<S><EnterpriseTasks /></S>} />
              <Route path="/enterprise/objectives" element={<S><EnterpriseObjectives /></S>} />
              <Route path="/enterprise/dependencies" element={<S><EnterpriseDependencies /></S>} />
              <Route path="/enterprise/sprints" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/program-increments" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/release-vehicles" element={<S><EnterpriseReleaseVehicles /></S>} />
              <Route path="/enterprise/success-criteria" element={<S><EnterpriseSuccessCriteria /></S>} />
              <Route path="/enterprise/skills-inventory" element={<S><SkillsInventory /></S>} />
              
              {/* Enterprise More Items - Placeholder Routes */}
              <Route path="/enterprise/brainstorming" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/innovation" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/canvas" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/mind-maps" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/competitors" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/goals" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/vision" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/personas" element={<S><EnterpriseComingSoon /></S>} />
              
              {/* Enterprise Reports - Placeholder Routes */}
              <Route path="/enterprise/reports/assessment" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/reports/assessment-results" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/reports/cumulative-effort" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/reports/strategic-balancing" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/reports/folios" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/reports/external" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/reports/organizational-hierarchy" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/reports/work-tree" element={<S><WorkTreePage /></S>} />
              <Route path="/enterprise/reports/demand-capacity" element={<S><CapacityPlanningPage /></S>} />
              
              {/* Enterprise More Pages - Placeholder Routes */}
              <Route path="/enterprise/pages/assessments" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/pages/definition-of-done" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/pages/framework-maps" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/pages/lean-process" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/pages/metrics" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/pages/meetings" element={<S><EnterpriseComingSoon /></S>} />
              <Route path="/enterprise/pages/story-point-progress" element={<S><EnterpriseComingSoon /></S>} />
              
              <Route path="/themes" element={<S><Themes /></S>} />
              <Route path="/themes/grid" element={<S><Themes /></S>} />
              <Route path="/portfolio/:portfolioId/themes" element={<S><Themes /></S>} />
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
              <Route path="/portfolio/:portfolioId/epic-estimation" element={<S><EpicEstimationPage /></S>} />
              
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
              <Route path="/programs/:programId/room" element={<S><ProgramRoom /></S>} />
              <Route path="/programs/:programId/epics" element={<S><EpicsPage /></S>} />
              <Route path="/programs/:programId/features" element={<S><FeaturesWithSidebar /></S>} />
              <Route path="/programs/:programId/backlog" element={<S><BacklogWithSidebar /></S>} />
              <Route path="/programs/:programId/epic-backlog" element={<S><EpicBacklogWithSidebar /></S>} />
              <Route path="/programs/:programId/roadmaps" element={<S><ProgramRoadmapPage /></S>} />
              <Route path="/programs/:programId/objective-tree" element={<S><PlaceholderPage /></S>} />
              <Route path="/programs/:programId/work-tree" element={<S><WorkTreePage /></S>} />
              <Route path="/programs/:programId/program-board" element={<S><PlaceholderPage /></S>} />
              <Route path="/programs/:programId/forecast" element={<S><PlaceholderPage /></S>} />
              <Route path="/programs/:programId/capacity" element={<S><CapacityWithSidebar /></S>} />
              <Route path="/programs/:programId/settings" element={<S><PlaceholderPage /></S>} />
              <Route path="/programs/:programId/quarters" element={<S><QuartersPage /></S>} />
              <Route path="/program-room" element={<Navigate to="/for-you" replace />} />
              <Route path="/pis" element={<S><PlaceholderPage /></S>} />
              <Route path="/program-board" element={<Navigate to="/for-you" replace />} />
              <Route path="/programs/program-board" element={<Navigate to="/for-you" replace />} />
              <Route path="/programs/program-board/history" element={<S><ProgramBoardHistory /></S>} />
              <Route path="/pi-objectives" element={<S><PIObjectives /></S>} />
              <Route path="/capacity" element={<S><CapacityPlanning /></S>} />
              <Route path="/risks" element={<S><RisksGridPage /></S>} />
              <Route path="/risk-roam-report" element={<S><RiskRoamReportPage /></S>} />
              <Route path="/release-train-calendar" element={<div className="p-8"><h1 className="text-2xl font-bold">Release Calendar</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/program-backlog" element={<div className="p-8"><h1 className="text-2xl font-bold">Program Backlog</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/programs" element={<S><ProgramDirectory /></S>} />
              <Route path="/projects" element={<S><ProjectDirectory /></S>} />
              <Route path="/projects/:projectKey" element={<Navigate to={`/projects`} replace />} />
              <Route path="/projects/:projectKey/summary" element={<Navigate to={`/projects`} replace />} />

              {/* WorkHub All Work — new route */}
              <Route path="/workhub/all-work" element={<S><WorkHubAllWork /></S>} />
              {/* LEGACY /projecthub — redirect to /project-hub */}
              <Route path="/workhub" element={<Navigate to="/project-hub" replace />} />
              <Route path="/projecthub" element={<Navigate to="/project-hub" replace />} />
              <Route path="/projecthub/resource360" element={<Navigate to="/project-hub/resource-360/009" replace />} />
              <Route path="/projecthub/resource360/:id" element={<Resource360Redirect />} />

              {/* Resource 360° View — legacy redirect */}
              <Route path="/resource-360/:resourceId" element={<Navigate to="/project-hub/resource-360/009" replace />} />

              <Route path="/projects/:projectKey/settings" element={<S><ProjectSettingsPage /></S>} />
              <Route path="/projects/:projectId/features" element={<S><FeaturesPage /></S>} />
              <Route path="/projects/:projectId/features/:featureId" element={<S><FeatureDetailPage /></S>} />
              
              {/* Project Workspace with Board/Timeline/FeatureMap views */}
              <Route path="/projects/:projectId" element={<S><ProjectWorkspace /></S>}>
                <Route path="board" element={<S><BoardView /></S>} />
                <Route path="timeline" element={<S><TimelineView /></S>} />
                <Route path="feature-map" element={<div className="h-full flex items-center justify-center text-muted-foreground">Feature Map View - Coming Soon</div>} />
              </Route>
              
              {/* Board Manager routes */}
              <Route path="/projects/:projectId/boards" element={<S><BoardManagerPage /></S>} />
              <Route path="/projects/:projectId/boards/:boardId" element={<S><BoardCanvasPage /></S>} />

              <Route path="/projects/:projectId/work" element={<S><ProjectWorkHubPage /></S>} />
              <Route path="/projects/:projectId/backlog" element={<S><ProjectBacklogPage /></S>} />
              <Route path="/projects/:projectId/roadmap" element={<S><ProjectComingSoonPage pageTitle="Roadmap" /></S>} />
              <Route path="/projects/:projectId/dependencies" element={<S><ProjectComingSoonPage pageTitle="Dependencies" /></S>} />
              <Route path="/projects/:projectId/reports" element={<S><ProjectComingSoonPage pageTitle="Reports" /></S>} />
              <Route path="/project/:projectId/work" element={<S><ProjectWorkHubPage /></S>} />
              
              {/* In-Jira Module Routes */}
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
              <Route path="/teams" element={<S><TeamComingSoon /></S>} />
              <Route path="/teams/:teamId/room" element={<S><TeamComingSoon /></S>} />
              <Route path="/teams/:teamId/work-tree" element={<S><WorkTreePage /></S>} />
              <Route path="/teams/:teamId/backlog" element={<S><TeamComingSoon /></S>} />
              <Route path="/teams/:teamId/board" element={<S><TeamComingSoon /></S>} />
              <Route path="/teams/:teamId/objective-tree" element={<S><PlaceholderPage /></S>} />
              <Route path="/teams/:teamId/roadmaps" element={<S><TeamComingSoon /></S>} />
              <Route path="/teams/:teamId/sprints" element={<S><TeamComingSoon /></S>} />
              <Route path="/teams/:teamId/velocity" element={<S><TeamComingSoon /></S>} />
              <Route path="/teams/:teamId/meetings" element={<S><TeamComingSoon /></S>} />
              <Route path="/teams/:teamId/impediments" element={<S><TeamComingSoon /></S>} />
              <Route path="/teams/:teamId/features" element={<S><TeamComingSoon /></S>} />
              <Route path="/teams/:teamId/tasks" element={<S><TeamComingSoon /></S>} />
              <Route path="/teams/:teamId/dependencies" element={<S><TeamComingSoon /></S>} />
              <Route path="/teams/:teamId/risks" element={<S><TeamComingSoon /></S>} />
              <Route path="/teams/:teamId/program-increments" element={<S><TeamComingSoon /></S>} />
              <Route path="/teams/:teamId/release-vehicles" element={<S><TeamComingSoon /></S>} />
              <Route path="/teams/:teamId/reports/stories-by-state" element={<S><TeamComingSoon /></S>} />
              <Route path="/teams/:teamId/reports/story-point-progress" element={<S><TeamComingSoon /></S>} />
              <Route path="/teams/:teamId/reports/team-velocity-trend" element={<S><TeamComingSoon /></S>} />
              <Route path="/teams/:teamId/reports/work-tree" element={<S><WorkTreePage /></S>} />
              <Route path="/teams/:teamId/pages/assessments" element={<S><TeamComingSoon /></S>} />
              <Route path="/teams/:teamId/pages/metrics" element={<S><TeamComingSoon /></S>} />
              <Route path="/teams/:teamId/kanban-boards" element={<S><TeamComingSoon /></S>} />

              {/* Portfolio Routes with :portfolioId */}
              <Route path="/portfolio/:portfolioId/room" element={<S><PlaceholderPage /></S>} />
              <Route path="/portfolio/:portfolioId/objective-tree" element={<S><PlaceholderPage /></S>} />
              <Route path="/portfolio/:portfolioId/work-tree" element={<S><WorkTreePage /></S>} />
              <Route path="/portfolio/:portfolioId/backlog" element={<S><PlaceholderPage /></S>} />
              <Route path="/portfolio/:portfolioId/roadmaps" element={<S><Roadmaps /></S>} />
              <Route path="/portfolio/:portfolioId/forecast" element={<S><Forecast /></S>} />
              <Route path="/portfolio/:portfolioId/capacity" element={<S><CapacityPlanning /></S>} />
              <Route path="/portfolio/:portfolioId/initiatives" element={<S><Initiatives /></S>} />
              <Route path="/portfolio/:portfolioId/features" element={<S><Features /></S>} />
              <Route path="/portfolio/:portfolioId/stories" element={<S><Stories /></S>} />
              <Route path="/portfolio/:portfolioId/defects" element={<S><Defects /></S>} />
              <Route path="/portfolio/:portfolioId/tasks" element={<S><Tasks /></S>} />
              <Route path="/portfolio/:portfolioId/dependencies" element={<S><DependenciesPage /></S>} />
              <Route path="/portfolio/:portfolioId/risks" element={<S><RisksGridPage /></S>} />
              <Route path="/portfolio/:portfolioId/impediments" element={<S><Impediments /></S>} />
              <Route path="/portfolio/:portfolioId/sprints" element={<S><Sprints /></S>} />
              <Route path="/portfolio/:portfolioId/program-increments" element={<S><PlaceholderPage /></S>} />
              <Route path="/portfolio/:portfolioId/release-vehicles" element={<S><ReleaseVehicles /></S>} />
              <Route path="/portfolio/:portfolioId/reports/epic-status" element={<S><EpicStatusReport /></S>} />
              <Route path="/portfolio/:portfolioId/reports/epic-trace" element={<S><EpicTraceReport /></S>} />
              <Route path="/portfolio/:portfolioId/reports/feature-status" element={<S><TeamComingSoon /></S>} />
              <Route path="/portfolio/:portfolioId/reports/health" element={<S><TeamComingSoon /></S>} />
              <Route path="/portfolio/:portfolioId/reports/work-tree" element={<S><WorkTreePage /></S>} />
              <Route path="/portfolio/:portfolioId/pages/assessments" element={<S><TeamComingSoon /></S>} />
              <Route path="/portfolio/:portfolioId/pages/metrics" element={<S><TeamComingSoon /></S>} />
              <Route path="/portfolio/:portfolioId/pages/meetings" element={<S><TeamComingSoon /></S>} />
              <Route path="/portfolio/:portfolioId/kanban-boards" element={<S><TeamComingSoon /></S>} />

              {/* Program Routes with :programId */}
              <Route path="/programs/:programId/room" element={<S><ProgramRoom /></S>} />
              <Route path="/programs/:programId/program-board" element={<S><PlaceholderPage /></S>} />
              <Route path="/programs/:programId/objective-tree" element={<S><PlaceholderPage /></S>} />
              <Route path="/programs/:programId/work-tree" element={<S><WorkTreePage /></S>} />
              <Route path="/programs/:programId/backlog" element={<S><BacklogWithSidebar /></S>} />
              <Route path="/programs/:programId/roadmaps" element={<S><ProgramRoadmapPage /></S>} />
              <Route path="/programs/:programId/program-roadmap" element={<S><ProgramRoadmapPage /></S>} />
              <Route path="/programs/:programId/dependencies" element={<S><DependenciesPage /></S>} />
              <Route path="/programs/:programId/forecast" element={<S><PlaceholderPage /></S>} />
              <Route path="/programs/:programId/capacity" element={<S><CapacityWithSidebar /></S>} />
              <Route path="/programs/:programId/increments" element={<S><PlaceholderPage /></S>} />
              <Route path="/programs/:programId/epics" element={<S><EpicsPage /></S>} />
              <Route path="/programs/:programId/features" element={<S><FeaturesWithSidebar /></S>} />
              <Route path="/programs/:programId/stories" element={<S><Stories /></S>} />
              <Route path="/programs/:programId/defects" element={<S><Defects /></S>} />
              <Route path="/programs/:programId/tasks" element={<S><Tasks /></S>} />
              <Route path="/programs/:programId/risks" element={<S><RisksGridPage /></S>} />
              <Route path="/programs/:programId/impediments" element={<S><Impediments /></S>} />
              <Route path="/programs/:programId/sprints" element={<S><Sprints /></S>} />
              <Route path="/programs/:programId/release-vehicles" element={<S><ReleaseVehicles /></S>} />
              <Route path="/programs/:programId/reports/feature-status" element={<S><TeamComingSoon /></S>} />
              <Route path="/programs/:programId/reports/board-history" element={<S><ProgramBoardHistory /></S>} />
              <Route path="/programs/:programId/reports/work-tree" element={<S><WorkTreePage /></S>} />
              <Route path="/programs/:programId/reports/pi-objectives" element={<S><PIObjectives /></S>} />
              <Route path="/programs/:programId/kanban-boards" element={<S><TeamComingSoon /></S>} />
              <Route path="/programs/:programId/pages/assessments" element={<S><TeamComingSoon /></S>} />
              <Route path="/programs/:programId/pages/metrics" element={<S><TeamComingSoon /></S>} />
              <Route path="/programs/:programId/pages/meetings" element={<S><TeamComingSoon /></S>} />
              
              <Route path="/team/:teamId/room" element={<S><TeamComingSoon /></S>} />
              
              {/* Team Routes - Placeholder Routes */}
              <Route path="/team/:teamId/backlog" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/stories" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/roadmaps" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/objective-tree" element={<S><PlaceholderPage /></S>} />
              <Route path="/team/:teamId/work-tree" element={<S><WorkTreePage /></S>} />
              <Route path="/team/:teamId/meetings" element={<S><TeamComingSoon /></S>} />
              
              {/* Team More Items - Placeholder Routes */}
              <Route path="/team/:teamId/assign-tasks" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/defects" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/dependencies" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/design-components" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/estimation" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/impediments" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/sprints" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/tasks" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/objectives" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/teams" element={<S><TeamComingSoon /></S>} />
              
              {/* Team Reports - Placeholder Routes */}
              <Route path="/team/:teamId/reports/assessment" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/reports/assessment-results" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/reports/burndowns" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/reports/capacity-planning" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/reports/cumulative-effort" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/reports/dependency-maps" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/reports/detailed-sprint-progress" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/reports/external" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/reports/impediments-risks" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/reports/organizational-hierarchy" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/reports/risk-impediment-status" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/reports/sprint-coaching" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/reports/sprint-health" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/reports/sprint-metrics" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/reports/sprint-performance" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/reports/sprint-planning" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/reports/sprint-review" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/reports/sprint-scope-changes" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/reports/sprint-status" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/reports/stories-by-state" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/reports/story-point-progress" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/reports/team-velocity-trend" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/reports/work-tree" element={<S><WorkTreePage /></S>} />
              <Route path="/team/:teamId/kanban-boards" element={<S><TeamComingSoon /></S>} />
              
              {/* Team More Pages - Placeholder Routes */}
              <Route path="/team/:teamId/pages/assessments" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/pages/definition-of-done" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/pages/lean-process" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/pages/retrospectives" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/pages/surveys" element={<S><TeamComingSoon /></S>} />
              
              <Route path="/team-room" element={<S><TeamRoom /></S>} />
              <Route path="/backlog" element={<S><Backlog /></S>} />
              <Route path="/backlog-phase2" element={<Navigate to="/backlog" replace />} />
              <Route path="/sprints" element={<S><Sprints /></S>} />
              <Route path="/sprint-board" element={<S><SprintBoard /></S>} />
              <Route path="/stories" element={<S><Stories /></S>} />
              <Route path="/work-items/stories" element={<S><Stories /></S>} />
              <Route path="/work-items/subtasks" element={<S><Subtasks /></S>} />
               {/* Catch-all redirect for any remaining /releases routes to ReleaseHub */}
               <Route path="/releases/*" element={<Navigate to="/releasehub/command-center" replace />} />
              
              <Route path="/unauthorized" element={<S><UnauthorizedPage /></S>} />
              
              {/* Kanban Boards Routes - Team Scoped */}
              <Route path="/team/:teamId/kanban-boards" element={<S><TeamComingSoon /></S>} />
              <Route path="/team/:teamId/kanban-boards/:boardId" element={<S><KanbanBoardView /></S>} />
              <Route path="/team/:teamId/kanban-boards/:boardId/setup" element={<S><KanbanBoardSetup /></S>} />
              <Route path="/team/:teamId/kanban-boards/:boardId/analytics" element={<S><KanbanBoardAnalytics /></S>} />
              
              {/* Knowledge Hub Routes */}
              <Route path="/knowledge-hub" element={<S><KnowledgeHubPage /></S>} />
              <Route path="/knowledge-hub/spaces/:spaceId" element={<S><KnowledgeHubSpacePage /></S>} />
              <Route path="/knowledge-hub/documents/:documentId" element={<S><KnowledgeHubDocumentPage /></S>} />
              
              
              {/* Operations (Incidents) Routes */}
              <Route path="/release" element={<Navigate to="/release/incidents" replace />} />
              
              {/* Incident Module - Canonical Routes Only */}
              <Route path="/release/incidents" element={<S><IncidentRoomList /></S>} />
              <Route path="/release/incidents/dashboard" element={<S><IncidentsDashboard /></S>} />
              <Route path="/release/incidents/analytics" element={<S><IncidentAnalyticsPage /></S>} />
              <Route path="/release/incidents/insights" element={<S><IncidentInsightsPage /></S>} />
              <Route path="/release/incidents/kanban" element={<S><IncidentKanbanPage /></S>} />
              <Route path="/release/incidents/create" element={<S><CreateIncident /></S>} />
              <Route path="/release/incidents/reports" element={<S><IncidentReports /></S>} />
              <Route path="/release/incidents/:incidentId" element={<S><IncidentRoomDetail /></S>} />
              
              {/* Legacy Route Redirects */}
              <Route path="/release/incident-room" element={<Navigate to="/release/incidents" replace />} />
              <Route path="/release/incident-room/:incidentId" element={<Navigate to="/release/incidents/:incidentId" replace />} />
              <Route path="/release/incident-reports" element={<Navigate to="/release/incidents/reports" replace />} />
              
              {/* Incident Support Routes */}
              <Route path="/release/incident-command-center" element={<S><IncidentCommandCenter /></S>} />
              <Route path="/release/committee-queue" element={<S><CommitteeQueue /></S>} />
              {/* Kanban Boards Routes - Program Scoped */}
              <Route path="/programs/:programId/kanban-boards" element={<S><TeamComingSoon /></S>} />
              <Route path="/programs/:programId/kanban-boards/:boardId" element={<S><KanbanBoardView /></S>} />
              <Route path="/programs/:programId/kanban-boards/:boardId/setup" element={<S><KanbanBoardSetup /></S>} />
              <Route path="/programs/:programId/kanban-boards/:boardId/analytics" element={<S><KanbanBoardAnalytics /></S>} />
              
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
                {/* PlanHub Admin Routes */}
                <Route path="planhub" element={<Navigate to="/admin/planhub/general" replace />} />
                <Route path="planhub/general" element={<S><PlanHubGeneralSettings /></S>} />
                <Route path="planhub/templates" element={<S><PlanHubTemplates /></S>} />
                <Route path="planhub/ai" element={<S><PlanHubAIConfig /></S>} />
                <Route path="planhub/audit" element={<S><PlanHubActivityLog /></S>} />
                <Route path="planhub/*" element={<Navigate to="/admin/planhub/general" replace />} />
                {/* Slack Integration */}
                <Route path="slack" element={<S><SlackIntegrationPage /></S>} />
                {/* Enhanced Task List */}
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
                {/* Knowledge Base Admin */}
                <Route path="kb" element={<S><KBAdminPage /></S>} />
                <Route path="kb/*" element={<S><KBAdminPage /></S>} />
                {/* Wiki Admin */}
                <Route path="wiki" element={<S><WikiAdminPage /></S>} />
                <Route path="wiki-diagnostic" element={<S><WikiDiagnosticPage /></S>} />
                <Route path="diagnostic" element={<S><AdminDiagnosticPage /></S>} />
                
              </Route>

              <Route path="/items/epics/:epicId/status-report" element={<S><EpicStatusReport /></S>} />
              <Route path="/items/epics/:epicId/trace" element={<S><EpicTraceReport /></S>} />
              <Route path="/items/epics/:epicId/requirement-hierarchy" element={<S><EpicRequirementHierarchy /></S>} />
              <Route path="/reports-discovery" element={<S><AdminGuard><ReportsDiscovery /></AdminGuard></S>} />
              <Route path="/pi-wizard" element={<S><AdminGuard><PIWizard /></AdminGuard></S>} />
              <Route path="/jira-integration" element={<S><AdminGuard><JiraIntegration /></AdminGuard></S>} />
              <Route path="/value-stream" element={<S><ValueStreamView /></S>} />
              <Route path="/profile" element={<S><UserProfile /></S>} />
              <Route path="/admin/settings/notifications" element={<S><UserNotificationSettingsPage /></S>} />
              <Route path="/items/:type" element={<S><PlaceholderPage /></S>} />

              {/* ═══ PROJECTHUB V5 — Now inside CatalystShell ═══ */}
              <Route path="/project-hub" element={<Navigate to="/project-hub/projects" replace />} />
              <Route path="/project-hub/projects" element={<S><AllProjectsPageLazy /></S>} />
              <Route path="/project/all-projects" element={<S><AllProjectsPageLazy /></S>} />
              <Route path="/project-hub/projects-legacy" element={<S><ProjectListPageLazy /></S>} />
              <Route path="/project-hub/resources" element={<S><ResourceListingPageLazy /></S>} />
              <Route path="/project-hub/resources/:resourceId" element={<S><R360MemberDetailLazy /></S>} />
              <Route path="/project-hub/resources-v2" element={<Navigate to="/project-hub/resources" replace />} />
              <Route path="/project-hub/resources-v2/:resourceId" element={<S><R360MemberDetailLazy /></S>} />
              <Route path="/project-hub/resource360" element={<Navigate to="/project-hub/resource-360/009" replace />} />
              <Route path="/project-hub/resource360/:id" element={<Navigate to="/project-hub/resource-360/009" replace />} />
              <Route path="/project-hub/resource-360/:resourceId" element={<S><Resource360PageNew /></S>} />
              <Route path="/resource360/members/:memberId" element={<S><Resource360MemberDetail /></S>} />
              {/* R360 Profile Module (Stage A) */}
              <Route path="/resources" element={<S><R360ProfilePageLazy /></S>} />
              <Route path="/project-hub/:key" element={<Navigate to="dashboard" replace />} />
              <Route path="/project-hub/:key/dashboard" element={<S><ProjectDashboardPageLazy /></S>} />
              <Route path="/project-hub/:key/settings" element={<S><PHProjectSettingsPageLazy /></S>} />
              <Route path="/project-hub/:key/backlog" element={<PHPlaceholder title="Backlog" phase="Phase 2" />} />
              <Route path="/project-hub/:key/epic-backlog" element={<S><NativeEpicBacklogPageLazy /></S>} />
              <Route path="/project-hub/:key/feature-backlog" element={<S><NativeFeatureBacklogPageLazy /></S>} />
              <Route path="/project-hub/:key/story-backlog" element={<S><NativeStoryBacklogPageLazy /></S>} />
              <Route path="/project-hub/:key/board" element={<S><ProjectBoardPageLazy /></S>} />
              <Route path="/project-hub/:key/boards" element={<S><ProjectBoardManagerPageLazy /></S>} />
              <Route path="/project-hub/:key/boards/:boardId" element={<S><ProjectBoardCanvasPageLazy /></S>} />
              <Route path="/project-hub/:key/hierarchy" element={<S><HierarchyPageLazy /></S>} />
              <Route path="/project-hub/:key/list" element={<S><WorkItemsListPageLazy /></S>} />
              <Route path="/project-hub/:key/timeline" element={<PHPlaceholder title="Timeline" phase="Phase 3" />} />
              <Route path="/project-hub/:key/releases" element={<PHPlaceholder title="Releases" phase="Phase 3" />} />
              <Route path="/project-hub/:key/reports" element={<PHPlaceholder title="Reports" phase="Phase 4" />} />
              <Route path="/project-hub/:key/sprint-predictor" element={<PHPlaceholder title="Sprint Predictor" phase="Phase 5" />} />
              <Route path="/project-hub/:key/risk-scanner" element={<PHPlaceholder title="Risk Scanner" phase="Phase 5" />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<S><NotFound /></S>} />
            </Routes>
              <CatyWidgetRouteGuard />
              <QAAssistantRouteGuard />
              <KnowledgeAssistFabRouteGuard />
              
              
          </BrowserRouter>
        </TooltipProvider>
      </CatalystToastProvider>
      </ProcessStepsProvider>
      </NavigationProvider>
    </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
