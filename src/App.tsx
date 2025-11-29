import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./lib/auth";
import { NavigationProvider } from "./contexts/NavigationContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { JiraAlignShell } from "./components/layout/JiraAlignShell";
import Auth from "./pages/Auth";
import Home from "./pages/jira-align/Home";
import PortfolioRoomPageOld from "./pages/jira-align/PortfolioRoomPage";
import PortfolioRoomPage from "./pages/PortfolioRoomPage";
import PortfolioBacklog from "./pages/PortfolioBacklog";
import PlaceholderPage from "./pages/jira-align/PlaceholderPage";
import StrategyRoom from "./pages/StrategyRoom";
import StrategyRoomPage from "./pages/enterprise/StrategyRoomPage";
import { StrategyRoomNew } from "./pages/enterprise/StrategyRoomNew";
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
import EpicBacklog from "./pages/EpicBacklog";
import EpicBacklogWithSidebar from "./pages/EpicBacklogWithSidebar";
import Features from "./pages/Features";
import FeaturesPage from "./pages/items/FeaturesPage";
import FeaturesBacklog from "./pages/FeaturesBacklog";
import FeaturePrioritizationView from "./pages/items/FeaturePrioritizationView";
import Capabilities from "./pages/Capabilities";
import Defects from "./pages/Defects";
import Tasks from "./pages/Tasks";
import Ideation from "./pages/Ideation";
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
import ROAMBoard from "./pages/ROAMBoard";
import CapacityPlanning from "./pages/CapacityPlanning";
import Forecast from "./pages/Forecast";
import TeamRoom from "./pages/TeamRoom";
import SprintBoard from "./pages/SprintBoard";
import Backlog from "./pages/Backlog";
import BacklogPage from "./pages/BacklogPage";
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
import EnterpriseCapabilities from "./pages/enterprise/EnterpriseCapabilities";
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
import SelfTest from "./pages/dev/SelfTest";
import EpicBacklogTests from "./pages/dev/EpicBacklogTests";
import ForecastSelfTest from "./pages/dev/ForecastSelfTest";
import SourcesReference from "./pages/dev/SourcesReference";

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
              
              {/* All Routes - Jira Align Style */}
              <Route element={<ProtectedRoute><JiraAlignShell /></ProtectedRoute>}>
              <Route path="/home" element={<Home />} />
              <Route path="/portfolio-room" element={<PortfolioRoomPageOld />} />
              <Route path="/portfolio/:portfolioId/room" element={<PortfolioRoomPage />} />
              <Route path="/portfolio/:portfolioId/epics" element={<EpicsPage />} />
              <Route path="/portfolio/:portfolioId/backlog" element={<PortfolioBacklog />} />
              <Route path="/portfolio/:portfolioId/roadmaps" element={<PlaceholderPage />} />
              <Route path="/portfolio/:portfolioId/objective-tree" element={<PlaceholderPage />} />
              <Route path="/portfolio/:portfolioId/work-tree" element={<PlaceholderPage />} />
              <Route path="/portfolio/:portfolioId/forecast" element={<Forecast />} />
              <Route path="/portfolio/:portfolioId/capacity" element={<PlaceholderPage />} />
              <Route path="/portfolio/:portfolioId/programs" element={<PlaceholderPage />} />
              <Route path="/strategy-room" element={<StrategyRoom />} />
              <Route path="/enterprise/strategy-room" element={<StrategyRoomNew />} />
              <Route path="/enterprise/snapshots" element={<StrategicSnapshots />} />
              <Route path="/enterprise/backlog" element={<StrategicBacklog />} />
              <Route path="/enterprise/okr-heatmap" element={<OKRHeatmap />} />
              <Route path="/enterprise/okr-tree" element={<OKRTree />} />
              <Route path="/enterprise/okr-hub" element={<OKRHub />} />
              <Route path="/portfolio/:portfolioId/okr-hub" element={<PortfolioOKRHub />} />
              <Route path="/program/:programId/okr-hub" element={<ProgramOKRHub />} />
              <Route path="/team/:teamId/okr-hub" element={<TeamOKRHub />} />
              <Route path="/enterprise/roadmaps" element={<RoadmapsPage />} />
              
              {/* Enterprise More Items */}
              <Route path="/enterprise/ideation" element={<EnterpriseIdeation />} />
              <Route path="/enterprise/risks" element={<EnterpriseRisks />} />
              <Route path="/enterprise/impediments" element={<EnterpriseImpediments />} />
              <Route path="/enterprise/epics" element={<EnterpriseEpics />} />
              <Route path="/enterprise/capabilities" element={<EnterpriseCapabilities />} />
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
              <Route path="/items/capabilities" element={<Capabilities />} />
              <Route path="/items/defects" element={<Defects />} />
              <Route path="/items/tasks" element={<Tasks />} />
              <Route path="/items/ideation" element={<Ideation />} />
              <Route path="/items/impediments" element={<Impediments />} />
              <Route path="/items/release-vehicles" element={<ReleaseVehicles />} />
              <Route path="/items/success-criteria" element={<SuccessCriteria />} />
              <Route path="/portfolio-kanban" element={<PortfolioKanban />} />
          <Route path="/portfolio-roadmap" element={<PortfolioRoadmap />} />
          <Route path="/roadmaps" element={<Roadmaps />} />
              <Route path="/dependencies" element={<DependenciesPage />} />
              <Route path="/portfolio-insights" element={<PortfolioInsights />} />
              <Route path="/programs/:programId/room" element={<ProgramRoom />} />
              <Route path="/programs/:programId/features" element={<FeaturesWithSidebar />} />
              <Route path="/programs/:programId/backlog" element={<BacklogWithSidebar />} />
              <Route path="/programs/:programId/roadmaps" element={<RoadmapsWithSidebar />} />
              <Route path="/programs/:programId/objective-tree" element={<ProgramOKRHub />} />
              <Route path="/programs/:programId/work-tree" element={<PlaceholderPage />} />
              <Route path="/programs/:programId/program-board" element={<ProgramBoardWithSidebar />} />
              <Route path="/programs/:programId/forecast" element={<ForecastWithSidebar />} />
              <Route path="/programs/:programId/capacity" element={<CapacityWithSidebar />} />
              <Route path="/programs/:programId/settings" element={<PlaceholderPage />} />
              <Route path="/program-room" element={<Navigate to="/home" replace />} />
              <Route path="/pis" element={<ProgramIncrements />} />
              <Route path="/programs/:programId/program-board" element={<ProgramBoardWithSidebar />} />
              <Route path="/program-board" element={<Navigate to="/home" replace />} />
              <Route path="/programs/program-board" element={<Navigate to="/home" replace />} />
              <Route path="/programs/program-board/history" element={<ProgramBoardHistory />} />
              <Route path="/pi-objectives" element={<PIObjectives />} />
              <Route path="/roam" element={<ROAMBoard />} />
              <Route path="/capacity" element={<CapacityPlanning />} />
              <Route path="/release-train-calendar" element={<div className="p-8"><h1 className="text-2xl font-bold">Release Calendar</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/program-backlog" element={<div className="p-8"><h1 className="text-2xl font-bold">Program Backlog</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/team-room" element={<TeamRoom />} />
              <Route path="/backlog" element={<Backlog />} />
              <Route path="/backlog-phase2" element={<BacklogPage />} />
              <Route path="/sprints" element={<Sprints />} />
              <Route path="/sprint-board" element={<SprintBoard />} />
              <Route path="/work-items/stories" element={<Stories />} />
              <Route path="/work-items/subtasks" element={<Subtasks />} />
              <Route path="/releases" element={<Releases />} />
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
