/**
 * Portfolio Routes Shell — lazy-loaded
 * Handles /portfolio/:portfolioId/* routes
 */
import { lazy, Suspense } from 'react';
import { Routes, Route } from "react-router-dom";

const PlaceholderPage = lazy(() => import("../pages/jira-align/PlaceholderPage"));
const WorkTreePage = lazy(() => import("../pages/work-tree").then(m => ({ default: m.WorkTreePage })));
const EpicsPage = lazy(() => import("../pages/items/EpicsPage"));
const EpicBacklogWithSidebar = lazy(() => import("../pages/EpicBacklogWithSidebar"));
const EpicEstimationPage = lazy(() => import("../pages/items/EpicEstimationPage"));
const EpicStatusReport = lazy(() => import("../pages/items/reports/EpicStatusReport"));
const EpicTraceReport = lazy(() => import("../pages/items/reports/EpicTraceReport"));
const Themes = lazy(() => import("../pages/Themes"));
const Initiatives = lazy(() => import("../pages/Initiatives"));
const Features = lazy(() => import("../pages/Features"));
const Stories = lazy(() => import("../pages/Stories"));
const Defects = lazy(() => import("../pages/Defects"));
const Tasks = lazy(() => import("../pages/Tasks"));
const DependenciesPage = lazy(() => import("../pages/work/Dependencies"));
const RisksGridPage = lazy(() => import("../pages/risks/RisksGridPage"));
const Impediments = lazy(() => import("../pages/Impediments"));
const Sprints = lazy(() => import("../pages/Sprints"));
const ReleaseVehicles = lazy(() => import("../pages/ReleaseVehicles"));
const Forecast = lazy(() => import("../pages/Forecast"));
const CapacityPlanning = lazy(() => import("../pages/CapacityPlanningPage"));
const Roadmaps = lazy(() => import("../pages/Roadmaps"));
const TeamComingSoon = lazy(() => import("../pages/team/ComingSoon"));

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="p-8">Loading...</div>}>{children}</Suspense>
);

export function PortfolioRoutes() {
  return (
    <Routes>
      <Route path="room" element={<S><PlaceholderPage /></S>} />
      <Route path="objective-tree" element={<S><PlaceholderPage /></S>} />
      <Route path="work-tree" element={<S><WorkTreePage /></S>} />
      <Route path="backlog" element={<S><PlaceholderPage /></S>} />
      <Route path="epics" element={<S><EpicsPage /></S>} />
      <Route path="epic-backlog" element={<S><EpicBacklogWithSidebar /></S>} />  
      <Route path="epic-estimation" element={<S><EpicEstimationPage /></S>} />
      <Route path="roadmaps" element={<S><Roadmaps /></S>} />
      <Route path="forecast" element={<S><Forecast /></S>} />
      <Route path="capacity" element={<S><CapacityPlanning /></S>} />
      <Route path="themes" element={<S><Themes /></S>} />
      <Route path="initiatives" element={<S><Initiatives /></S>} />
      <Route path="features" element={<S><Features /></S>} />
      <Route path="stories" element={<S><Stories /></S>} />
      <Route path="defects" element={<S><Defects /></S>} />
      <Route path="tasks" element={<S><Tasks /></S>} />
      <Route path="dependencies" element={<S><DependenciesPage /></S>} />
      <Route path="risks" element={<S><RisksGridPage /></S>} />
      <Route path="impediments" element={<S><Impediments /></S>} />
      <Route path="sprints" element={<S><Sprints /></S>} />
      <Route path="program-increments" element={<S><PlaceholderPage /></S>} />
      <Route path="release-vehicles" element={<S><ReleaseVehicles /></S>} />
      <Route path="okr-hub" element={<S><PlaceholderPage /></S>} />
      <Route path="reports/epic-status" element={<S><EpicStatusReport /></S>} />
      <Route path="reports/epic-trace" element={<S><EpicTraceReport /></S>} />
      <Route path="reports/feature-status" element={<S><TeamComingSoon /></S>} />
      <Route path="reports/health" element={<S><TeamComingSoon /></S>} />
      <Route path="reports/work-tree" element={<S><WorkTreePage /></S>} />
      <Route path="pages/assessments" element={<S><TeamComingSoon /></S>} />
      <Route path="pages/metrics" element={<S><TeamComingSoon /></S>} />
      <Route path="pages/meetings" element={<S><TeamComingSoon /></S>} />
      <Route path="kanban-boards" element={<S><TeamComingSoon /></S>} />
      <Route path="*" element={<S><PlaceholderPage /></S>} />
    </Routes>
  );
}
