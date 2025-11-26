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
import PortfolioRoomPage from "./pages/jira-align/PortfolioRoomPage";
import PlaceholderPage from "./pages/jira-align/PlaceholderPage";
import StrategyRoom from "./pages/StrategyRoom";
import Themes from "./pages/Themes";
import Initiatives from "./pages/Initiatives";
import Epics from "./pages/Epics";
import Features from "./pages/Features";
import PortfolioKanban from "./pages/PortfolioKanban";
import PortfolioRoadmap from "./pages/PortfolioRoadmap";
import Dependencies from "./pages/Dependencies";
import PortfolioInsights from "./pages/PortfolioInsights";
import ProgramRoom from "./pages/ProgramRoom";
import ProgramBoard from "./pages/ProgramBoard";
import ProgramIncrements from "./pages/ProgramIncrements";
import PIObjectives from "./pages/PIObjectives";
import ROAMBoard from "./pages/ROAMBoard";
import CapacityPlanning from "./pages/CapacityPlanning";
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
              <Route path="/portfolio-room" element={<PortfolioRoomPage />} />
              <Route path="/strategy-room" element={<StrategyRoom />} />
              <Route path="/themes" element={<Themes />} />
              <Route path="/initiatives" element={<Initiatives />} />
              <Route path="/epics" element={<Epics />} />
              <Route path="/features" element={<Features />} />
              <Route path="/portfolio-kanban" element={<PortfolioKanban />} />
              <Route path="/portfolio-roadmap" element={<PortfolioRoadmap />} />
              <Route path="/dependencies" element={<Dependencies />} />
              <Route path="/portfolio-insights" element={<PortfolioInsights />} />
              <Route path="/program-room" element={<ProgramRoom />} />
              <Route path="/pis" element={<ProgramIncrements />} />
              <Route path="/program-board" element={<ProgramBoard />} />
              <Route path="/pi-objectives" element={<PIObjectives />} />
              <Route path="/roam" element={<ROAMBoard />} />
              <Route path="/capacity" element={<CapacityPlanning />} />
              <Route path="/release-train-calendar" element={<div className="p-8"><h1 className="text-2xl font-bold">Release Calendar</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/program-backlog" element={<div className="p-8"><h1 className="text-2xl font-bold">Program Backlog</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/team-room" element={<TeamRoom />} />
              <Route path="/backlog" element={<Backlog />} />
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
              <Route path="/reports-discovery" element={<AdminGuard><ReportsDiscovery /></AdminGuard>} />
              <Route path="/pi-wizard" element={<AdminGuard><PIWizard /></AdminGuard>} />
              <Route path="/jira-integration" element={<AdminGuard><JiraIntegration /></AdminGuard>} />
              <Route path="/value-stream" element={<ValueStreamView />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/items/:type" element={<PlaceholderPage />} />
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
