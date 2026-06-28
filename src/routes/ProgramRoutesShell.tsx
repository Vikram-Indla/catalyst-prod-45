/**
 * Program Routes Shell — lazy-loaded
 * Handles /programs/:programId/* and /program/:programId/* routes
 */
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';

const PlaceholderPage = lazy(() => import("../pages/jira-align/PlaceholderPage"));
const WorkTreePage = lazy(() => import("../pages/work-tree").then(m => ({ default: m.WorkTreePage })));
const ProgramRoom = lazy(() => import("../pages/ProgramRoom"));
const ProgramEpicsPage = lazy(() => import("../pages/ProgramEpicsPage"));
const ProgramBoardHistory = lazy(() => import("../pages/ProgramBoardHistory"));
const ProgramRoadmapPage = lazy(() => import("../pages/program/ProgramRoadmapPage"));
const RoadmapsTestPage = lazy(() => import("../pages/program/RoadmapsTestPage"));
const ExecutionWorkbenchPage = lazy(() => import("../pages/program/ExecutionWorkbench"));
const EpicsPage = lazy(() => import("../pages/items/EpicsPage"));
const EpicBacklogWithSidebar = lazy(() => import("../pages/EpicBacklogWithSidebar"));
const FeaturesWithSidebar = lazy(() => import("../pages/program/FeaturesWithSidebar"));
const BacklogWithSidebar = lazy(() => import("../pages/program/BacklogWithSidebar"));
const CapacityWithSidebar = lazy(() => import("../pages/program/CapacityWithSidebar"));
const QuartersPage = lazy(() => import("../pages/program/QuartersPage"));
const DependenciesPage = lazy(() => import("../pages/work/Dependencies"));
const FeatureBacklogPage = lazy(() => import("../modules/feature-backlog/pages/FeatureBacklogPage"));
const EpicBalancingPage = lazy(() => import("../modules/epic-balancing").then(m => ({ default: m.EpicBalancingPage })));
const Stories = lazy(() => import("../pages/Stories"));
const Tasks = lazy(() => import("../pages/Tasks"));
const RisksGridPage = lazy(() => import("../pages/risks/RisksGridPage"));
const Impediments = lazy(() => import("../pages/Impediments"));
const Sprints = lazy(() => import("../pages/Sprints"));
const ReleaseVehicles = lazy(() => import("../pages/ReleaseVehicles"));
const PIObjectives = lazy(() => import("../pages/PIObjectives"));
const KanbanBoardView = lazy(() => import("../pages/KanbanBoardView"));
const KanbanBoardSetup = lazy(() => import("../pages/KanbanBoardSetup"));
const KanbanBoardAnalytics = lazy(() => import("../pages/KanbanBoardAnalytics"));
const TeamComingSoon = lazy(() => import("../pages/team/ComingSoon"));
const ProgramRedirect = lazy(() => import("../pages/program/ProgramRedirect").then(m => ({ default: m.ProgramRedirect })));

const S = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <Suspense fallback={<div className="p-8">Loading...</div>}>{children}</Suspense>
  </ErrorBoundary>
);

// /programs/:programId/*
export function ProgramsRoutes() {
  return (
    <Routes>
      <Route path="room" element={<S><ProgramRoom /></S>} />
      <Route path="epics" element={<S><EpicsPage /></S>} />
      <Route path="epic-backlog" element={<S><EpicBacklogWithSidebar /></S>} />
      <Route path="features" element={<S><FeaturesWithSidebar /></S>} />
      <Route path="backlog" element={<S><BacklogWithSidebar /></S>} />
      <Route path="roadmaps" element={<S><ProgramRoadmapPage /></S>} />
      <Route path="program-roadmap" element={<S><ProgramRoadmapPage /></S>} />
      <Route path="objective-tree" element={<S><PlaceholderPage /></S>} />
      <Route path="work-tree" element={<S><WorkTreePage /></S>} />
      <Route path="program-board" element={<S><PlaceholderPage /></S>} />
      <Route path="forecast" element={<S><PlaceholderPage /></S>} />
      <Route path="capacity" element={<S><CapacityWithSidebar /></S>} />
      <Route path="settings" element={<S><PlaceholderPage /></S>} />
      <Route path="quarters" element={<S><QuartersPage /></S>} />
      <Route path="dependencies" element={<S><DependenciesPage /></S>} />
      <Route path="increments" element={<S><PlaceholderPage /></S>} />
      <Route path="stories" element={<S><Stories /></S>} />
      <Route path="tasks" element={<S><Tasks /></S>} />
      <Route path="risks" element={<S><RisksGridPage /></S>} />
      <Route path="impediments" element={<S><Impediments /></S>} />
      <Route path="sprints" element={<S><Sprints /></S>} />
      <Route path="release-vehicles" element={<S><ReleaseVehicles /></S>} />
      <Route path="reports/feature-status" element={<S><TeamComingSoon /></S>} />
      <Route path="reports/board-history" element={<S><ProgramBoardHistory /></S>} />
      <Route path="reports/work-tree" element={<S><WorkTreePage /></S>} />
      <Route path="reports/pi-objectives" element={<S><PIObjectives /></S>} />
      <Route path="kanban-boards" element={<S><TeamComingSoon /></S>} />
      <Route path="kanban-boards/:boardId" element={<S><KanbanBoardView /></S>} />
      <Route path="kanban-boards/:boardId/setup" element={<S><KanbanBoardSetup /></S>} />
      <Route path="kanban-boards/:boardId/analytics" element={<S><KanbanBoardAnalytics /></S>} />
      <Route path="pages/assessments" element={<S><TeamComingSoon /></S>} />
      <Route path="pages/metrics" element={<S><TeamComingSoon /></S>} />
      <Route path="pages/meetings" element={<S><TeamComingSoon /></S>} />
      <Route path="*" element={<S><PlaceholderPage /></S>} />
    </Routes>
  );
}

// /program/:programId/*
export function ProgramRoutes() {
  return (
    <Routes>
      <Route path="work-tree" element={<S><ExecutionWorkbenchPage /></S>} />
      <Route path="room" element={<S><ProgramRoom /></S>} />
      <Route path="epics" element={<S><ProgramEpicsPage /></S>} />
      <Route path="epic-backlog" element={<S><EpicBacklogWithSidebar /></S>} />
      <Route path="feature-backlog" element={<S><FeatureBacklogPage /></S>} />
      <Route path="features" element={<S><FeaturesWithSidebar /></S>} />
      <Route path="program-board" element={<S><PlaceholderPage /></S>} />
      <Route path="dependencies" element={<S><DependenciesPage /></S>} />
      <Route path="roadmaps" element={<S><ProgramRoadmapPage /></S>} />
      <Route path="roadmaps-test" element={<S><RoadmapsTestPage /></S>} />
      <Route path="objectives-tree" element={<S><PlaceholderPage /></S>} />
      <Route path="forecast" element={<S><PlaceholderPage /></S>} />
      <Route path="capacity" element={<S><CapacityWithSidebar /></S>} />
      <Route path="quarters" element={<S><QuartersPage /></S>} />
      <Route path="epic-balancing" element={<S><EpicBalancingPage /></S>} />
      <Route path="reports" element={<S><PlaceholderPage /></S>} />
      <Route path="okr-hub" element={<S><PlaceholderPage /></S>} />
      <Route path="*" element={<S><PlaceholderPage /></S>} />
    </Routes>
  );
}
