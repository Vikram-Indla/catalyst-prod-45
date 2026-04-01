/**
 * Team Routes Shell — lazy-loaded to keep out of initial bundle
 * Handles /team/:teamId/* and /teams/:teamId/* routes
 */
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';

const TeamComingSoon = lazy(() => import("../pages/team/ComingSoon"));
const WorkTreePage = lazy(() => import("../pages/work-tree").then(m => ({ default: m.WorkTreePage })));
const KanbanBoardView = lazy(() => import("../pages/KanbanBoardView"));
const KanbanBoardSetup = lazy(() => import("../pages/KanbanBoardSetup"));
const KanbanBoardAnalytics = lazy(() => import("../pages/KanbanBoardAnalytics"));
const PlaceholderPage = lazy(() => import("../pages/jira-align/PlaceholderPage"));

const S = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <Suspense fallback={<div className="p-8">Loading...</div>}>{children}</Suspense>
  </ErrorBoundary>
);

// /teams/:teamId/*
export function TeamsRoutes() {
  return (
    <Routes>
      <Route path="room" element={<S><TeamComingSoon /></S>} />
      <Route path="work-tree" element={<S><WorkTreePage /></S>} />
      <Route path="backlog" element={<S><TeamComingSoon /></S>} />
      <Route path="board" element={<S><TeamComingSoon /></S>} />
      <Route path="objective-tree" element={<S><PlaceholderPage /></S>} />
      <Route path="roadmaps" element={<S><TeamComingSoon /></S>} />
      <Route path="sprints" element={<S><TeamComingSoon /></S>} />
      <Route path="velocity" element={<S><TeamComingSoon /></S>} />
      <Route path="meetings" element={<S><TeamComingSoon /></S>} />
      <Route path="impediments" element={<S><TeamComingSoon /></S>} />
      <Route path="features" element={<S><TeamComingSoon /></S>} />
      <Route path="tasks" element={<S><TeamComingSoon /></S>} />
      <Route path="dependencies" element={<S><TeamComingSoon /></S>} />
      <Route path="risks" element={<S><TeamComingSoon /></S>} />
      <Route path="program-increments" element={<S><TeamComingSoon /></S>} />
      <Route path="release-vehicles" element={<S><TeamComingSoon /></S>} />
      <Route path="reports/stories-by-state" element={<S><TeamComingSoon /></S>} />
      <Route path="reports/story-point-progress" element={<S><TeamComingSoon /></S>} />
      <Route path="reports/team-velocity-trend" element={<S><TeamComingSoon /></S>} />
      <Route path="reports/work-tree" element={<S><WorkTreePage /></S>} />
      <Route path="pages/assessments" element={<S><TeamComingSoon /></S>} />
      <Route path="pages/metrics" element={<S><TeamComingSoon /></S>} />
      <Route path="kanban-boards" element={<S><TeamComingSoon /></S>} />
      <Route path="kanban-boards/:boardId" element={<S><KanbanBoardView /></S>} />
      <Route path="kanban-boards/:boardId/setup" element={<S><KanbanBoardSetup /></S>} />
      <Route path="kanban-boards/:boardId/analytics" element={<S><KanbanBoardAnalytics /></S>} />
      <Route path="*" element={<S><TeamComingSoon /></S>} />
    </Routes>
  );
}

// /team/:teamId/*
export function TeamRoutes() {
  return (
    <Routes>
      <Route path="room" element={<S><TeamComingSoon /></S>} />
      <Route path="backlog" element={<S><TeamComingSoon /></S>} />
      <Route path="stories" element={<S><TeamComingSoon /></S>} />
      <Route path="roadmaps" element={<S><TeamComingSoon /></S>} />
      <Route path="objective-tree" element={<S><PlaceholderPage /></S>} />
      <Route path="work-tree" element={<S><WorkTreePage /></S>} />
      <Route path="meetings" element={<S><TeamComingSoon /></S>} />
      <Route path="assign-tasks" element={<S><TeamComingSoon /></S>} />
      <Route path="defects" element={<S><TeamComingSoon /></S>} />
      <Route path="dependencies" element={<S><TeamComingSoon /></S>} />
      <Route path="design-components" element={<S><TeamComingSoon /></S>} />
      <Route path="estimation" element={<S><TeamComingSoon /></S>} />
      <Route path="impediments" element={<S><TeamComingSoon /></S>} />
      <Route path="sprints" element={<S><TeamComingSoon /></S>} />
      <Route path="tasks" element={<S><TeamComingSoon /></S>} />
      <Route path="objectives" element={<S><TeamComingSoon /></S>} />
      <Route path="teams" element={<S><TeamComingSoon /></S>} />
      <Route path="reports/*" element={<S><TeamComingSoon /></S>} />
      <Route path="reports/work-tree" element={<S><WorkTreePage /></S>} />
      <Route path="kanban-boards" element={<S><TeamComingSoon /></S>} />
      <Route path="pages/*" element={<S><TeamComingSoon /></S>} />
      <Route path="*" element={<S><TeamComingSoon /></S>} />
    </Routes>
  );
}
