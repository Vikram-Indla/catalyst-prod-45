/**
 * Project Selector Dropdown - Uses shared WorkspaceSwitcherMenu
 * All users see all projects, but only Admin/Members can enter
 * Inherits access from parent program membership
 */
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkspaceSwitcherMenu, WorkspaceItem } from '@/components/workspace/WorkspaceSwitcherMenu';
import { useWorkspaceAccess } from '@/hooks/useWorkspaceAccess';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { getProjectLandingRoute } from '@/lib/workspaceContext';

interface ProjectSelectorDropdownProps {
  onClose: () => void;
  onCreateClick?: () => void;
}

export const ProjectSelectorDropdown = React.memo(function ProjectSelectorDropdown({ 
  onClose, 
  onCreateClick 
}: ProjectSelectorDropdownProps) {
  const navigate = useNavigate();
  const { projects, projectsLoading, isAdmin } = useWorkspaceAccess();
  const { setProgramId, setProjectId, setProgramName, setProjectName } = useCatalystContext();

  // Map projects to WorkspaceItem format
  const items: WorkspaceItem[] = projects.map(p => ({
    id: p.id,
    key: p.key,
    name: p.name,
    subtext: p.programName || undefined,
    canAccess: p.canAccess,
  }));

  const handleSelect = useCallback((item: WorkspaceItem) => {
    // Find the full project data to get program info
    const project = projects.find(p => p.id === item.id);
    
    setProjectId(item.id);
    setProjectName(item.name);
    
    if (project?.programId && project?.programName) {
      setProgramId(project.programId);
      setProgramName(project.programName);
    }
    
    navigate(getProjectLandingRoute(item.id));
    onClose();
  }, [navigate, onClose, projects, setProgramId, setProgramName, setProjectId, setProjectName]);

  const handleCreate = useCallback(() => {
    onClose();
    onCreateClick?.();
  }, [onClose, onCreateClick]);

  const handleManage = useCallback(() => {
    navigate('/admin/programs');
    onClose();
  }, [navigate, onClose]);

  return (
    <WorkspaceSwitcherMenu
      title="Projects"
      searchPlaceholder="Search projects..."
      items={items}
      isLoading={projectsLoading}
      showActions={isAdmin}
      onSelectItem={handleSelect}
      onCreate={isAdmin ? handleCreate : undefined}
      onManage={isAdmin ? handleManage : undefined}
    />
  );
});
