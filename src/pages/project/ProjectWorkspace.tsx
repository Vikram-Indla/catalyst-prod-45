// =====================================================
// PROJECT WORKSPACE
// Main layout container for project views
// =====================================================

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { useProject } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';

export default function ProjectWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [showCreateFeature, setShowCreateFeature] = useState(false);

  const { data: project, isLoading, error } = useProject(projectId || '');

  // Redirect to last viewed or default view
  useEffect(() => {
    if (projectId && location.pathname === `/projects/${projectId}`) {
      // Check for saved view preference
      const savedView = localStorage.getItem(`catalyst-project-${projectId}-view`);
      const defaultView = savedView || 'board';
      navigate(`/projects/${projectId}/${defaultView}`, { replace: true });
    }
  }, [projectId, location.pathname, navigate]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#faf7f1]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#c69c6d] mx-auto mb-4" />
          <p className="text-gray-500">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#faf7f1]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
          <p className="text-gray-500 mb-4">
            The project you're looking for doesn't exist or you don't have access.
          </p>
          <Button onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#faf7f1]">
      {/* Project Header with View Selector */}
      <ProjectHeader 
        project={project} 
        onCreateFeature={() => setShowCreateFeature(true)}
      />

      {/* View Content (rendered by router) */}
      <div className="flex-1 overflow-hidden">
        <Outlet context={{ showCreateFeature, setShowCreateFeature, project }} />
      </div>
    </div>
  );
}
