import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./lib/auth";
import { NavigationProvider } from "./contexts/NavigationContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { CatalystShell } from "./components/layout/CatalystShell";
import Auth from "./pages/Auth";
import Home from "./pages/jira-align/Home";
import PortfolioRoomPageOld from "./pages/jira-align/PortfolioRoomPage";
import PortfolioRoomPage from "./pages/PortfolioRoomPage";
import PortfolioBacklog from "./pages/PortfolioBacklog";
import PlaceholderPage from "./pages/jira-align/PlaceholderPage";
import StrategyRoom from "./pages/StrategyRoom";
import StrategyRoomPage from "./pages/enterprise/StrategyRoomPage";
import Themes from "./pages/Themes";
import ThemesGrid from "./pages/ThemesGrid";
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
import PortfolioInsights from "./pages/PortfolioInsights";
import ProgramRoom from "./pages/ProgramRoom";
import ProgramBoardNew from "./pages/ProgramBoardNew";
import ProgramBoardWithSidebar from "./pages/ProgramBoardWithSidebar";
import ProgramBoardOld from "./pages/ProgramBoard";
import ProgramBoardHistory from "./pages/ProgramBoardHistory";
import ForecastWithSidebar from "./pages/program/ForecastWithSidebar";
import CapacityWithSidebar from "./pages/program/CapacityWithSidebar";
import BacklogWithSidebar from "./pages/program/BacklogWithSidebar";
import RoadmapsWithSidebar from "./pages/program/RoadmapsWithSidebar";
import FeaturesWithSidebar from "./pages/program/FeaturesWithSidebar";
import ProgramIncrements from "./pages/ProgramIncrements";
import PIObjectives from "./pages/PIObjectives";
import CapacityPlanning from "./pages/CapacityPlanning";
import Forecast from "./pages/Forecast";
import WorkSpendGrid from "./pages/WorkSpendGrid";
import RisksGridPage from "./pages/risks/RisksGridPage";
import RiskRoamReportPage from "./pages/risks/RiskRoamReportPage";
import TeamRoom from "./pages/TeamRoom";
import TeamRoomDetail from "./pages/TeamRoomDetail";
import TeamsDirectory from "./pages/TeamsDirectory";
import SprintBoard from "./pages/SprintBoard";
import Backlog from "./pages/Backlog";
import BacklogPage from "./pages/BacklogPage";
import Sprints from "./pages/Sprints";
import Stories from "./pages/Stories";
import Subtasks from "./pages/Subtasks";
import Releases from "./pages/Releases";
import TeamBacklog from "./pages/team/TeamBacklog";
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
import Cities from "./pages/admin/Cities";
import Customers from "./pages/admin/Customers";
import CostCenters from "./pages/admin/CostCenters";
import Countries from "./pages/admin/Countries";
import BusinessUnits from "./pages/admin/BusinessUnits";
import Regions from "./pages/admin/Regions";
import ThemeGroups from "./pages/admin/ThemeGroups";
import Teams from "./pages/admin/Teams";
import Programs from "./pages/admin/Programs";
import Portfolios from "./pages/admin/Portfolios";
import Estimation from "./pages/admin/Estimation";
import Security from "./pages/admin/Security";
import ActivityLog from "./pages/admin/ActivityLog";
import UserRoles from "./pages/admin/UserRoles";
import ReportsDiscovery from "./pages/admin/ReportsDiscovery";
import PIWizard from "./pages/admin/PIWizard";
import JiraIntegration from "./pages/admin/JiraIntegration";
import ValueStreamView from "./pages/ValueStreamView";
import UserProfile from "./pages/UserProfile";
import ProgramInsights from "./pages/insights/ProgramInsights";
import TeamInsights from "./pages/insights/TeamInsights";
import Predictability from "./pages/insights/Predictability";
import DependencyRisk from "./pages/insights/DependencyRisk";
import NotFound from "./pages/NotFound";
import { AdminGuard } from "./components/admin/AdminGuard";
import OKRHeatmap from "./pages/enterprise/OKRHeatmap";
import OKRTree from "./pages/enterprise/OKRTree";
import OKRHub from "./pages/enterprise/OKRHub";
import { OKRHub as PortfolioOKRHub } from "./pages/portfolio/OKRHub";
import { OKRHub as ProgramOKRHub } from "./pages/program/OKRHub";
import { OKRHub as TeamOKRHub } from "./pages/team/OKRHub";
import RoadmapsPage from "./pages/enterprise/Roadmaps";
import StrategicSnapshots from "./pages/enterprise/StrategicSnapshots";
import StrategicBacklog from "./pages/enterprise/StrategicBacklog";
import EnterpriseEpics from "./pages/enterprise/EnterpriseEpics";
import { WorkTreePage } from "./pages/work-tree";

import EnterpriseFeatures from "./pages/enterprise/EnterpriseFeatures";
import EnterpriseStories from "./pages/enterprise/EnterpriseStories";
import EnterpriseDefects from "./pages/enterprise/EnterpriseDefects";
import EnterpriseTasks from "./pages/enterprise/EnterpriseTasks";
import EnterpriseObjectives from "./pages/enterprise/EnterpriseObjectives";
import EnterpriseDependencies from "./pages/enterprise/EnterpriseDependencies";
import EnterpriseSprints from "./pages/enterprise/EnterpriseSprints";
import EnterpriseProgramIncrements from "./pages/enterprise/EnterpriseProgramIncrements";
import EnterpriseReleaseVehicles from "./pages/enterprise/EnterpriseReleaseVehicles";
import EnterpriseSuccessCriteria from "./pages/enterprise/EnterpriseSuccessCriteria";
import EnterpriseRisks from "./pages/enterprise/EnterpriseRisks";
import EnterpriseIdeation from "./pages/enterprise/EnterpriseIdeation";
import EnterpriseImpediments from "./pages/enterprise/EnterpriseImpediments";
import EnterpriseComingSoon from "./pages/enterprise/ComingSoon";
import BusinessRequests from "./pages/enterprise/BusinessRequests";
import MiningComingSoon from "./pages/enterprise/MiningComingSoon";
import IndustryPage from "./pages/enterprise/IndustryPage";
import DemandSummaryPage from "./pages/enterprise/DemandSummaryPage";
import IndustryComingSoon from "./pages/enterprise/IndustryComingSoon";
import ExecutiveRoadmapPage from "./pages/enterprise/ExecutiveRoadmapPage";
import RequestAccess from "./pages/RequestAccess";
import TeamComingSoon from "./pages/team/ComingSoon";
import TeamStoriesPage from "./pages/team/TeamStoriesPage";
import SelfTest from "./pages/dev/SelfTest";
import EpicBacklogTests from "./pages/dev/EpicBacklogTests";
import ForecastSelfTest from "./pages/dev/ForecastSelfTest";
import TeamsSelfTest from "./pages/dev/TeamsSelfTest";
import NotificationsSelfTest from "./pages/dev/NotificationsSelfTest";
import PortfolioThemeSelfTest from "./pages/dev/PortfolioThemeSelfTest";
import ProgramBoardSelfTest from "./pages/dev/ProgramBoardSelfTest";
import SourcesReference from "./pages/dev/SourcesReference";
import { TestCasesPage } from "./pages/TestCasesPage";
import { TestCaseDetailPage } from "./pages/TestCaseDetailPage";
import { TestCyclesPage } from "./pages/TestCyclesPage";
import { TestSetsPage } from "./pages/TestSetsPage";
import { TestReportsPage } from "./pages/TestReportsPage";
import CycleDetailPage from "./pages/CycleDetailPage";
import ExecutionGridPage from "./pages/ExecutionGridPage";
import TestStepLibraryPage from "./pages/TestStepLibraryPage";
import TestOverviewPage from "./pages/TestOverviewPage";
import TestManagementSettingsPage from "./pages/settings/TestManagementSettingsPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import KanbanBoardsPage from "./pages/KanbanBoardsPage";
import KanbanBoardView from "./pages/KanbanBoardView";
import KanbanBoardSetup from "./pages/KanbanBoardSetup";
import KanbanBoardAnalytics from "./pages/KanbanBoardAnalytics";
import KnowledgeHubDocumentPage from "./pages/KnowledgeHubDocumentPage";
import KnowledgeHubPage from "./pages/KnowledgeHubPage";
import KnowledgeHubSpacePage from "./pages/KnowledgeHubSpacePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <NavigationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/request-access" element={<RequestAccess />} />
              
              {/* All Routes - Catalyst Style */}
              <Route element={<ProtectedRoute><CatalystShell /></ProtectedRoute>}>
              <Route path="/home" element={<Home />} />
              <Route path="/portfolio-room" element={<PortfolioRoomPageOld />} />
              <Route path="/portfolio/:portfolioId/room" element={<PortfolioRoomPage />} />
              <Route path="/portfolio/:portfolioId/epics" element={<EpicsPage />} />
              <Route path="/portfolio/:portfolioId/backlog" element={<EpicBacklogWithSidebar />} />
              <Route path="/portfolio/:portfolioId/roadmaps" element={<PlaceholderPage />} />
              <Route path="/portfolio/:portfolioId/objective-tree" element={<PortfolioOKRHub />} />
              <Route path="/portfolio/:portfolioId/work-tree" element={<WorkTreePage />} />
              <Route path="/portfolio/:portfolioId/forecast" element={<Forecast />} />
              <Route path="/portfolio/:portfolioId/capacity" element={<PlaceholderPage />} />
              <Route path="/portfolio/:portfolioId/programs" element={<PlaceholderPage />} />
              <Route path="/strategy-room" element={<StrategyRoom />} />
              <Route path="/enterprise/strategy-room" element={<StrategyRoomPage />} />
              <Route path="/enterprise/snapshots" element={<StrategicSnapshots />} />
              <Route path="/enterprise/backlog" element={<StrategicBacklog />} />
              <Route path="/enterprise/okr-heatmap" element={<OKRHeatmap />} />
              <Route path="/enterprise/okr-tree" element={<OKRTree />} />
              <Route path="/enterprise/okr-hub" element={<OKRHub />} />
              <Route path="/portfolio/:portfolioId/okr-hub" element={<PortfolioOKRHub />} />
              <Route path="/program/:programId/okr-hub" element={<ProgramOKRHub />} />
              <Route path="/program/:programId/work-tree" element={<WorkTreePage />} />
              <Route path="/program/:programId/room" element={<ProgramRoom />} />
              <Route path="/program/:programId/features" element={<FeaturesWithSidebar />} />
              <Route path="/program/:programId/program-board" element={<ProgramBoardWithSidebar />} />
              <Route path="/team/:teamId/okr-hub" element={<TeamOKRHub />} />
              <Route path="/enterprise/roadmaps" element={<RoadmapsPage />} />
              <Route path="/work-tree" element={<WorkTreePage />} />
              <Route path="/enterprise/work-tree" element={<WorkTreePage />} />
              <Route path="/enterprise/kanban-boards" element={<KanbanBoardsPage />} />
              
              
              {/* Mining */}
              <Route path="/mining" element={<MiningComingSoon />} />
              
              {/* Industry */}
              <Route path="/industry" element={<IndustryPage />} />
              <Route path="/industry/demand-summary" element={<DemandSummaryPage />} />
              <Route path="/industry/roadmaps" element={<ExecutiveRoadmapPage />} />
              <Route path="/industry/reports" element={<IndustryComingSoon />} />
              
              {/* Enterprise More Items */}
              <Route path="/enterprise/ideation" element={<EnterpriseIdeation />} />
              <Route path="/enterprise/risks" element={<EnterpriseRisks />} />
              <Route path="/enterprise/impediments" element={<EnterpriseImpediments />} />
              <Route path="/enterprise/epics" element={<EnterpriseEpics />} />
              
              <Route path="/enterprise/features" element={<EnterpriseFeatures />} />
              <Route path="/enterprise/stories" element={<EnterpriseStories />} />
              <Route path="/enterprise/defects" element={<EnterpriseDefects />} />
              <Route path="/enterprise/tasks" element={<EnterpriseTasks />} />
              <Route path="/enterprise/objectives" element={<EnterpriseObjectives />} />
              <Route path="/enterprise/dependencies" element={<EnterpriseDependencies />} />
              <Route path="/enterprise/sprints" element={<EnterpriseSprints />} />
              <Route path="/enterprise/program-increments" element={<EnterpriseProgramIncrements />} />
              <Route path="/enterprise/release-vehicles" element={<EnterpriseReleaseVehicles />} />
              <Route path="/enterprise/success-criteria" element={<EnterpriseSuccessCriteria />} />
              
              {/* Enterprise More Items - Placeholder Routes */}
              <Route path="/enterprise/brainstorming" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/innovation" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/canvas" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/mind-maps" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/competitors" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/goals" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/vision" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/personas" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/skills-inventory" element={<EnterpriseComingSoon />} />
              
              {/* Enterprise Reports - Placeholder Routes */}
              <Route path="/enterprise/reports/assessment" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/reports/assessment-results" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/reports/cumulative-effort" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/reports/strategic-balancing" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/reports/folios" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/reports/external" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/reports/organizational-hierarchy" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/reports/work-tree" element={<WorkTreePage />} />
              <Route path="/enterprise/reports/demand-capacity" element={<EnterpriseComingSoon />} />
              
              {/* Enterprise More Pages - Placeholder Routes */}
              <Route path="/enterprise/pages/assessments" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/pages/definition-of-done" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/pages/framework-maps" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/pages/lean-process" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/pages/metrics" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/pages/meetings" element={<EnterpriseComingSoon />} />
              <Route path="/enterprise/pages/story-point-progress" element={<EnterpriseComingSoon />} />
              
              <Route path="/themes" element={<Themes />} />
              <Route path="/themes/grid" element={<ThemesGrid />} />
              <Route path="/portfolio/:portfolioId/themes" element={<ThemesGrid />} />
              <Route path="/initiatives" element={<Initiatives />} />
              <Route path="/epics" element={<Navigate to="/items/epics" replace />} />
              <Route path="/backlog/epics" element={<Navigate to="/items/epics" replace />} />
            <Route path="/features" element={<FeaturesBacklog />} />
            <Route path="/features/prioritization" element={<FeaturePrioritizationView />} />
              <Route path="/items/epics" element={<EpicsPage />} />
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
              <Route path="/work-spend-grid" element={<WorkSpendGrid />} />
              <Route path="/portfolio-insights" element={<PortfolioInsights />} />
              <Route path="/programs/:programId/room" element={<ProgramRoom />} />
              <Route path="/programs/:programId/features" element={<FeaturesWithSidebar />} />
              <Route path="/programs/:programId/backlog" element={<BacklogWithSidebar />} />
              <Route path="/programs/:programId/roadmaps" element={<RoadmapsWithSidebar />} />
              <Route path="/programs/:programId/objective-tree" element={<ProgramOKRHub />} />
              <Route path="/programs/:programId/work-tree" element={<WorkTreePage />} />
              <Route path="/programs/:programId/program-board" element={<ProgramBoardWithSidebar />} />
              <Route path="/programs/:programId/forecast" element={<ForecastWithSidebar />} />
              <Route path="/programs/:programId/capacity" element={<CapacityWithSidebar />} />
              <Route path="/programs/:programId/settings" element={<PlaceholderPage />} />
              <Route path="/program-room" element={<Navigate to="/home" replace />} />
              <Route path="/pis" element={<ProgramIncrements />} />
              <Route path="/program-board" element={<Navigate to="/home" replace />} />
              <Route path="/programs/program-board" element={<Navigate to="/home" replace />} />
              <Route path="/programs/program-board/history" element={<ProgramBoardHistory />} />
              <Route path="/pi-objectives" element={<PIObjectives />} />
              <Route path="/capacity" element={<CapacityPlanning />} />
              <Route path="/risks" element={<RisksGridPage />} />
              <Route path="/risk-roam-report" element={<RiskRoamReportPage />} />
              <Route path="/release-train-calendar" element={<div className="p-8"><h1 className="text-2xl font-bold">Release Calendar</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/program-backlog" element={<div className="p-8"><h1 className="text-2xl font-bold">Program Backlog</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/teams" element={<TeamsDirectory />} />
              <Route path="/teams/:teamId/room" element={<TeamRoomDetail />} />
              <Route path="/teams/:teamId/work-tree" element={<WorkTreePage />} />
              <Route path="/teams/:teamId/backlog" element={<TeamBacklog />} />
              <Route path="/teams/:teamId/board" element={<TeamComingSoon />} />
              <Route path="/teams/:teamId/objective-tree" element={<TeamOKRHub />} />
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
              <Route path="/teams/:teamId/kanban-boards" element={<KanbanBoardsPage />} />

              {/* Portfolio Routes with :portfolioId */}
              <Route path="/portfolio/:portfolioId/room" element={<PortfolioRoomPage />} />
              <Route path="/portfolio/:portfolioId/objective-tree" element={<PortfolioOKRHub />} />
              <Route path="/portfolio/:portfolioId/work-tree" element={<WorkTreePage />} />
              <Route path="/portfolio/:portfolioId/backlog" element={<PortfolioBacklog />} />
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
              <Route path="/portfolio/:portfolioId/program-increments" element={<ProgramIncrements />} />
              <Route path="/portfolio/:portfolioId/release-vehicles" element={<ReleaseVehicles />} />
              <Route path="/portfolio/:portfolioId/reports/epic-status" element={<EpicStatusReport />} />
              <Route path="/portfolio/:portfolioId/reports/epic-trace" element={<EpicTraceReport />} />
              <Route path="/portfolio/:portfolioId/reports/feature-status" element={<TeamComingSoon />} />
              <Route path="/portfolio/:portfolioId/reports/health" element={<TeamComingSoon />} />
              <Route path="/portfolio/:portfolioId/reports/work-tree" element={<WorkTreePage />} />
              <Route path="/portfolio/:portfolioId/pages/assessments" element={<TeamComingSoon />} />
              <Route path="/portfolio/:portfolioId/pages/metrics" element={<TeamComingSoon />} />
              <Route path="/portfolio/:portfolioId/pages/meetings" element={<TeamComingSoon />} />
              <Route path="/portfolio/:portfolioId/kanban-boards" element={<KanbanBoardsPage />} />

              {/* Program Routes with :programId */}
              <Route path="/programs/:programId/room" element={<ProgramRoom />} />
              <Route path="/programs/:programId/program-board" element={<ProgramBoardWithSidebar />} />
              <Route path="/programs/:programId/objective-tree" element={<ProgramOKRHub />} />
              <Route path="/programs/:programId/work-tree" element={<WorkTreePage />} />
              <Route path="/programs/:programId/backlog" element={<BacklogWithSidebar />} />
              <Route path="/programs/:programId/roadmaps" element={<RoadmapsWithSidebar />} />
              <Route path="/programs/:programId/dependencies" element={<DependenciesPage />} />
              <Route path="/programs/:programId/forecast" element={<ForecastWithSidebar />} />
              <Route path="/programs/:programId/capacity" element={<CapacityWithSidebar />} />
              <Route path="/programs/:programId/increments" element={<ProgramIncrements />} />
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
              <Route path="/programs/:programId/kanban-boards" element={<KanbanBoardsPage />} />
              <Route path="/programs/:programId/pages/assessments" element={<TeamComingSoon />} />
              <Route path="/programs/:programId/pages/metrics" element={<TeamComingSoon />} />
              <Route path="/programs/:programId/pages/meetings" element={<TeamComingSoon />} />
              
              <Route path="/team/:teamId/room" element={<TeamRoomDetail />} />
              
              {/* Team Routes - Placeholder Routes */}
              <Route path="/team/:teamId/backlog" element={<TeamBacklog />} />
              <Route path="/team/:teamId/stories" element={<TeamStoriesPage />} />
              <Route path="/team/:teamId/roadmaps" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/objective-tree" element={<TeamOKRHub />} />
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
              <Route path="/team/:teamId/kanban-boards" element={<KanbanBoardsPage />} />
              
              {/* Team More Pages - Placeholder Routes */}
              <Route path="/team/:teamId/pages/assessments" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/pages/definition-of-done" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/pages/lean-process" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/pages/retrospectives" element={<TeamComingSoon />} />
              <Route path="/team/:teamId/pages/surveys" element={<TeamComingSoon />} />
              
              <Route path="/team-room" element={<TeamRoom />} />
              <Route path="/backlog" element={<Backlog />} />
              <Route path="/backlog-phase2" element={<BacklogPage />} />
              <Route path="/sprints" element={<Sprints />} />
              <Route path="/sprint-board" element={<SprintBoard />} />
              <Route path="/stories" element={<Stories />} />
              <Route path="/work-items/stories" element={<Stories />} />
              <Route path="/work-items/subtasks" element={<Subtasks />} />
              <Route path="/releases" element={<Releases />} />
              
              {/* Test Management Routes - Program Scoped */}
              <Route path="/programs/:programId/tests" element={<TestOverviewPage />} />
              <Route path="/programs/:programId/tests/overview" element={<TestOverviewPage />} />
              <Route path="/programs/:programId/tests/cases" element={<TestCasesPage />} />
              <Route path="/programs/:programId/tests/cases/:id" element={<TestCaseDetailPage />} />
              <Route path="/programs/:programId/tests/sets" element={<TestSetsPage />} />
              <Route path="/programs/:programId/tests/library" element={<TestStepLibraryPage />} />
              <Route path="/programs/:programId/tests/cycles" element={<TestCyclesPage />} />
              <Route path="/programs/:programId/tests/cycles/:cycleId" element={<CycleDetailPage />} />
              <Route path="/programs/:programId/tests/cycles/:cycleId/grid" element={<ExecutionGridPage />} />
              <Route path="/programs/:programId/tests/reports" element={<TestReportsPage />} />
              <Route path="/programs/:programId/tests/settings" element={<TestManagementSettingsPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              
              {/* Kanban Boards Routes - Team Scoped */}
              <Route path="/team/:teamId/kanban-boards" element={<KanbanBoardsPage />} />
              <Route path="/team/:teamId/kanban-boards/:boardId" element={<KanbanBoardView />} />
              <Route path="/team/:teamId/kanban-boards/:boardId/setup" element={<KanbanBoardSetup />} />
              <Route path="/team/:teamId/kanban-boards/:boardId/analytics" element={<KanbanBoardAnalytics />} />
              
              {/* Knowledge Hub Routes */}
              <Route path="/knowledge-hub" element={<KnowledgeHubPage />} />
              <Route path="/knowledge-hub/spaces/:spaceId" element={<KnowledgeHubSpacePage />} />
              <Route path="/knowledge-hub/documents/:documentId" element={<KnowledgeHubDocumentPage />} />
              
              {/* Kanban Boards Routes - Program Scoped */}
              <Route path="/programs/:programId/kanban-boards" element={<KanbanBoardsPage />} />
              <Route path="/programs/:programId/kanban-boards/:boardId" element={<KanbanBoardView />} />
              <Route path="/programs/:programId/kanban-boards/:boardId/setup" element={<KanbanBoardSetup />} />
              <Route path="/programs/:programId/kanban-boards/:boardId/analytics" element={<KanbanBoardAnalytics />} />
              
              <Route path="/insights/portfolio" element={<PortfolioInsights />} />
              <Route path="/insights/program" element={<ProgramInsights />} />
              <Route path="/insights/team" element={<TeamInsights />} />
              <Route path="/insights/predictability" element={<Predictability />} />
              <Route path="/insights/dependency-risk" element={<DependencyRisk />} />
              <Route path="/admin/org-setup" element={<AdminGuard><OrgSetup /></AdminGuard>} />
              <Route path="/admin/hierarchy" element={<AdminGuard><HierarchyConfig /></AdminGuard>} />
              <Route path="/admin/custom-fields" element={<AdminGuard><CustomFields /></AdminGuard>} />
              <Route path="/admin/boards" element={<AdminGuard><BoardConfig /></AdminGuard>} />
              <Route path="/admin/user-roles" element={<AdminGuard><UserRoles /></AdminGuard>} />
              <Route path="/admin/permissions" element={<AdminGuard><Permissions /></AdminGuard>} />
              <Route path="/admin/integrations" element={<AdminGuard><Integrations /></AdminGuard>} />
              <Route path="/admin/activity-log" element={<AdminGuard><ActivityLog /></AdminGuard>} />
              
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="activity" element={<Activity />} />
                <Route path="changes" element={<Changes />} />
                <Route path="changes-log" element={<ChangesLog />} />
                <Route path="use-trend" element={<UseTrend />} />
                <Route path="usage-trends" element={<UsageTrends />} />
                <Route path="work-codes" element={<WorkCodes />} />
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
                <Route path="team-roles" element={<TeamRoles />} />
                <Route path="system-roles" element={<SystemRoles />} />
                <Route path="cities" element={<Cities />} />
                <Route path="customers" element={<Customers />} />
                <Route path="cost-centers" element={<CostCenters />} />
                <Route path="countries" element={<Countries />} />
                <Route path="business-units" element={<BusinessUnits />} />
                <Route path="regions" element={<Regions />} />
                <Route path="theme-groups" element={<ThemeGroups />} />
                <Route path="teams" element={<Teams />} />
                <Route path="programs" element={<Programs />} />
                <Route path="portfolios" element={<Portfolios />} />
                <Route path="estimation" element={<Estimation />} />
                <Route path="security" element={<Security />} />
                <Route path="jira-config" element={<JiraIntegrationConfig />} />
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
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </NavigationProvider>
    </AuthProvider>
  </ThemeProvider>
  </QueryClientProvider>
);

export default App;
