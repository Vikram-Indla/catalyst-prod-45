import React, { lazy, Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./lib/auth";
import { NavigationProvider } from "./contexts/NavigationContext";
import { ProcessStepsProvider } from "./contexts/ProcessStepsContext";
import { CatalystToastProvider } from "./contexts/CatalystToastContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { CatalystShell } from "./components/layout/CatalystShell";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CatalystLoginPage } from "./components/auth/login";
// Jira test pages removed - AtlasKit migration complete
import BrowsePage from "./pages/BrowsePage";
import DependencyMapsPage from "./pages/reports/DependencyMapsPage";
import SearchPage from "./pages/SearchPage";
import Home from "./pages/jira-align/Home";
import PlaceholderPage from "./pages/jira-align/PlaceholderPage";
import StrategyRoom from "./pages/StrategyRoom";
import StrategyRoomPage from "./pages/enterprise/StrategyRoomPage";
const CapacityPlannerPage = lazy(() => import("./pages/enterprise/CapacityPlannerPage"));
import Themes from "./pages/Themes";
import Initiatives from "./pages/Initiatives";
import Epics from "./pages/Epics";
import EpicsPage from "./pages/items/EpicsPage";
import EpicsRecycleBinPage from "./pages/items/EpicsRecycleBinPage";
import EpicsCanceledPage from "./pages/items/EpicsCanceledPage";
import EpicStatusReport from "./pages/items/reports/EpicStatusReport";
import EpicTraceReport from "./pages/items/reports/EpicTraceReport";
import EpicRequirementHierarchy from "./pages/items/reports/EpicRequirementHierarchy";
import EpicResponsibilityMatrix from "./pages/items/reports/EpicResponsibilityMatrix";
import EpicPlanningPage from "./pages/items/reports/EpicPlanningPage";
import EpicEstimationPage from "./pages/items/EpicEstimationPage";
import EpicBacklog from "./pages/EpicBacklog";
import EpicBacklogWithSidebar from "./pages/EpicBacklogWithSidebar";
import BacklogEpics from "./pages/BacklogEpics";
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

import Defects from "./pages/Defects";
import Tasks from "./pages/Tasks";
import Ideation from "./pages/Ideation";
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
import ProgramBoardNew from "./pages/ProgramBoardNew";
import ProgramBoardWithSidebar from "./pages/ProgramBoardWithSidebar";
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
import Users from "./pages/admin/Users";
import TeamRoles from "./pages/admin/TeamRoles";
import SystemRoles from "./pages/admin/SystemRoles";
import RolesPermissions from "./pages/admin/RolesPermissions";
import ThemeGroups from "./pages/admin/ThemeGroups";
import Programs from "./pages/admin/Programs";
import Departments from "./pages/admin/Departments";
const CapacityDepartmentsPage = lazy(() => import("./pages/admin/CapacityDepartments"));
const ResourceAssignmentsPage = lazy(() => import("./pages/admin/ResourceAssignments"));
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
import ResourceInventory from "./pages/admin/ResourceInventory";
import MockDataGenerator from "./pages/admin/MockDataGenerator";
const AiIntegrationPage = lazy(() => import("./pages/admin/AiIntegrationPage"));
import ProcessSteps from "./pages/admin/ProcessSteps";
import CreateMenuConfig from "./pages/admin/CreateMenuConfig";
import DeliveryPlatforms from "./pages/admin/DeliveryPlatforms";
import RiskSeverityLevels from "./pages/admin/RiskSeverityLevels";
import DevelopmentInventory from "./pages/admin/DevelopmentInventory";
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
import UIQARoute from "./pages/UIQARoute";
import ThemeAuditProbe from "./pages/ThemeAuditProbe";
import ValueStreamView from "./pages/ValueStreamView";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";
import EFDesignerPage from "./modules/ef-designer/pages/EFDesignerPage";
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
import ExecutiveRoadmapPage from "./pages/enterprise/ExecutiveRoadmapPage";
import CatalystDemandKanban from "./modules/kanban/pages/CatalystDemandKanban";
import CatalystDemandList from "./modules/product-backlog/pages/CatalystDemandList";
import CatalystDemandTable from "./modules/product-backlog/pages/CatalystDemandTable";

import SubmitDemandRequest from "./pages/SubmitDemandRequest";
import ResetPassword from "./pages/ResetPassword";
import TeamComingSoon from "./pages/team/ComingSoon";
import SelfTest from "./pages/dev/SelfTest";
import EpicBacklogTests from "./pages/dev/EpicBacklogTests";
import ForecastSelfTest from "./pages/dev/ForecastSelfTest";
import TeamsSelfTest from "./pages/dev/TeamsSelfTest";
import NotificationsSelfTest from "./pages/dev/NotificationsSelfTest";
import PortfolioThemeSelfTest from "./pages/dev/PortfolioThemeSelfTest";
import ProgramBoardSelfTest from "./pages/dev/ProgramBoardSelfTest";
import SourcesReference from "./pages/dev/SourcesReference";
import ToastDemo from "./pages/dev/ToastDemo";
import DarkModeGatePage from "./pages/qa/DarkModeGatePage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import KanbanBoardView from "./pages/KanbanBoardView";
import KanbanBoardSetup from "./pages/KanbanBoardSetup";
import KanbanBoardAnalytics from "./pages/KanbanBoardAnalytics";
import KnowledgeHubDocumentPage from "./pages/KnowledgeHubDocumentPage";
import KnowledgeHubPage from "./pages/KnowledgeHubPage";
import KnowledgeHubSpacePage from "./pages/KnowledgeHubSpacePage";

// Release Management Module
import {
  IncidentsList,
  IncidentDetail,
  IncidentsDashboard,
  CreateIncident,
  CommitteeQueue,
  IncidentReports,
  VersionsList,
  VersionDetail,
  ReleaseCalendar,
  ReleaseOverview,
  ReleaseSettings
} from "./pages/release";

// Incident Room (New)
import IncidentRoomList from "./pages/release/IncidentRoomList";
import IncidentRoomDetail from "./pages/release/IncidentRoomDetail";
import IncidentCommandCenter from "./pages/release/IncidentCommandCenter";

// Release Calendar Module (Forward Schedule of Change)
import ReleaseCalendarFSC from "./modules/release-calendar/pages/ReleaseCalendarPage";

// Incident Analytics
const IncidentAnalyticsPage = lazy(() => import("./modules/incidents/analytics/pages/IncidentAnalyticsPage"));
const IncidentInsightsPage = lazy(() => import("./modules/incidents/analytics/pages/IncidentInsightsPage"));
const IncidentKanbanPage = lazy(() => import("./modules/incidents/kanban/pages/IncidentKanbanPage"));

// Test Management Module
import { 
  TestManagementLayout,
  TestCasesPage,
  TestCaseEditorPage,
  TestCyclesPage,
  CycleDetailPage,
  TMDefectsPage,
  ReportsPage as TMReportsPage,
  TMSettingsPage,
  MyWorkPage,
  CommandCenterPage,
  ExecutionRunnerPage,
  ExecutionDashboardPage,
  AnalyticsDashboardPage,
  TMRequirementsPage
} from "./modules/test-management";
import { TestManagementContent } from "./modules/test-management/layouts/TestManagementContent";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <NavigationProvider>
          <ProcessStepsProvider>
          <CatalystToastProvider position="top-right" maxToasts={5}>
            <TooltipProvider>
              <BrowserRouter>
              <Routes>
<Route path="/" element={<Navigate to="/for-you" replace />} />
              <Route path="/auth" element={<CatalystLoginPage />} />
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
              <Route path="/strategy-room" element={<StrategyRoom />} />
              <Route path="/enterprise/strategy-room" element={<StrategyRoomPage />} />
              <Route path="/enterprise/strategy-room/capacity" element={<Suspense fallback={<div className="p-8">Loading...</div>}><CapacityPlannerPage /></Suspense>} />
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
              <Route path="/program/:programId/program-board" element={<ProgramBoardWithSidebar />} />
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
              
              {/* Planner */}
              <Route path="/planner" element={<Navigate to="/planner/boards" replace />} />
              <Route path="/planner/:tab" element={<WorkManager />} />
              
              
              {/* Mining */}
              <Route path="/mining" element={<MiningComingSoon />} />
              
{/* Product (Industry routes moved outside CatalystShell) */}
<Route path="/product/room" element={<ProductRoomPage />} />
<Route path="/product/:productId/room" element={<ProductRoomPage />} />
<Route path="/product/capacity" element={<CapacityPlanningPage />} />
<Route path="/product/ef-designer" element={<EFDesignerPage />} />
              
              {/* Enterprise More Items */}
              <Route path="/enterprise/ideation" element={<EnterpriseComingSoon />} />
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
              <Route path="/programs/:programId/program-board" element={<ProgramBoardWithSidebar />} />
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
              <Route path="/programs/:programId/program-board" element={<ProgramBoardWithSidebar />} />
              <Route path="/programs/:programId/objective-tree" element={<OKRHub />} />
              <Route path="/programs/:programId/work-tree" element={<WorkTreePage />} />
              <Route path="/programs/:programId/backlog" element={<BacklogWithSidebar />} />
              <Route path="/programs/:programId/roadmaps" element={<ProgramRoadmapPage />} />
              <Route path="/programs/:programId/program-roadmap" element={<ProgramRoadmapPage />} />
              <Route path="/programs/:programId/dependencies" element={<DependenciesPage />} />
              <Route path="/programs/:programId/forecast" element={<PlaceholderPage />} />
              <Route path="/programs/:programId/capacity" element={<CapacityWithSidebar />} />
              <Route path="/programs/:programId/increments" element={<PlaceholderPage />} />
              <Route path="/programs/:programId/epics" element={<Epics />} />
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
              <Route path="/releases" element={<Releases />} />
              
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
              
              {/* Test Management Module Routes */}
              <Route path="/tests" element={<TestManagementContent />}>
                <Route index element={<Navigate to="/tests/command-center" replace />} />
                <Route path="command-center" element={<CommandCenterPage />} />
                <Route path="my-work" element={<MyWorkPage />} />
                <Route path="cases" element={<TestCasesPage />} />
                <Route path="cycles" element={<TestCyclesPage />} />
                <Route path="cycles/:cycleId" element={<CycleDetailPage />} />
                <Route path="execution" element={<ExecutionDashboardPage />} />
                <Route path="defects" element={<TMDefectsPage />} />
                <Route path="requirements" element={<TMRequirementsPage />} />
                <Route path="reports" element={<AnalyticsDashboardPage />} />
                <Route path="settings" element={<TMSettingsPage />} />
              </Route>
              
              {/* Test Case Editor - Full Screen (outside shell) */}
              <Route path="/tests/cases/:caseId/edit" element={<ProtectedRoute><TestCaseEditorPage /></ProtectedRoute>} />
              
              {/* Execution Runner - Full Screen (outside shell) */}
              <Route path="/tests/execution/:cycleId" element={<ProtectedRoute><ExecutionRunnerPage /></ProtectedRoute>} />
              <Route path="/tests/execution/:cycleId/:scopeId" element={<ProtectedRoute><ExecutionRunnerPage /></ProtectedRoute>} />
              
              {/* Release Management Routes - LOCKED FOR UAT */}
              <Route path="/release" element={<Navigate to="/release/incidents" replace />} />
              <Route path="/release/overview" element={<ReleaseOverview />} />
              
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
              <Route path="/release/versions" element={<VersionsList />} />
              <Route path="/release/versions/calendar" element={<ReleaseCalendar />} />
              <Route path="/release/versions/:id" element={<VersionDetail />} />
              <Route path="/release/calendar" element={<ReleaseCalendarFSC />} />
              <Route path="/release/change-calendar" element={<ReleaseCalendarFSC />} />
              <Route path="/release/settings" element={<ReleaseSettings />} />
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
                <Route path="users" element={<Users />} />
                <Route path="roles-permissions" element={<RolesPermissions />} />
                <Route path="team-roles" element={<TeamRoles />} />
                <Route path="system-roles" element={<SystemRoles />} />
                <Route path="theme-groups" element={<ThemeGroups />} />
                <Route path="programs" element={<Programs />} />
                <Route path="portfolios" element={<Portfolios />} />
                <Route path="departments" element={<Departments />} />
                <Route path="capacity-departments" element={<Suspense fallback={<div>Loading...</div>}><CapacityDepartmentsPage /></Suspense>} />
                <Route path="resource-assignments" element={<Suspense fallback={<div>Loading...</div>}><ResourceAssignmentsPage /></Suspense>} />
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
                <Route path="resourceinventory" element={<ResourceInventory />} />
                <Route path="developmentinventory" element={<DevelopmentInventory />} />
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
              </Route>

              <Route path="/items/epics/:epicId/status-report" element={<EpicStatusReport />} />
              <Route path="/items/epics/:epicId/trace" element={<EpicTraceReport />} />
              <Route path="/items/epics/:epicId/requirement-hierarchy" element={<EpicRequirementHierarchy />} />
              <Route path="/reports-discovery" element={<AdminGuard><ReportsDiscovery /></AdminGuard>} />
              <Route path="/pi-wizard" element={<AdminGuard><PIWizard /></AdminGuard>} />
              <Route path="/jira-integration" element={<AdminGuard><JiraIntegration /></AdminGuard>} />
              <Route path="/value-stream" element={<ValueStreamView />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/items/:type" element={<PlaceholderPage />} />
              <Route path="/dev/self-test" element={<SelfTest />} />
              <Route path="/dev/epic-backlog-tests" element={<EpicBacklogTests />} />
              <Route path="/dev/forecast-self-test" element={<ForecastSelfTest />} />
              <Route path="/dev/teams-self-test" element={<TeamsSelfTest />} />
              <Route path="/dev/notifications-self-test" element={<NotificationsSelfTest />} />
              <Route path="/dev/portfolio-theme-self-test" element={<PortfolioThemeSelfTest />} />
              <Route path="/dev/program-board-self-test" element={<ProgramBoardSelfTest />} />
              <Route path="/dev/sources" element={<SourcesReference />} />
              <Route path="/dev/toast-demo" element={<ToastDemo />} />
              
              {/* QA Tools */}
              <Route path="/qa/dark-mode-gate" element={<DarkModeGatePage />} />
              <Route path="/ui/qa" element={<UIQARoute />} />
              <Route path="/theme-audit" element={<ThemeAuditProbe />} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
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
