// =====================================================
// PROJECT ROUTES CONFIGURATION
// Route definitions for project views
// =====================================================

import React, { lazy, Suspense } from 'react';
import { RouteObject } from 'react-router-dom';

// Lazy load view components for code splitting
const ProjectWorkspace = lazy(() => import('@/pages/project/ProjectWorkspace'));
const BoardView = lazy(() => import('@/pages/project/BoardView'));
const TimelineView = lazy(() => import('@/pages/project/TimelineView'));
const WorkItemsPage = lazy(() => import('@/pages/project/WorkItemsPage'));

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
      <Suspense fallback={<ViewLoader />}>
        <ProjectWorkspace />
      </Suspense>
    ),
    children: [
      {
        index: true,
        element: null, // Handled by redirect in ProjectWorkspace
      },
      {
        path: 'board',
        element: (
          <Suspense fallback={<ViewLoader />}>
            <BoardView />
          </Suspense>
        ),
      },
      {
        path: 'timeline',
        element: (
          <Suspense fallback={<ViewLoader />}>
            <TimelineView />
          </Suspense>
        ),
      },
      {
        path: 'feature-map',
        element: (
          <Suspense fallback={<ViewLoader />}>
            {/* FeatureMapView will be added when Module 5 is implemented */}
            <div className="h-full flex items-center justify-center text-gray-500">
              Feature Map View - Coming Soon
            </div>
          </Suspense>
        ),
      },
    ],
  },
];
