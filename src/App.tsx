import React, { lazy, Suspense } from "react";
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
import { CatalystShell } from "./components/layout/CatalystShell";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CatalystLoginPage } from "./components/auth/login";
// Caty AI chatbot - FAB icon only, functionality unhooked
import { CatyFabPlaceholder } from "./components/caty/CatyFabPlaceholder";
// Jira test pages removed - AtlasKit migration complete
import SlackOAuthCallback from "./pages/SlackOAuthCallback";
import BrowsePage from "./pages/BrowsePage";
import DependencyMapsPage from "./pages/reports/DependencyMapsPage";
import SearchPage from "./pages/SearchPage";
// Home removed - using ForYouPage
import PlaceholderPage from "./pages/jira-align/PlaceholderPage";
// StrategyRoom removed - use StrategyRoomPage instead
import StrategyRoomPage from "./pages/enterprise/StrategyRoomPage";
const CapacityPlannerPage = lazy(() => import("./pages/enterprise/CapacityPlannerPage"));
const BudgetGovernancePage = lazy(() => import("./pages/enterprise/BudgetGovernancePage"));
const BudgetPlannerPage = lazy(() => import("./pages/enterprise/BudgetPlannerPage"));
import Themes from "./pages/Themes";
import Initiatives from "./pages/Initiatives";
// Epics removed - redirects to epic-backlog
import EpicsPage from "./pages/items/EpicsPage";
import EpicsRecycleBinPage from "./pages/items/EpicsRecycleBinPage";
import EpicsCanceledPage from "./pages/items/EpicsCanceledPage";
import EpicStatusReport from "./pages/items/reports/EpicStatusReport";
import EpicTraceReport from "./pages/items/reports/EpicTraceReport";
import EpicRequirementHierarchy from "./pages/items/reports/EpicRequirementHierarchy";
import EpicResponsibilityMatrix from "./pages/items/reports/EpicResponsibilityMatrix";
import EpicPlanningPage from "./pages/items/reports/EpicPlanningPage";
import EpicEstimationPage from "./pages/items/EpicEstimationPage";
// EpicBacklog removed - use EpicBacklogWithSidebar
import EpicBacklogWithSidebar from "./pages/EpicBacklogWithSidebar";
// BacklogEpics removed
import Features from "./pages/Features";
import FeaturesPage from "./pages/items/FeaturesPage";
import FeaturesBacklog from "./pages/FeaturesBacklog";
import FeaturePrioritizationView from "./pages/items/FeaturePrioritizationView";
const FeatureDetailPage = lazy(() => import("./pages/project/FeatureDetailPage"));
const FeatureBacklogPage = lazy(() => import("./modules/feature-backlog/pages/FeatureBacklogPage"));
const ProjectWorkspace = lazy(() => import("./pages/project/ProjectWorkspace"));
const BoardView = lazy(() => import("./pages/project/BoardView"));
const TimelineView = lazy(() => import("./pages/project/TimelineView"));

import { EpicBalancingPage } from "./modules/epic-balancing";
const UserNotificationSettingsPage = lazy(() => import("./pages/UserNotificationSettingsPage"));
import { PlannerPage, KanbanPage, MyTasksPage } from "./modules/planner";
// TestHub pages
const TestHubPage = lazy(() => import("./pages/testhub/TestHubPage"));
const TestRepositoryPage = lazy(() => import("./pages/testhub/TestRepositoryPage"));
const TestHubDashboardPage = lazy(() => import("./pages/testhub/TestHubDashboardPage"));
const SharedStepsPage = lazy(() => import("./pages/testhub/SharedStepsPage"));
const TestSetsPage = lazy(() => import("./pages/testhub/TestSetsPage"));
const TestCyclesPage = lazy(() => import("./pages/testhub/TestCyclesPage"));
const ExecutionHubPage = lazy(() => import("./pages/testhub/ExecutionHubPage"));
const TestRunsPage = lazy(() => import("./pages/testhub/TestRunsPage"));
const TestHubDefectsPage = lazy(() => import("./pages/testhub/DefectsPage"));
const TestHubRequirementsPage = lazy(() => import("./pages/testhub/RequirementsPage"));
const TestHubTraceabilityPage = lazy(() => import("./pages/testhub/TraceabilityPage"));
const TestHubReportsPage = lazy(() => import("./pages/testhub/ReportsPage"));
const TestHubSettingsPage = lazy(() => import("./pages/testhub/SettingsPage"));
// Task10 pages
const T10LandingPage = lazy(() => import("./modules/task10/pages/T10LandingPage").then(m => ({ default: m.T10LandingPage })));
const T10WeekPage = lazy(() => import("./modules/task10/pages/T10WeekPage").then(m => ({ default: m.T10WeekPage })));
const T10WeekPageV3 = lazy(() => import("./modules/task10/pages/T10WeekPageV3").then(m => ({ default: m.T10WeekPageV3 })));
const T10CompletedPage = lazy(() => import("./modules/task10/pages/T10CompletedPage").then(m => ({ default: m.T10CompletedPage })));
// Priorities pages
const PriListsPage = lazy(() => import("./modules/priorities/pages/PriListsPage").then(m => ({ default: m.PriListsPage })));
const PriWeekPage = lazy(() => import("./modules/priorities/pages/PriWeekPage").then(m => ({ default: m.PriWeekPage })));
// PlanHub pages
import {
  PlanLibraryPage,
  PlanEditorPage,
  ScenarioComparePage,
  MasterPlanPage,
  ResourcesPage as PlanHubResourcesPage,
  AIAssistantPage as PlanHubAIPage,
  ReportCenterPage as PlanHubReportsPage,
} from "./pages/planhub";

import Defects from "./pages/Defects";
import Tasks from "./pages/Tasks";
import Ideation from "./pages/Ideation";
const IdeasHubPage = lazy(() => import("./pages/ideas/IdeasHubPageRebuilt"));
const AllIdeasPage = lazy(() => import("./pages/ideas/AllIdeasPageRebuilt"));
const IdeaDetailPage = lazy(() => import("./pages/ideas/IdeaDetailPageRebuilt"));
const InitiativesPage = lazy(() => import("./pages/ideas/InitiativesPage"));
const InitiativeDetailPage = lazy(() => import("./pages/ideas/InitiativeDetailPage"));
const SubmitIdeaPage = lazy(() => import("./pages/ideas/SubmitIdeaPageElevated"));
const ScoringQueuePage = lazy(() => import("./pages/ideas/ScoringQueuePage"));
const PriorityMatrixPage = lazy(() => import("./pages/ideas/PriorityMatrixPage"));
const AIInsightsPage = lazy(() => import("./pages/ideas/AIInsightsPage"));
const AnalyticsPage = lazy(() => import("./pages/ideas/AnalyticsPage"));
const IdeasAdminSettingsPage = lazy(() => import("./pages/ideas/IdeasAdminSettingsPage"));
import ManageIdeationUsersPage from "./components/ideation/ManageIdeationUsersPage";
import ManageEnhancementRequests from "./pages/ManageEnhancementRequests";
import Impediments from "./pages/Impediments";
import ReleaseVehicles from "./pages/ReleaseVehicles";
import SuccessCriteria from "./pages/SuccessCriteria";
import PortfolioKanban from "./pages/PortfolioKanban";
import PortfolioRoadmap from "./pages/PortfolioRoadmap";
import Roadmaps from "./pages/Roadmaps";
import DependenciesPage from "./pages/work/Dependencies";
import ProgramRoom from "./pages/ProgramRoom";
import ProgramEpicsPage from "./pages/ProgramEpicsPage";
// ProgramBoardNew and ProgramBoardWithSidebar removed - use PlaceholderPage
import ProgramBoardHistory from "./pages/ProgramBoardHistory";
import QuartersPage from "./pages/program/QuartersPage";
import CapacityWithSidebar from "./pages/program/CapacityWithSidebar";
import BacklogWithSidebar from "./pages/program/BacklogWithSidebar";
import RoadmapsWithSidebar from "./pages/program/RoadmapsWithSidebar";
import ProgramRoadmapPage from "./pages/program/ProgramRoadmapPage";
import RoadmapsTestPage from "./pages/program/RoadmapsTestPage";
import ExecutionWorkbenchPage from "./pages/program/ExecutionWorkbench";
import FeaturesWithSidebar from "./pages/program/FeaturesWithSidebar";
import { ProgramRedirect } from "./pages/program/ProgramRedirect";
import PIObjectives from "./pages/PIObjectives";
import CapacityPlanning from "./pages/CapacityPlanning";
import Forecast from "./pages/Forecast";
import WorkSpendGrid from "./pages/WorkSpendGrid";
import RisksGridPage from "./pages/risks/RisksGridPage";
import RiskRoamReportPage from "./pages/risks/RiskRoamReportPage";
import TeamRoom from "./pages/TeamRoom";
import SprintBoard from "./pages/SprintBoard";
import Backlog from "./pages/Backlog";
import Sprints from "./pages/Sprints";
import Stories from "./pages/Stories";
import Subtasks from "./pages/Subtasks";
import Releases from "./pages/Releases";
import ReleasesCommandCenter from "./pages/releases/CommandCenterPage";
import ReleasesPlaceholderPage from "./pages/releases/PlaceholderPage";
import AllReleasesPage from "./pages/releases/AllReleasesPage";
import ReleasesTestCasesPage from "./pages/releases/TestCasesPage";
import ReleasesTestCasesLibraryPage from "./pages/releases/TestCasesLibraryPage";
import ReleasesTestCaseDetailPage from "./pages/releases/TestCaseDetailPage";
const ReleasesTestPlansPage = lazy(() => import("./pages/releases/TestPlansPage"));
const ReleasesTestPlanDetailPage = lazy(() => import("./pages/releases/TestPlanDetailPage"));
import ReleasesTestExecutionPage from "./pages/releases/TestExecutionPage";
import { TestExecutionFocusPage } from "./features/test-execution";
const AskAIPage = lazy(() => import("./features/ask-ai/AskAIPage"));
const RTMPage = lazy(() => import("./features/rtm/RTMPage"));
import MyTestScopePage from "./pages/releases/MyTestScopePage";
import CalendarPage from "./pages/releases/CalendarPage";
import ComparePage from "./pages/releases/ComparePage";
import CoverageReportsPage from "./pages/releases/CoverageReportsPage";
import ReleaseDashboardV5Page from "./pages/releases/ReleaseDashboardV5Page";
import ReleaseDashboardOverviewPage from "./pages/releases/ReleaseDashboardOverviewPage";
import ReleasesTestCyclesPage from "./pages/releases/TestCyclesPage";
import ReleasesCycleCommandCenter from "./pages/releases/CycleCommandCenter";
import ReleasesCycleTemplatesPage from "./pages/releases/CycleTemplatesPage";
import ReleasesDefectsPage from "./pages/releases/DefectsPage";
const ReleasesDefectDetailPage = lazy(() => import("./pages/releases/DefectDetailPage"));
const WorkloadDashboard = lazy(() => import("./pages/WorkloadDashboard"));
import OrgSetup from "./pages/admin/OrgSetup";
import HierarchyConfig from "./pages/admin/HierarchyConfig";
import CustomFields from "./pages/admin/CustomFields";
import BoardConfig from "./pages/admin/BoardConfig";
import Permissions from "./pages/admin/Permissions";
import Integrations from "./pages/admin/Integrations";
import JiraIntegrationConfig from "./pages/admin/JiraIntegrationConfig";
import { AdminLayout } from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import { StoriesPage } from './pages/stories/StoriesPage';
import Activity from "./pages/admin/Activity";
import Changes from "./pages/admin/Changes";
import UseTrend from "./pages/admin/UseTrend";
import UsageTrends from "./pages/admin/UsageTrends";
import ChangesLog from "./pages/admin/ChangesLog";
import { DesignAuditPage } from "./pages/admin/DesignAuditPage";
import ThemeAuditPage from "./pages/admin/ThemeAuditPage";
import ProgressBarsConfig from "./pages/admin/ProgressBarsConfig";
import GeneralConfig from "./pages/admin/GeneralConfig";
import WorkCodes from "./pages/admin/WorkCodes";
import DetailsPanels from "./pages/admin/DetailsPanels";
import Terminology from "./pages/admin/Terminology";
import TeamSettings from "./pages/admin/TeamSettings";
import ProgramSettings from "./pages/admin/ProgramSettings";
import PortfolioSettings from "./pages/admin/PortfolioSettings";
import ProgressBars from "./pages/admin/ProgressBars";
import EstimationSettings from "./pages/admin/EstimationSettings";
import GeneralSettings from "./pages/admin/GeneralSettings";
import SecuritySettings from "./pages/admin/SecuritySettings";
import Announcements from "./pages/admin/Announcements";
import UsersManagement from "./pages/admin/UsersManagement";
import RolesPermissions from "./pages/admin/RolesPermissions";
const ModuleMatrixPage = lazy(() => import("./components/admin/ModuleMatrixPage"));
import ThemeGroups from "./pages/admin/ThemeGroups";
import Programs from "./pages/admin/Programs";
import Departments from "./pages/admin/Departments";
const CapacityDepartmentsPage = lazy(() => import("./pages/admin/CapacityDepartments"));
const ResourceAssignmentsPage = lazy(() => import("./pages/admin/ResourceAssignments"));
const ResourceLocationsPage = lazy(() => import("./pages/admin/ResourceLocations"));
const ResourceCountriesPage = lazy(() => import("./pages/admin/ResourceCountries"));
const ResourceVendorsPage = lazy(() => import("./pages/admin/ResourceVendors"));
import BusinessOwnersAdmin from "./pages/admin/BusinessOwners";
import BusinessProcesses from "./pages/admin/BusinessProcesses";
import Portfolios from "./pages/admin/Portfolios";
import Estimation from "./pages/admin/Estimation";
import Security from "./pages/admin/Security";
import ActivityLog from "./pages/admin/ActivityLog";
import ModulesPackages from "./pages/admin/ModulesPackages";
import UserRoles from "./pages/admin/UserRoles";
import ReportsDiscovery from "./pages/admin/ReportsDiscovery";
import PIWizard from "./pages/admin/PIWizard";
import JiraIntegration from "./pages/admin/JiraIntegration";
import ImportData from "./pages/admin/ImportData";
import DataHygiene from "./pages/admin/DataHygiene";
import ProductSettings from "./pages/admin/ProductSettings";
import AdminOverview from "./pages/admin/AdminOverview";
import AuditActivityPage from "./pages/admin/AuditActivityPage";
import KanbanSettings from "./pages/admin/KanbanSettings";

const ResourceUtilizationPage = lazy(() => import("./pages/admin/ResourceUtilization"));
const UserAccessPage = lazy(() => import("./pages/admin/UserAccessPage"));
import MockDataGenerator from "./pages/admin/MockDataGenerator";
const AiIntegrationPage = lazy(() => import("./pages/admin/AiIntegrationPage"));
import ProcessSteps from "./pages/admin/ProcessSteps";
const SlackIntegrationPage = lazy(() => import("./pages/admin/SlackIntegrationPage"));
const TaskListPage = lazy(() => import("./modules/planner/pages/TaskListPage"));
import CreateMenuConfig from "./pages/admin/CreateMenuConfig";
import DeliveryPlatforms from "./pages/admin/DeliveryPlatforms";
import RiskSeverityLevels from "./pages/admin/RiskSeverityLevels";
import { PlanHubGeneralSettings, PlanHubTemplates, PlanHubAIConfig, PlanHubActivityLog } from "./pages/admin/planhub";

const SoftwareLicensesPage = lazy(() => import("./modules/budget/components/SoftwareLicensesPage").then(m => ({ default: m.SoftwareLicensesPage })));
import RoutesComponentsRegistry from "./pages/admin/RoutesComponentsRegistry";
import EpicStatuses from "./pages/admin/EpicStatuses";
import FeatureStatuses from "./pages/admin/FeatureStatuses";
import ThemeStatuses from "./pages/admin/ThemeStatuses";
import SnapshotsAdmin from "./pages/admin/SnapshotsAdmin";
import {
  IncidentWorkgroups,
  IncidentFieldsConfig,
  IncidentSLAPolicies,
  IncidentCAPPolicy,
  IncidentConversionRules,
  IncidentAuditCompliance,
  IncidentOwningTeams,
} from "./pages/admin/incident";
// UIQARoute and ThemeAuditProbe removed
import ValueStreamView from "./pages/ValueStreamView";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";

import ProgramDirectory from "./pages/ProgramDirectory";
import ProjectDirectory from "./pages/ProjectDirectory";
import ProjectSettingsPage from "./pages/ProjectSettingsPage";
import { ProjectWorkHubPage } from "./modules/project-work-hub/ProjectWorkHubPage";
import {
  InJiraLayout,
  SummaryPage as InJiraSummaryPage,
  KanbanBoardPage,
  ScrumBoardPage,
  ListPage as InJiraListPage,
  AllWorkPage as InJiraAllWorkPage,
  ReleasesPage as InJiraReleasesPage,
  ReleaseManagementPage,
  InJiraSettingsPage,
} from "./modules/in-jira";
import ProjectSummaryPage from "./pages/projects/ProjectSummaryPage";
import ProjectComingSoonPage from "./pages/projects/ProjectComingSoonPage";
import ProjectBacklogPage from "./pages/projects/ProjectBacklogPage";
import { WorkHubLayout } from "./modules/work-hub/WorkHubLayout";
import { SummaryView } from "./modules/work-hub/views/SummaryView";
import { ListView, AllWorkView, ReleasesView, ReleaseDetailsView } from "./modules/work-hub/views";
import { AdminGuard } from "./components/admin/AdminGuard";
import OKRTree from "./pages/enterprise/OKRTree";
import OKRHub from "./pages/enterprise/OKRHub";
// OKR v2 is now the single source - no separate portfolio/program/team OKR hubs
import CatalystEnterpriseRoadmap from "./pages/enterprise/CatalystEnterpriseRoadmap";
import ForYouPage from "./pages/ForYouPage";
import ProductRoadmapPage from "./pages/ProductRoadmapPage";
import ProductRoadmapV2Page from "./pages/ProductRoadmapV2Page";
import IndustryRoadmapPage from "./pages/industry/IndustryRoadmapPage";

import StrategicSnapshots from "./pages/enterprise/StrategicSnapshots";
import StrategicBacklog from "./pages/enterprise/StrategicBacklog";
import EnterpriseEpics from "./pages/enterprise/EnterpriseEpics";
import { WorkTreePage } from "./pages/work-tree";
import WorkManager from "./pages/WorkManager";

import EnterpriseTasks from "./pages/enterprise/EnterpriseTasks";
import EnterpriseObjectives from "./pages/enterprise/EnterpriseObjectives";
import EnterpriseDependencies from "./pages/enterprise/EnterpriseDependencies";
import EnterpriseReleaseVehicles from "./pages/enterprise/EnterpriseReleaseVehicles";
import EnterpriseSuccessCriteria from "./pages/enterprise/EnterpriseSuccessCriteria";
import EnterpriseRisks from "./pages/enterprise/EnterpriseRisks";
import EnterpriseComingSoon from "./pages/enterprise/ComingSoon";
import SkillsInventory from "./pages/SkillsInventory";
import StarredPage from "./pages/StarredPage";


import BusinessRequests from "./pages/enterprise/BusinessRequests";
import MiningComingSoon from "./pages/enterprise/MiningComingSoon";
import IndustryPage from "./pages/enterprise/DemandIntakeCatalyst";
import IndustryComingSoon from "./pages/enterprise/IndustryComingSoon";
import DemandSummaryPage from "./pages/enterprise/DemandSummaryPage";
import ProductRoomPage from "./pages/ProductRoomPage";
import CapacityPlanningPage from "./pages/CapacityPlanningPage";
import { RequirementAssistPage } from "./components/requirement-assist-v3";
const GenerationHistoryPage = lazy(() => import("./pages/product/GenerationHistoryPage"));
import { RequirementAssistHistory } from "./pages/product/requirement-assist";
import { RAAdminAIConfiguration, RAAdminTemplates, RAAdminCompliance, RAAdminTranslation, RAAdminAnalytics, RAAdminPermissions } from "./pages/admin/requirement-assist";
import ExecutiveRoadmapPage from "./pages/enterprise/ExecutiveRoadmapPage";
import CatalystDemandKanban from "./modules/kanban/pages/CatalystDemandKanban";
import CatalystDemandList from "./modules/product-backlog/pages/CatalystDemandList";
import CatalystDemandTable from "./modules/product-backlog/pages/CatalystDemandTable";

import SubmitDemandRequest from "./pages/SubmitDemandRequest";
import ResetPassword from "./pages/ResetPassword";
import TeamComingSoon from "./pages/team/ComingSoon";
// Dev and QA test pages removed
import UnauthorizedPage from "./pages/UnauthorizedPage";
import KanbanBoardView from "./pages/KanbanBoardView";
import KanbanBoardSetup from "./pages/KanbanBoardSetup";
import KanbanBoardAnalytics from "./pages/KanbanBoardAnalytics";
import KnowledgeHubDocumentPage from "./pages/KnowledgeHubDocumentPage";
import KnowledgeHubPage from "./pages/KnowledgeHubPage";
import KnowledgeHubSpacePage from "./pages/KnowledgeHubSpacePage";

// Release Management Module (Incidents only - Releases removed)
import {
  IncidentsList,
  IncidentDetail,
  IncidentsDashboard,
  CreateIncident,
  CommitteeQueue,
  IncidentReports,
} from "./pages/release";

// Releases - Test Execution
const ExecutionPage = lazy(() => import("./pages/releases/ExecutionPage"));
const QualityGatesPage = lazy(() => import("./pages/releases/QualityGatesPage"));

// Incident Room (New)
import IncidentRoomList from "./pages/release/IncidentRoomList";
import IncidentRoomDetail from "./pages/release/IncidentRoomDetail";
import IncidentCommandCenter from "./pages/release/IncidentCommandCenter";


// Incident Analytics
const IncidentAnalyticsPage = lazy(() => import("./modules/incidents/analytics/pages/IncidentAnalyticsPage"));
const IncidentInsightsPage = lazy(() => import("./modules/incidents/analytics/pages/IncidentInsightsPage"));
const IncidentKanbanPage = lazy(() => import("./modules/incidents/kanban/pages/IncidentKanbanPage"));



const queryClient = new QueryClient();

// Caty FAB only on capacity planner - functionality unhooked
function CatyWidgetRouteGuard() {
  const location = useLocation();
  const isCapacityPlannerRoute = location.pathname.startsWith('/enterprise/capacity');
  if (!isCapacityPlannerRoute) return null;
  return <CatyFabPlaceholder />;
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
<Route path="/" element={<Navigate to="/for-you" replace />} />
              <Route path="/auth" element={<CatalystLoginPage />} />
              <Route path="/auth/slack/callback" element={<SlackOAuthCallback />} />
              {/* Jira test routes removed */}
              <Route path="/submit-request" element={<SubmitDemandRequest />} />
              
              {/* Work Hub Test Route */}
              <Route path="/work-hub-test" element={<WorkHubLayout />}>
                <Route index element={<Navigate to="summary" replace />} />
                <Route path="summary" element={<SummaryView />} />
                <Route path="list" element={<ListView />} />
                <Route path="all-work" element={<AllWorkView />} />
                <Route path="releases" element={<ReleasesView />} />
                <Route path="releases/:versionId" element={<ReleaseDetailsView />} />
              </Route>
              <Route path="/reset-password" element={<ResetPassword />} />
              
              
              {/* Deep-link resolver for work items */}
              <Route path="/browse/:key" element={<ProtectedRoute><CatalystShell /></ProtectedRoute>}>
                <Route index element={<BrowsePage />} />
              </Route>
              
              {/* All Routes - Catalyst Style */}
              <Route element={<ProtectedRoute><CatalystShell /></ProtectedRoute>}>
              <Route path="/for-you" element={<ForYouPage />} />
              <Route path="/home" element={<Navigate to="/for-you" replace />} />
              
              {/* Industry/Demand routes */}
              <Route path="/industry" element={<Navigate to="/industry/backlog" replace />} />
              <Route path="/industry1" element={<IndustryPage />} />
              <Route path="/industry/industry" element={<IndustryPage />} />
              <Route path="/industry/backlog" element={<CatalystDemandList />} />
              <Route path="/industry/table" element={<CatalystDemandTable />} />
              <Route path="/industry/kanban" element={<CatalystDemandKanban />} />
              <Route path="/industry/dashboard" element={<DemandSummaryPage />} />
              <Route path="/industry/roadmaps" element={<ProductRoadmapV2Page />} />
              <Route path="/industry/roadmaps-v1" element={<IndustryRoadmapPage />} />
              <Route path="/industry/reports" element={<IndustryComingSoon />} />
              
              {/* Starred items page */}
              <Route path="/starred" element={<StarredPage />} />
              
              

              
              <Route path="/search" element={<SearchPage />} />
              <Route path="/portfolio/:portfolioId/room" element={<PlaceholderPage />} />
              <Route path="/portfolio/:portfolioId/epics" element={<EpicsPage />} />
              <Route path="/portfolio/:portfolioId/backlog" element={<EpicBacklogWithSidebar />} />
              <Route path="/portfolio/:portfolioId/roadmaps" element={<PlaceholderPage />} />
              <Route path="/portfolio/:portfolioId/objective-tree" element={<OKRHub />} />
              <Route path="/portfolio/:portfolioId/work-tree" element={<WorkTreePage />} />
              <Route path="/portfolio/:portfolioId/forecast" element={<Forecast />} />
              <Route path="/portfolio/:portfolioId/capacity" element={<PlaceholderPage />} />
              <Route path="/portfolio/:portfolioId/programs" element={<PlaceholderPage />} />
              <Route path="/strategy-room" element={<StrategyRoomPage />} />
              <Route path="/enterprise/strategy-room" element={<StrategyRoomPage />} />
              <Route path="/enterprise/strategy-room/capacity" element={<Navigate to="/enterprise/capacity" replace />} />
              <Route path="/enterprise/capacity" element={<Suspense fallback={<div className="p-8">Loading...</div>}><CapacityPlannerPage /></Suspense>} />
              <Route path="/enterprise/capacity-planner/budget" element={<Suspense fallback={<div className="p-8">Loading...</div>}><BudgetGovernancePage /></Suspense>} />
              <Route path="/enterprise/budget-planner" element={<Suspense fallback={<div className="p-8">Loading...</div>}><BudgetPlannerPage /></Suspense>} />
              <Route path="/enterprise/snapshots" element={<StrategicSnapshots />} />
              <Route path="/enterprise/backlog" element={<StrategicBacklog />} />
              <Route path="/enterprise/okr-heatmap" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/okr-tree" element={<OKRTree />} />
              <Route path="/enterprise/okr-hub" element={<OKRHub />} />
              <Route path="/portfolio/:portfolioId/okr-hub" element={<OKRHub />} />
              <Route path="/program/:programId/okr-hub" element={<OKRHub />} />
              <Route path="/program" element={<ProgramRedirect />} />
              <Route path="/program/:programId/work-tree" element={<ExecutionWorkbenchPage />} />
              <Route path="/program/:programId/room" element={<ProgramRoom />} />
              <Route path="/program/:programId/epics" element={<ProgramEpicsPage />} />
              <Route path="/program/:programId/epic-backlog" element={<EpicBacklogWithSidebar />} />
              <Route path="/program/:programId/feature-backlog" element={<Suspense fallback={<div className="p-8">Loading...</div>}><FeatureBacklogPage /></Suspense>} />
              <Route path="/program/:programId/features" element={<FeaturesWithSidebar />} />
              <Route path="/program/:programId/program-board" element={<PlaceholderPage />} />
              <Route path="/program/:programId/dependencies" element={<DependenciesPage />} />
              <Route path="/program/:programId/roadmaps" element={<ProgramRoadmapPage />} />
              <Route path="/program/:programId/roadmaps-test" element={<RoadmapsTestPage />} />
              <Route path="/program/:programId/objectives-tree" element={<OKRHub />} />
              <Route path="/program/:programId/forecast" element={<PlaceholderPage />} />
              <Route path="/program/:programId/capacity" element={<CapacityWithSidebar />} />
              <Route path="/program/:programId/quarters" element={<QuartersPage />} />
              <Route path="/program/:programId/epic-balancing" element={<EpicBalancingPage />} />
              {/* Execution Workbench now at /program/:programId/work-tree */}
              <Route path="/program/:programId/reports" element={<PlaceholderPage />} />
              <Route path="/team/:teamId/okr-hub" element={<OKRHub />} />
              <Route path="/enterprise/roadmaps" element={<CatalystEnterpriseRoadmap />} />
              <Route path="/work-tree" element={<WorkTreePage />} />
              <Route path="/enterprise/work-tree" element={<WorkTreePage />} />
              <Route path="/enterprise/kanban-boards" element={<EnterpriseComingSoon />} />
              
              {/* Taskhub Module */}
              <Route path="/taskhub" element={<Navigate to="/taskhub/boards" replace />} />
              <Route path="/taskhub/:view" element={<PlannerPage />} />
              <Route path="/taskhub-kanban" element={<KanbanPage />} />
              <Route path="/taskhub/my-tasks" element={<MyTasksPage />} />
              
              {/* TestHub Module */}
              <Route path="/testhub" element={<Suspense fallback={<div className="p-8">Loading...</div>}><TestHubPage /></Suspense>}>
                <Route index element={<Navigate to="/testhub/repository" replace />} />
                <Route path="repository" element={<Suspense fallback={<div className="p-8">Loading...</div>}><TestRepositoryPage /></Suspense>} />
                <Route path="dashboard" element={<Suspense fallback={<div className="p-8">Loading...</div>}><TestHubDashboardPage /></Suspense>} />
                <Route path="shared-steps" element={<Suspense fallback={<div className="p-8">Loading...</div>}><SharedStepsPage /></Suspense>} />
                <Route path="test-sets" element={<Suspense fallback={<div className="p-8">Loading...</div>}><TestSetsPage /></Suspense>} />
                <Route path="cycles" element={<Suspense fallback={<div className="p-8">Loading...</div>}><TestCyclesPage /></Suspense>} />
                <Route path="execution" element={<Suspense fallback={<div className="p-8">Loading...</div>}><ExecutionHubPage /></Suspense>} />
                <Route path="runs" element={<Suspense fallback={<div className="p-8">Loading...</div>}><TestRunsPage /></Suspense>} />
                <Route path="defects" element={<Suspense fallback={<div className="p-8">Loading...</div>}><TestHubDefectsPage /></Suspense>} />
                <Route path="requirements" element={<Suspense fallback={<div className="p-8">Loading...</div>}><TestHubRequirementsPage /></Suspense>} />
                <Route path="traceability" element={<Suspense fallback={<div className="p-8">Loading...</div>}><TestHubTraceabilityPage /></Suspense>} />
                <Route path="reports" element={<Suspense fallback={<div className="p-8">Loading...</div>}><TestHubReportsPage /></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<div className="p-8">Loading...</div>}><TestHubSettingsPage /></Suspense>} />
              </Route>
              
              {/* Priorities Module (formerly Task10) */}
              <Route path="/priorities" element={<Suspense fallback={<div className="p-8">Loading...</div>}><T10LandingPage /></Suspense>} />
              <Route path="/priorities/completed" element={<Suspense fallback={<div className="p-8">Loading...</div>}><T10CompletedPage /></Suspense>} />
              <Route path="/priorities/list/:listId" element={<Suspense fallback={<div className="p-8">Loading...</div>}><T10WeekPage /></Suspense>} />
              <Route path="/priorities/list/:listId/week/:weekId" element={<Suspense fallback={<div className="p-8">Loading...</div>}><T10WeekPageV3 /></Suspense>} />
              
              {/* Legacy task10 routes - redirect to priorities */}
              <Route path="/taskhub/task10" element={<Navigate to="/priorities" replace />} />
              <Route path="/taskhub/task10/*" element={<Navigate to="/priorities" replace />} />
              
              {/* Legacy planner routes - redirect to taskhub */}
              <Route path="/planner" element={<Navigate to="/taskhub/boards" replace />} />
              <Route path="/planner/*" element={<Navigate to="/taskhub/boards" replace />} />
              
              {/* PlanHub Module */}
              <Route path="/planhub" element={<PlanLibraryPage />} />
              <Route path="/planhub/plan/:planId" element={<PlanEditorPage />} />
              <Route path="/planhub/compare" element={<ScenarioComparePage />} />
              <Route path="/planhub/master" element={<MasterPlanPage />} />
              <Route path="/planhub/resources" element={<PlanHubResourcesPage />} />
              <Route path="/planhub/ai" element={<PlanHubAIPage />} />
              <Route path="/planhub/reports" element={<PlanHubReportsPage />} />
              
              {/* Mining */}
              <Route path="/mining" element={<MiningComingSoon />} />
              
{/* Product (Industry routes moved outside CatalystShell) */}
<Route path="/product/room" element={<ProductRoomPage />} />
<Route path="/product/:productId/room" element={<ProductRoomPage />} />
<Route path="/product/capacity" element={<CapacityPlanningPage />} />

{/* Requirement Assist Routes - under Product */}
<Route path="/product/requirement-assist" element={<Suspense fallback={<div className="p-8">Loading...</div>}><RequirementAssistPage /></Suspense>} />
<Route path="/product/requirement-assist/history" element={<Suspense fallback={<div className="p-8">Loading...</div>}><RequirementAssistHistory /></Suspense>} />
<Route path="/generation-history" element={<Suspense fallback={<div className="p-8">Loading...</div>}><GenerationHistoryPage /></Suspense>} />
{/* Catch-all for unknown requirement-assist sub-routes */}
<Route path="/product/requirement-assist/*" element={<Navigate to="/product/requirement-assist" replace />} />

              {/* Ideas Hub Module - under Industry/Product */}
              <Route path="/industry/ideas" element={<Navigate to="/industry/ideas/hub" replace />} />
              <Route path="/industry/ideas/hub" element={<Suspense fallback={<div className="p-8">Loading...</div>}><IdeasHubPage /></Suspense>} />
              <Route path="/industry/ideas/all" element={<Suspense fallback={<div className="p-8">Loading...</div>}><AllIdeasPage /></Suspense>} />
              <Route path="/industry/ideas/initiatives" element={<Suspense fallback={<div className="p-8">Loading...</div>}><InitiativesPage /></Suspense>} />
              <Route path="/industry/ideas/initiatives/:initiativeId" element={<Suspense fallback={<div className="p-8">Loading...</div>}><InitiativeDetailPage /></Suspense>} />
              <Route path="/industry/ideas/submit" element={<Suspense fallback={<div className="p-8">Loading...</div>}><SubmitIdeaPage /></Suspense>} />
              <Route path="/industry/ideas/scoring" element={<Suspense fallback={<div className="p-8">Loading...</div>}><ScoringQueuePage /></Suspense>} />
              <Route path="/industry/ideas/matrix" element={<Suspense fallback={<div className="p-8">Loading...</div>}><PriorityMatrixPage /></Suspense>} />
              <Route path="/industry/ideas/insights" element={<Suspense fallback={<div className="p-8">Loading...</div>}><AIInsightsPage /></Suspense>} />
              <Route path="/industry/ideas/analytics" element={<Suspense fallback={<div className="p-8">Loading...</div>}><AnalyticsPage /></Suspense>} />
              <Route path="/industry/ideas/:ideaId" element={<Suspense fallback={<div className="p-8">Loading...</div>}><IdeaDetailPage /></Suspense>} />

              {/* Enterprise More Items */}
              <Route path="/enterprise/ideation" element={<Navigate to="/industry/ideas/hub" replace />} />
              <Route path="/enterprise/risks" element={<EnterpriseRisks />} />
              <Route path="/enterprise/impediments" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/epics" element={<EnterpriseEpics />} />
              
              <Route path="/enterprise/features" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/stories" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/defects" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/tasks" element={<EnterpriseTasks />} />
              <Route path="/enterprise/objectives" element={<EnterpriseObjectives />} />
              <Route path="/enterprise/dependencies" element={<EnterpriseDependencies />} />
              <Route path="/enterprise/sprints" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/program-increments" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/release-vehicles" element={<EnterpriseReleaseVehicles />} />
              <Route path="/enterprise/success-criteria" element={<EnterpriseSuccessCriteria />} />
              <Route path="/enterprise/skills-inventory" element={<SkillsInventory />} />
              
              {/* Enterprise More Items - Placeholder Routes */}
              <Route path="/enterprise/brainstorming" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/innovation" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/canvas" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/mind-maps" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/competitors" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/goals" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/vision" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/personas" element={<EnterpriseComingSoon />} />
              
              
              {/* Enterprise Reports - Placeholder Routes */}
              <Route path="/enterprise/reports/assessment" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/reports/assessment-results" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/reports/cumulative-effort" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/reports/strategic-balancing" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/reports/folios" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/reports/external" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/reports/organizational-hierarchy" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/reports/work-tree" element={<WorkTreePage />} />
              <Route path="/enterprise/reports/demand-capacity" element={<CapacityPlanningPage />} />
              
              {/* Enterprise More Pages - Placeholder Routes */}
              <Route path="/enterprise/pages/assessments" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/pages/definition-of-done" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/pages/framework-maps" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/pages/lean-process" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/pages/metrics" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/pages/meetings" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/pages/story-point-progress" element={<EnterpriseComingSoon />} />
              
              <Route path="/themes" element={<Themes />} />
              <Route path="/themes/grid" element={<Themes />} />
              <Route path="/portfolio/:portfolioId/themes" element={<Themes />} />
              <Route path="/initiatives" element={<Initiatives />} />
              <Route path="/epics" element={<Navigate to="/program/b2c3d4e5-f6a7-8901-bcde-f12345678901/epic-backlog" replace />} />
              <Route path="/backlog/epics" element={<Navigate to="/program/b2c3d4e5-f6a7-8901-bcde-f12345678901/epic-backlog" replace />} />
            <Route path="/features" element={<FeaturesBacklog />} />
            <Route path="/features/prioritization" element={<FeaturePrioritizationView />} />
              <Route path="/items/epics" element={<Navigate to="/program/b2c3d4e5-f6a7-8901-bcde-f12345678901/epic-backlog" replace />} />
              <Route path="/items/epics/recycle-bin" element={<EpicsRecycleBinPage />} />
              <Route path="/items/epics/canceled" element={<EpicsCanceledPage />} />
              <Route path="/items/epics/:epicId/status-report" element={<EpicStatusReport />} />
              <Route path="/items/epics/:epicId/trace" element={<EpicTraceReport />} />
              <Route path="/items/epics/:epicId/requirement-hierarchy" element={<EpicRequirementHierarchy />} />
              <Route path="/items/epics/:epicId/responsibility-matrix" element={<EpicResponsibilityMatrix />} />
              <Route path="/items/epics/:epicId/planning" element={<EpicPlanningPage />} />
              <Route path="/items/epics/estimation" element={<EpicEstimationPage />} />
              <Route path="/portfolio/:portfolioId/epic-estimation" element={<EpicEstimationPage />} />
              
              <Route path="/items/defects" element={<Defects />} />
              <Route path="/items/tasks" element={<Tasks />} />
              <Route path="/items/ideation" element={<Ideation />} />
              <Route path="/items/ideation/manage-users" element={<ManageIdeationUsersPage />} />
              <Route path="/items/ideation/manage-backlog" element={<ManageEnhancementRequests />} />
              <Route path="/items/impediments" element={<Impediments />} />
              <Route path="/items/release-vehicles" element={<ReleaseVehicles />} />
              <Route path="/items/success-criteria" element={<SuccessCriteria />} />
              <Route path="/portfolio-kanban" element={<PortfolioKanban />} />
          <Route path="/portfolio-roadmap" element={<PortfolioRoadmap />} />
          <Route path="/roadmaps" element={<Roadmaps />} />
              <Route path="/dependencies" element={<DependenciesPage />} />
              <Route path="/reports/dependencies/maps" element={<DependencyMapsPage />} />
              <Route path="/work-spend-grid" element={<WorkSpendGrid />} />
              <Route path="/portfolio-insights" element={<EnterpriseComingSoon />} />
              <Route path="/programs/:programId/room" element={<ProgramRoom />} />
              <Route path="/programs/:programId/epics" element={<EpicsPage />} />
              <Route path="/programs/:programId/features" element={<FeaturesWithSidebar />} />
              <Route path="/programs/:programId/backlog" element={<BacklogWithSidebar />} />
              <Route path="/programs/:programId/epic-backlog" element={<EpicBacklogWithSidebar />} />
              <Route path="/programs/:programId/roadmaps" element={<ProgramRoadmapPage />} />
              <Route path="/programs/:programId/objective-tree" element={<OKRHub />} />
              <Route path="/programs/:programId/work-tree" element={<WorkTreePage />} />
              <Route path="/programs/:programId/program-board" element={<PlaceholderPage />} />
              <Route path="/programs/:programId/forecast" element={<PlaceholderPage />} />
              <Route path="/programs/:programId/capacity" element={<CapacityWithSidebar />} />
              <Route path="/programs/:programId/settings" element={<PlaceholderPage />} />
              <Route path="/programs/:programId/quarters" element={<QuartersPage />} />
              <Route path="/program-room" element={<Navigate to="/for-you" replace />} />
              <Route path="/pis" element={<PlaceholderPage />} />
              <Route path="/program-board" element={<Navigate to="/for-you" replace />} />
              <Route path="/programs/program-board" element={<Navigate to="/for-you" replace />} />
              <Route path="/programs/program-board/history" element={<ProgramBoardHistory />} />
              <Route path="/pi-objectives" element={<PIObjectives />} />
              <Route path="/capacity" element={<CapacityPlanning />} />
              <Route path="/risks" element={<RisksGridPage />} />
              <Route path="/risk-roam-report" element={<RiskRoamReportPage />} />
              <Route path="/release-train-calendar" element={<div className="p-8"><h1 className="text-2xl font-bold">Release Calendar</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/program-backlog" element={<div className="p-8"><h1 className="text-2xl font-bold">Program Backlog</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/programs" element={<ProgramDirectory />} />
              <Route path="/projects" element={<ProjectDirectory />} />
              <Route path="/projects/:projectKey" element={<Navigate to={`/projects`} replace />} />
              <Route path="/projects/:projectKey/summary" element={<Navigate to={`/projects`} replace />} />
              <Route path="/projects/:projectKey/settings" element={<ProjectSettingsPage />} />
              <Route path="/projects/:projectId/features" element={<FeaturesPage />} />
              <Route path="/projects/:projectId/features/:featureId" element={<Suspense fallback={<div className="p-8">Loading...</div>}><FeatureDetailPage /></Suspense>} />
              
              {/* Project Workspace with Board/Timeline/FeatureMap views */}
              <Route path="/projects/:projectId" element={<Suspense fallback={<div className="p-8">Loading...</div>}><ProjectWorkspace /></Suspense>}>
                <Route path="board" element={<Suspense fallback={<div className="p-8">Loading...</div>}><BoardView /></Suspense>} />
                <Route path="timeline" element={<Suspense fallback={<div className="p-8">Loading...</div>}><TimelineView /></Suspense>} />
                <Route path="feature-map" element={<div className="h-full flex items-center justify-center text-muted-foreground">Feature Map View - Coming Soon</div>} />
              </Route>
              
              <Route path="/projects/:projectId/work" element={<ProjectWorkHubPage />} />
              <Route path="/projects/:projectId/backlog" element={<ProjectBacklogPage />} />
              <Route path="/projects/:projectId/roadmap" element={<ProjectComingSoonPage pageTitle="Roadmap" />} />
              <Route path="/projects/:projectId/dependencies" element={<ProjectComingSoonPage pageTitle="Dependencies" />} />
              <Route path="/projects/:projectId/reports" element={<ProjectComingSoonPage pageTitle="Reports" />} />
              <Route path="/project/:projectId/work" element={<ProjectWorkHubPage />} />
              
              {/* In-Jira Module Routes - Jira-class Project Execution */}
              <Route path="/project/:projectKey" element={<InJiraLayout />}>
                <Route index element={<Navigate to="summary" replace />} />
                <Route path="summary" element={<InJiraSummaryPage />} />
                <Route path="list" element={<InJiraListPage />} />
                <Route path="all-work" element={<InJiraAllWorkPage />} />
                <Route path="boards/kanban" element={<KanbanBoardPage />} />
                <Route path="boards/scrum" element={<ScrumBoardPage />} />
                <Route path="releases" element={<InJiraReleasesPage />} />
                <Route path="release-management" element={<ReleaseManagementPage />} />
                <Route path="settings" element={<InJiraSettingsPage />} />
              </Route>
              <Route path="/teams" element={<TeamComingSoon />} />
              <Route path="/teams/:teamId/room" element={<TeamComingSoon />} />
              <Route path="/teams/:teamId/work-tree" element={<WorkTreePage />} />
              <Route path="/teams/:teamId/backlog" element={<TeamComingSoon />} />
              <Route path="/teams/:teamId/board" element={<TeamComingSoon />} />
              <Route path="/teams/:teamId/objective-tree" element={<OKRHub />} />
              <Route path="/teams/:teamId/roadmaps" element={<TeamComingSoon />} />
              <Route path="/teams/:teamId/sprints" element={<TeamComingSoon />} />
              <Route path="/teams/:teamId/velocity" element={<TeamComingSoon />} />
              <Route path="/teams/:teamId/meetings" element={<TeamComingSoon />} />
              <Route path="/teams/:teamId/impediments" element={<TeamComingSoon />} />
              <Route path="/teams/:teamId/features" element={<TeamComingSoon />} />
              <Route path="/teams/:teamId/tasks" element={<TeamComingSoon />} />
              <Route path="/teams/:teamId/dependencies" element={<TeamComingSoon />} />
              <Route path="/teams/:teamId/risks" element={<TeamComingSoon />} />
              <Route path="/teams/:teamId/program-increments" element={<TeamComingSoon />} />
              <Route path="/teams/:teamId/release-vehicles" element={<TeamComingSoon />} />
              <Route path="/teams/:teamId/reports/stories-by-state" element={<TeamComingSoon />} />
              <Route path="/teams/:teamId/reports/story-point-progress" element={<TeamComingSoon />} />
              <Route path="/teams/:teamId/reports/team-velocity-trend" element={<TeamComingSoon />} />
              <Route path="/teams/:teamId/reports/work-tree" element={<WorkTreePage />} />
              <Route path="/teams/:teamId/pages/assessments" element={<TeamComingSoon />} />
              <Route path="/teams/:teamId/pages/metrics" element={<TeamComingSoon />} />
              <Route path="/teams/:teamId/kanban-boards" element={<TeamComingSoon />} />

              {/* Portfolio Routes with :portfolioId */}
              <Route path="/portfolio/:portfolioId/room" element={<PlaceholderPage />} />
              <Route path="/portfolio/:portfolioId/objective-tree" element={<OKRHub />} />
              <Route path="/portfolio/:portfolioId/work-tree" element={<WorkTreePage />} />
              <Route path="/portfolio/:portfolioId/backlog" element={<PlaceholderPage />} />
              <Route path="/portfolio/:portfolioId/roadmaps" element={<Roadmaps />} />
              <Route path="/portfolio/:portfolioId/forecast" element={<Forecast />} />
              <Route path="/portfolio/:portfolioId/capacity" element={<CapacityPlanning />} />
              <Route path="/portfolio/:portfolioId/initiatives" element={<Initiatives />} />
              <Route path="/portfolio/:portfolioId/features" element={<Features />} />
              <Route path="/portfolio/:portfolioId/stories" element={<Stories />} />
              <Route path="/portfolio/:portfolioId/defects" element={<Defects />} />
              <Route path="/portfolio/:portfolioId/tasks" element={<Tasks />} />
              <Route path="/portfolio/:portfolioId/dependencies" element={<DependenciesPage />} />
              <Route path="/portfolio/:portfolioId/risks" element={<RisksGridPage />} />
              <Route path="/portfolio/:portfolioId/impediments" element={<Impediments />} />
              <Route path="/portfolio/:portfolioId/sprints" element={<Sprints />} />
              <Route path="/portfolio/:portfolioId/program-increments" element={<PlaceholderPage />} />
              <Route path="/portfolio/:portfolioId/release-vehicles" element={<ReleaseVehicles />} />
              <Route path="/portfolio/:portfolioId/reports/epic-status" element={<EpicStatusReport />} />
              <Route path="/portfolio/:portfolioId/reports/epic-trace" element={<EpicTraceReport />} />
              <Route path="/portfolio/:portfolioId/reports/feature-status" element={<TeamComingSoon />} />
              <Route path="/portfolio/:portfolioId/reports/health" element={<TeamComingSoon />} />
              <Route path="/portfolio/:portfolioId/reports/work-tree" element={<WorkTreePage />} />
              <Route path="/portfolio/:portfolioId/pages/assessments" element={<TeamComingSoon />} />
              <Route path="/portfolio/:portfolioId/pages/metrics" element={<TeamComingSoon />} />
              <Route path="/portfolio/:portfolioId/pages/meetings" element={<TeamComingSoon />} />
              <Route path="/portfolio/:portfolioId/kanban-boards" element={<TeamComingSoon />} />

              {/* Program Routes with :programId */}
              <Route path="/programs/:programId/room" element={<ProgramRoom />} />
              <Route path="/programs/:programId/program-board" element={<PlaceholderPage />} />
              <Route path="/programs/:programId/objective-tree" element={<OKRHub />} />
              <Route path="/programs/:programId/work-tree" element={<WorkTreePage />} />
              <Route path="/programs/:programId/backlog" element={<BacklogWithSidebar />} />
              <Route path="/programs/:programId/roadmaps" element={<ProgramRoadmapPage />} />
              <Route path="/programs/:programId/program-roadmap" element={<ProgramRoadmapPage />} />
              <Route path="/programs/:programId/dependencies" element={<DependenciesPage />} />
              <Route path="/programs/:programId/forecast" element={<PlaceholderPage />} />
              <Route path="/programs/:programId/capacity" element={<CapacityWithSidebar />} />
              <Route path="/programs/:programId/increments" element={<PlaceholderPage />} />
              <Route path="/programs/:programId/epics" element={<EpicsPage />} />
              <Route path="/programs/:programId/features" element={<FeaturesWithSidebar />} />
              <Route path="/programs/:programId/stories" element={<Stories />} />
              <Route path="/programs/:programId/defects" element={<Defects />} />
              <Route path="/programs/:programId/tasks" element={<Tasks />} />
              <Route path="/programs/:programId/risks" element={<RisksGridPage />} />
              <Route path="/programs/:programId/impediments" element={<Impediments />} />
              <Route path="/programs/:programId/sprints" element={<Sprints />} />
              <Route path="/programs/:programId/release-vehicles" element={<ReleaseVehicles />} />
              <Route path="/programs/:programId/reports/feature-status" element={<TeamComingSoon />} />
              <Route path="/programs/:programId/reports/board-history" element={<ProgramBoardHistory />} />
              <Route path="/programs/:programId/reports/work-tree" element={<WorkTreePage />} />
              <Route path="/programs/:programId/reports/pi-objectives" element={<PIObjectives />} />
              <Route path="/programs/:programId/kanban-boards" element={<TeamComingSoon />} />
              <Route path="/programs/:programId/pages/assessments" element={<TeamComingSoon />} />
              <Route path="/programs/:programId/pages/metrics" element={<TeamComingSoon />} />
              <Route path="/programs/:programId/pages/meetings" element={<TeamComingSoon />} />
              
              <Route path="/team/:teamId/room" element={<TeamComingSoon />} />
              
              {/* Team Routes - Placeholder Routes */}
              <Route path="/team/:teamId/backlog" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/stories" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/roadmaps" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/objective-tree" element={<OKRHub />} />
              <Route path="/team/:teamId/work-tree" element={<WorkTreePage />} />
              <Route path="/team/:teamId/meetings" element={<TeamComingSoon />} />
              
              {/* Team More Items - Placeholder Routes */}
              <Route path="/team/:teamId/assign-tasks" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/defects" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/dependencies" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/design-components" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/estimation" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/impediments" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/sprints" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/tasks" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/objectives" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/teams" element={<TeamComingSoon />} />
              
              {/* Team Reports - Placeholder Routes */}
              <Route path="/team/:teamId/reports/assessment" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/reports/assessment-results" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/reports/burndowns" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/reports/capacity-planning" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/reports/cumulative-effort" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/reports/dependency-maps" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/reports/detailed-sprint-progress" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/reports/external" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/reports/impediments-risks" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/reports/organizational-hierarchy" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/reports/risk-impediment-status" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/reports/sprint-coaching" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/reports/sprint-health" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/reports/sprint-metrics" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/reports/sprint-performance" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/reports/sprint-planning" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/reports/sprint-review" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/reports/sprint-scope-changes" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/reports/sprint-status" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/reports/stories-by-state" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/reports/story-point-progress" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/reports/team-velocity-trend" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/reports/work-tree" element={<WorkTreePage />} />
              <Route path="/team/:teamId/kanban-boards" element={<TeamComingSoon />} />
              
              {/* Team More Pages - Placeholder Routes */}
              <Route path="/team/:teamId/pages/assessments" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/pages/definition-of-done" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/pages/lean-process" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/pages/retrospectives" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/pages/surveys" element={<TeamComingSoon />} />
              
              <Route path="/team-room" element={<TeamRoom />} />
              <Route path="/backlog" element={<Backlog />} />
              <Route path="/backlog-phase2" element={<Navigate to="/backlog" replace />} />
              <Route path="/sprints" element={<Sprints />} />
              <Route path="/sprint-board" element={<SprintBoard />} />
              <Route path="/stories" element={<Stories />} />
              <Route path="/work-items/stories" element={<Stories />} />
              <Route path="/work-items/subtasks" element={<Subtasks />} />
              <Route path="/releases" element={<Navigate to="/releases/command-center" replace />} />
              <Route path="/releases/command-center" element={<ReleasesCommandCenter />} />
              <Route path="/releases/dashboard" element={<ReleaseDashboardOverviewPage />} />
              <Route path="/releases/my-scope" element={<MyTestScopePage />} />
              <Route path="/releases/all" element={<AllReleasesPage />} />
              <Route path="/releases/calendar" element={<CalendarPage />} />
              <Route path="/releases/compare" element={<ComparePage />} />
              <Route path="/releases/test-plans" element={<Suspense fallback={<div className="p-8">Loading...</div>}><ReleasesTestPlansPage /></Suspense>} />
              <Route path="/releases/test-plans/:planId" element={<Suspense fallback={<div className="p-8">Loading...</div>}><ReleasesTestPlanDetailPage /></Suspense>} />
              <Route path="/releases/test-cases" element={<ReleasesTestCasesPage />} />
              <Route path="/releases/test-cases/:id" element={<ReleasesTestCaseDetailPage />} />
              {/* Removed duplicate /releases/tests routes - use /releases/test-cases only */}
              <Route path="/releases/test-cycles" element={<ReleasesTestCyclesPage />} />
              <Route path="/releases/test-cycles/:cycleId" element={<ReleasesCycleCommandCenter />} />
              <Route path="/releases/templates" element={<ReleasesCycleTemplatesPage />} />
              <Route path="/releases/workload" element={<Suspense fallback={<div className="p-8">Loading...</div>}><WorkloadDashboard /></Suspense>} />
              <Route path="/releases/execution" element={<Suspense fallback={<div className="p-8">Loading...</div>}><ExecutionPage /></Suspense>} />
              <Route path="/releases/execution/:cycleId/:testCaseId" element={<ReleasesTestExecutionPage />} />
              <Route path="/releases/execute/:cycleId/:testCaseId" element={<ProtectedRoute><TestExecutionFocusPage /></ProtectedRoute>} />
              <Route path="/releases/ask-ai" element={<Suspense fallback={<div className="p-8">Loading...</div>}><AskAIPage /></Suspense>} />
              <Route path="/releases/coverage" element={<CoverageReportsPage />} />
              <Route path="/releases/quality-gates" element={<Suspense fallback={<div className="p-8">Loading...</div>}><QualityGatesPage /></Suspense>} />
              <Route path="/releases/rtm" element={<Suspense fallback={<div className="p-8">Loading...</div>}><RTMPage /></Suspense>} />
              <Route path="/releases/defects" element={<ReleasesDefectsPage />} />
              <Route path="/releases/defects/:id" element={<Suspense fallback={<div className="p-8">Loading...</div>}><ReleasesDefectDetailPage /></Suspense>} />
              <Route path="/releases/:releaseId" element={<ReleaseDashboardV5Page />} />
              
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              
              {/* Kanban Boards Routes - Team Scoped */}
              <Route path="/team/:teamId/kanban-boards" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/kanban-boards/:boardId" element={<KanbanBoardView />} />
              <Route path="/team/:teamId/kanban-boards/:boardId/setup" element={<KanbanBoardSetup />} />
              <Route path="/team/:teamId/kanban-boards/:boardId/analytics" element={<KanbanBoardAnalytics />} />
              
              {/* Knowledge Hub Routes */}
              <Route path="/knowledge-hub" element={<KnowledgeHubPage />} />
              <Route path="/knowledge-hub/spaces/:spaceId" element={<KnowledgeHubSpacePage />} />
              <Route path="/knowledge-hub/documents/:documentId" element={<KnowledgeHubDocumentPage />} />
              
              
              {/* Operations (Incidents) Routes */}
              <Route path="/release" element={<Navigate to="/release/incidents" replace />} />
              
              {/* Incident Module - Canonical Routes Only */}
              <Route path="/release/incidents" element={<IncidentRoomList />} />
              <Route path="/release/incidents/dashboard" element={<IncidentsDashboard />} />
              <Route path="/release/incidents/analytics" element={<Suspense fallback={null}><IncidentAnalyticsPage /></Suspense>} />
              <Route path="/release/incidents/insights" element={<Suspense fallback={null}><IncidentInsightsPage /></Suspense>} />
              <Route path="/release/incidents/kanban" element={<Suspense fallback={null}><IncidentKanbanPage /></Suspense>} />
              <Route path="/release/incidents/create" element={<CreateIncident />} />
              <Route path="/release/incidents/reports" element={<IncidentReports />} />
              <Route path="/release/incidents/:incidentId" element={<IncidentRoomDetail />} />
              
              {/* Legacy Route Redirects - Preserve backwards compatibility */}
              <Route path="/release/incident-room" element={<Navigate to="/release/incidents" replace />} />
              <Route path="/release/incident-room/:incidentId" element={<Navigate to="/release/incidents/:incidentId" replace />} />
              <Route path="/release/incident-reports" element={<Navigate to="/release/incidents/reports" replace />} />
              
              {/* Incident Support Routes */}
              <Route path="/release/incident-command-center" element={<IncidentCommandCenter />} />
              <Route path="/release/committee-queue" element={<CommitteeQueue />} />
              {/* Kanban Boards Routes - Program Scoped */}
              <Route path="/programs/:programId/kanban-boards" element={<TeamComingSoon />} />
              <Route path="/programs/:programId/kanban-boards/:boardId" element={<KanbanBoardView />} />
              <Route path="/programs/:programId/kanban-boards/:boardId/setup" element={<KanbanBoardSetup />} />
              <Route path="/programs/:programId/kanban-boards/:boardId/analytics" element={<KanbanBoardAnalytics />} />
              
              <Route path="/insights/portfolio" element={<EnterpriseComingSoon />} />
              <Route path="/insights/program" element={<EnterpriseComingSoon />} />
              <Route path="/insights/team" element={<EnterpriseComingSoon />} />
              <Route path="/insights/predictability" element={<EnterpriseComingSoon />} />
              <Route path="/insights/dependency-risk" element={<EnterpriseComingSoon />} />
              <Route path="/admin/org-setup" element={<AdminGuard><OrgSetup /></AdminGuard>} />
              <Route path="/admin/hierarchy" element={<AdminGuard><HierarchyConfig /></AdminGuard>} />
              <Route path="/admin/custom-fields" element={<AdminGuard><CustomFields /></AdminGuard>} />
              <Route path="/admin/boards" element={<AdminGuard><BoardConfig /></AdminGuard>} />
              <Route path="/admin/user-roles" element={<AdminGuard><UserRoles /></AdminGuard>} />
              <Route path="/admin/permissions" element={<AdminGuard><Permissions /></AdminGuard>} />
              <Route path="/admin/integrations" element={<AdminGuard><Integrations /></AdminGuard>} />
              <Route path="/admin/activity-log" element={<AdminGuard><ActivityLog /></AdminGuard>} />
              
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/overview" replace />} />
                <Route path="overview" element={<AdminOverview />} />
                <Route path="activity" element={<AuditActivityPage />} />
                <Route path="changes" element={<Changes />} />
                <Route path="changes-log" element={<ChangesLog />} />
                <Route path="use-trend" element={<UseTrend />} />
                <Route path="usage-trends" element={<UsageTrends />} />
                <Route path="work-codes" element={<WorkCodes />} />
                <Route path="modules-packages" element={<ModulesPackages />} />
                <Route path="details-panels" element={<DetailsPanels />} />
                <Route path="terminology" element={<Terminology />} />
                <Route path="team-settings" element={<TeamSettings />} />
                <Route path="program-settings" element={<ProgramSettings />} />
                <Route path="portfolio-settings" element={<PortfolioSettings />} />
                <Route path="progress-bars" element={<ProgressBars />} />
                <Route path="progress-bars-config" element={<ProgressBarsConfig />} />
                <Route path="estimation-settings" element={<EstimationSettings />} />
                <Route path="general-settings" element={<GeneralSettings />} />
                <Route path="general-config" element={<GeneralConfig />} />
                <Route path="security-settings" element={<SecuritySettings />} />
                <Route path="announcements" element={<Announcements />} />
                <Route path="user-access" element={<Suspense fallback={<div>Loading...</div>}><UserAccessPage /></Suspense>} />
                <Route path="users" element={<UsersManagement />} />
                <Route path="roles-permissions" element={<RolesPermissions />} />
                <Route path="module-matrix" element={<Suspense fallback={<div>Loading...</div>}><ModuleMatrixPage /></Suspense>} />
                <Route path="theme-groups" element={<ThemeGroups />} />
                <Route path="programs" element={<Programs />} />
                <Route path="portfolios" element={<Portfolios />} />
                <Route path="departments" element={<Departments />} />
                <Route path="capacity-departments" element={<Suspense fallback={<div>Loading...</div>}><CapacityDepartmentsPage /></Suspense>} />
                <Route path="resource-assignments" element={<Suspense fallback={<div>Loading...</div>}><ResourceAssignmentsPage /></Suspense>} />
                <Route path="resource-locations" element={<Suspense fallback={<div>Loading...</div>}><ResourceLocationsPage /></Suspense>} />
                <Route path="resource-countries" element={<Suspense fallback={<div>Loading...</div>}><ResourceCountriesPage /></Suspense>} />
                <Route path="resource-vendors" element={<Suspense fallback={<div>Loading...</div>}><ResourceVendorsPage /></Suspense>} />
                <Route path="business-owners" element={<BusinessOwnersAdmin />} />
                <Route path="business-processes" element={<BusinessProcesses />} />
                <Route path="business/ProcessStep" element={<ProcessSteps />} />
                <Route path="business/EpicStatus" element={<EpicStatuses />} />
                <Route path="business/FeatureStatus" element={<FeatureStatuses />} />
                <Route path="business/ThemeStatus" element={<ThemeStatuses />} />
                <Route path="create-menu-config" element={<CreateMenuConfig />} />
                <Route path="business/RiskSeverity" element={<RiskSeverityLevels />} />
                <Route path="business/DeliveryPlatforms" element={<DeliveryPlatforms />} />
                <Route path="estimation" element={<Estimation />} />
                <Route path="security" element={<Security />} />
                <Route path="jira-config" element={<JiraIntegrationConfig />} />
                <Route path="product-settings" element={<ProductSettings />} />
                <Route path="import-data" element={<ImportData />} />
                <Route path="data-hygiene" element={<DataHygiene />} />
                <Route path="design-audit" element={<DesignAuditPage />} />
                <Route path="theme-audit" element={<ThemeAuditPage />} />
                <Route path="kanban-settings" element={<KanbanSettings />} />
                <Route path="resource-utilization" element={<Suspense fallback={<div>Loading...</div>}><ResourceUtilizationPage /></Suspense>} />
                <Route path="software-licenses" element={<Suspense fallback={<div>Loading...</div>}><SoftwareLicensesPage /></Suspense>} />
                <Route path="routes-registry" element={<RoutesComponentsRegistry />} />
                <Route path="snapshots" element={<SnapshotsAdmin />} />
                <Route path="incidents/workgroups" element={<IncidentWorkgroups />} />
                <Route path="incidents/fields" element={<IncidentFieldsConfig />} />
                <Route path="incidents/sla" element={<IncidentSLAPolicies />} />
                <Route path="incidents/cap-policy" element={<IncidentCAPPolicy />} />
                <Route path="incidents/conversion" element={<IncidentConversionRules />} />
                <Route path="incidents/audit" element={<IncidentAuditCompliance />} />
                <Route path="incidents/owning-teams" element={<IncidentOwningTeams />} />
                <Route path="mock-data" element={<MockDataGenerator />} />
                <Route path="ai-integration" element={<Suspense fallback={<div className="p-8">Loading...</div>}><AiIntegrationPage /></Suspense>} />
                {/* PlanHub Admin Routes */}
                <Route path="planhub" element={<Navigate to="/admin/planhub/general" replace />} />
                <Route path="planhub/general" element={<PlanHubGeneralSettings />} />
                <Route path="planhub/templates" element={<PlanHubTemplates />} />
                <Route path="planhub/ai" element={<PlanHubAIConfig />} />
                <Route path="planhub/audit" element={<PlanHubActivityLog />} />
                {/* Catch-all for unknown planhub admin sub-routes */}
                <Route path="planhub/*" element={<Navigate to="/admin/planhub/general" replace />} />
                {/* Requirement Assist Admin Routes */}
                <Route path="requirement-assist" element={<Navigate to="/admin/requirement-assist/ai-configuration" replace />} />
                <Route path="requirement-assist/ai-configuration" element={<RAAdminAIConfiguration />} />
                <Route path="requirement-assist/templates" element={<RAAdminTemplates />} />
                <Route path="requirement-assist/compliance" element={<RAAdminCompliance />} />
                <Route path="requirement-assist/translation" element={<RAAdminTranslation />} />
                <Route path="requirement-assist/analytics" element={<RAAdminAnalytics />} />
                <Route path="requirement-assist/permissions" element={<RAAdminPermissions />} />
                {/* Catch-all for unknown requirement-assist admin sub-routes */}
                <Route path="requirement-assist/*" element={<Navigate to="/admin/requirement-assist/ai-configuration" replace />} />
                {/* Ideas Admin Settings */}
                <Route path="ideas" element={<Suspense fallback={<div className="p-8">Loading...</div>}><IdeasAdminSettingsPage /></Suspense>} />
                {/* Slack Integration */}
                <Route path="slack" element={<Suspense fallback={<div className="p-8">Loading...</div>}><SlackIntegrationPage /></Suspense>} />
                {/* Enhanced Task List */}
                <Route path="task-list" element={<Suspense fallback={<div className="p-8">Loading...</div>}><TaskListPage /></Suspense>} />
              </Route>

              <Route path="/items/epics/:epicId/status-report" element={<EpicStatusReport />} />
              <Route path="/items/epics/:epicId/trace" element={<EpicTraceReport />} />
              <Route path="/items/epics/:epicId/requirement-hierarchy" element={<EpicRequirementHierarchy />} />
              <Route path="/reports-discovery" element={<AdminGuard><ReportsDiscovery /></AdminGuard>} />
              <Route path="/pi-wizard" element={<AdminGuard><PIWizard /></AdminGuard>} />
              <Route path="/jira-integration" element={<AdminGuard><JiraIntegration /></AdminGuard>} />
              <Route path="/value-stream" element={<ValueStreamView />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/admin/settings/notifications" element={<Suspense fallback={<div className="p-8">Loading...</div>}><UserNotificationSettingsPage /></Suspense>} />
              <Route path="/items/:type" element={<PlaceholderPage />} />
              {/* Dev and QA routes removed */}
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
              <CatyWidgetRouteGuard />
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
