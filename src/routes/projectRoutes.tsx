// =====================================================
// PROJECT ROUTES CONFIGURATION
// Route definitions for project views
// =====================================================

import React, { lazy, Suspense } from 'react';
import { RouteObject, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Lazy load view components for code splitting
const ProjectWorkspace = lazy(() => import('@/pages/project/ProjectWorkspace'));
const BoardView = lazy(() => import('@/pages/project/BoardView'));
const TimelineView = lazy(() => import('@/pages/project/TimelineView'));
const WorkItemsPage = lazy(() => import('@/pages/project/WorkItemsPage'));
const EpicBacklogPage = lazy(() => import('@/modules/project-work-hub/pages/EpicBacklogPage'));
const FeatureBacklogPage = lazy(() => import('@/modules/project-work-hub/pages/FeatureBacklogPage'));
const StoryBacklogPage = lazy(() => import('@/modules/project-work-hub/pages/StoryBacklogPage'));
const SyncSettingsPage = lazy(() => import('@/pages/project/SyncSettingsPage'));

// Loading component
function ViewLoader() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb]" />
    </div>
  );
}

// Route configuration
export const projectRoutes: RouteObject[] = [
  {
    path: '/projects/:projectId',
    element: (
      <ErrorBoundary><Suspense fallback={<ViewLoader />}>
        <ProjectWorkspace />
      </Suspense></ErrorBoundary>
    ),
    children: [
      {
        index: true,
        element: null, // Handled by redirect in ProjectWorkspace
      },
      {
        path: 'board',
        element: (
          <ErrorBoundary><Suspense fallback={<ViewLoader />}>
            <BoardView />
          </Suspense></ErrorBoundary>
        ),
      },
      {
        path: 'timeline',
        element: (
          <ErrorBoundary><Suspense fallback={<ViewLoader />}>
            <TimelineView />
          </Suspense></ErrorBoundary>
        ),
      },
      {
        path: 'backlog',
        element: <Navigate to="epics" replace />,
      },
      {
        path: 'backlog/epics',
        element: (
          <ErrorBoundary><Suspense fallback={<ViewLoader />}>
            <EpicBacklogPage />
          </Suspense></ErrorBoundary>
        ),
      },
      {
        path: 'backlog/features',
        element: (
          <ErrorBoundary><Suspense fallback={<ViewLoader />}>
            <FeatureBacklogPage />
          </Suspense></ErrorBoundary>
        ),
      },
      {
        path: 'backlog/stories',
        element: (
          <ErrorBoundary><Suspense fallback={<ViewLoader />}>
            <StoryBacklogPage />
          </Suspense></ErrorBoundary>
        ),
      },
      {
        path: 'feature-map',
        element: (
          <ErrorBoundary><Suspense fallback={<ViewLoader />}>
            <div className="h-full flex items-center justify-center text-gray-500">
              Feature Map View - Coming Soon
            </div>
          </Suspense></ErrorBoundary>
        ),
      },
      {
        path: 'sync-settings',
        element: (
          <ErrorBoundary><Suspense fallback={<ViewLoader />}>
            <SyncSettingsPage />
          </Suspense></ErrorBoundary>
        ),
      },
    ],
  },
];
