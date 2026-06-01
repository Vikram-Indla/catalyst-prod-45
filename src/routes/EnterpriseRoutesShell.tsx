/**
 * Enterprise Routes Shell — lazy-loaded
 * Handles /enterprise/* routes
 */
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';

const EnterpriseEpics = lazy(() => import("../pages/enterprise/EnterpriseEpics"));
const EnterpriseTasks = lazy(() => import("../pages/enterprise/EnterpriseTasks"));
const EnterpriseObjectives = lazy(() => import("../pages/enterprise/EnterpriseObjectives"));
const EnterpriseDependencies = lazy(() => import("../pages/enterprise/EnterpriseDependencies"));
const EnterpriseReleaseVehicles = lazy(() => import("../pages/enterprise/EnterpriseReleaseVehicles"));
const EnterpriseSuccessCriteria = lazy(() => import("../pages/enterprise/EnterpriseSuccessCriteria"));
const EnterpriseComingSoon = lazy(() => import("../pages/enterprise/ComingSoon"));
const SkillsInventory = lazy(() => import("../pages/SkillsInventory"));
const WorkTreePage = lazy(() => import("../pages/work-tree").then(m => ({ default: m.WorkTreePage })));
const CapacityPlanningPage = lazy(() => import("../pages/CapacityPlanningPage"));

const S = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <Suspense fallback={<div className="p-8">Loading...</div>}>{children}</Suspense>
  </ErrorBoundary>
);

export function EnterpriseRoutes() {
  return (
    <Routes>
      <Route path="roadmaps" element={<Navigate to="/strategyhub/risks" replace />} />
      <Route path="risks" element={<Navigate to="/strategyhub/risks" replace />} />
      <Route path="work-tree" element={<S><WorkTreePage /></S>} />
      <Route path="kanban-boards" element={<S><EnterpriseComingSoon /></S>} />
      <Route path="epics" element={<S><EnterpriseEpics /></S>} />
      <Route path="features" element={<S><EnterpriseComingSoon /></S>} />
      <Route path="stories" element={<S><EnterpriseComingSoon /></S>} />
      <Route path="defects" element={<S><EnterpriseComingSoon /></S>} />
      <Route path="tasks" element={<S><EnterpriseTasks /></S>} />
      <Route path="objectives" element={<S><EnterpriseObjectives /></S>} />
      <Route path="dependencies" element={<S><EnterpriseDependencies /></S>} />
      <Route path="sprints" element={<S><EnterpriseComingSoon /></S>} />
      <Route path="program-increments" element={<S><EnterpriseComingSoon /></S>} />
      <Route path="release-vehicles" element={<S><EnterpriseReleaseVehicles /></S>} />
      <Route path="success-criteria" element={<S><EnterpriseSuccessCriteria /></S>} />
      <Route path="skills-inventory" element={<S><SkillsInventory /></S>} />
      <Route path="impediments" element={<S><EnterpriseComingSoon /></S>} />
      <Route path="brainstorming" element={<S><EnterpriseComingSoon /></S>} />
      <Route path="innovation" element={<S><EnterpriseComingSoon /></S>} />
      <Route path="canvas" element={<S><EnterpriseComingSoon /></S>} />
      <Route path="mind-maps" element={<S><EnterpriseComingSoon /></S>} />
      <Route path="competitors" element={<S><EnterpriseComingSoon /></S>} />
      <Route path="goals" element={<S><EnterpriseComingSoon /></S>} />
      <Route path="vision" element={<S><EnterpriseComingSoon /></S>} />
      <Route path="personas" element={<S><EnterpriseComingSoon /></S>} />
      <Route path="reports/work-tree" element={<S><WorkTreePage /></S>} />
      <Route path="reports/demand-capacity" element={<S><CapacityPlanningPage /></S>} />
      <Route path="reports/*" element={<S><EnterpriseComingSoon /></S>} />
      <Route path="pages/*" element={<S><EnterpriseComingSoon /></S>} />
      <Route path="*" element={<S><EnterpriseComingSoon /></S>} />
    </Routes>
  );
}
