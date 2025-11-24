import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import PortfolioRoom from "./pages/PortfolioRoom";
import StrategyRoom from "./pages/StrategyRoom";
import Themes from "./pages/Themes";
import Initiatives from "./pages/Initiatives";
import BusinessRequests from "./pages/BusinessRequests";
import Epics from "./pages/Epics";
import Features from "./pages/Features";
import PortfolioKanban from "./pages/PortfolioKanban";
import ProgramRoom from "./pages/ProgramRoom";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route path="/portfolio-room" element={<PortfolioRoom />} />
              <Route path="/strategy-room" element={<StrategyRoom />} />
              <Route path="/themes" element={<Themes />} />
              <Route path="/initiatives" element={<Initiatives />} />
              <Route path="/business-requests" element={<BusinessRequests />} />
              <Route path="/epics" element={<Epics />} />
              <Route path="/features" element={<Features />} />
              <Route path="/portfolio-kanban" element={<PortfolioKanban />} />
              <Route path="/portfolio-roadmap" element={<div className="p-8"><h1 className="text-2xl font-bold">Portfolio Roadmap</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/dependencies" element={<div className="p-8"><h1 className="text-2xl font-bold">Dependencies</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/portfolio-insights" element={<div className="p-8"><h1 className="text-2xl font-bold">Portfolio Insights</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/program-room" element={<ProgramRoom />} />
              <Route path="/pis" element={<div className="p-8"><h1 className="text-2xl font-bold">Program Increments</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/program-board" element={<div className="p-8"><h1 className="text-2xl font-bold">Program Board</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/roam" element={<div className="p-8"><h1 className="text-2xl font-bold">ROAM Board</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/capacity" element={<div className="p-8"><h1 className="text-2xl font-bold">Capacity Planning</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/release-train-calendar" element={<div className="p-8"><h1 className="text-2xl font-bold">Release Calendar</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/program-backlog" element={<div className="p-8"><h1 className="text-2xl font-bold">Program Backlog</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/team-room" element={<div className="p-8"><h1 className="text-2xl font-bold">Team Room</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/backlog" element={<div className="p-8"><h1 className="text-2xl font-bold">Backlog</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/sprints" element={<div className="p-8"><h1 className="text-2xl font-bold">Sprints</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/sprint-board" element={<div className="p-8"><h1 className="text-2xl font-bold">Sprint Board</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/work-items/stories" element={<div className="p-8"><h1 className="text-2xl font-bold">Stories</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/work-items/subtasks" element={<div className="p-8"><h1 className="text-2xl font-bold">Sub-tasks</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/releases" element={<div className="p-8"><h1 className="text-2xl font-bold">Releases</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/insights/portfolio" element={<div className="p-8"><h1 className="text-2xl font-bold">Portfolio Insights</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/insights/program" element={<div className="p-8"><h1 className="text-2xl font-bold">Program Insights</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/insights/team" element={<div className="p-8"><h1 className="text-2xl font-bold">Team Insights</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/insights/predictability" element={<div className="p-8"><h1 className="text-2xl font-bold">Predictability</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/insights/dependency-risk" element={<div className="p-8"><h1 className="text-2xl font-bold">Dependency Risk</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/admin/org-setup" element={<div className="p-8"><h1 className="text-2xl font-bold">Organization Setup</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/admin/hierarchy" element={<div className="p-8"><h1 className="text-2xl font-bold">Hierarchy Configuration</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/admin/custom-fields" element={<div className="p-8"><h1 className="text-2xl font-bold">Custom Fields</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/admin/boards" element={<div className="p-8"><h1 className="text-2xl font-bold">Board Configuration</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/admin/permissions" element={<div className="p-8"><h1 className="text-2xl font-bold">Permissions</h1><p className="text-muted-foreground">Coming soon</p></div>} />
              <Route path="/admin/integrations" element={<div className="p-8"><h1 className="text-2xl font-bold">Integrations</h1><p className="text-muted-foreground">Coming soon</p></div>} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
