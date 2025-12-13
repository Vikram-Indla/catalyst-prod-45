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
  const { programs, projects, projectsLoading, isAdmin } = useWorkspaceAccess();
  const { setProgramId, setProjectId, setProgramName, setProjectName } = useCatalystContext();

  // Map projects to WorkspaceItem format - single line: "Project Name (PROGRAMKEY)"
  const items: WorkspaceItem[] = projects.map(p => {
    // Find program key from the parent program
    const parentProgram = programs.find(prog => prog.id === p.programId);
    const programKey = parentProgram?.key || '';
    const displayName = programKey ? `${p.name} (${programKey})` : p.name;
    
    return {
      id: p.id,
      key: p.key,
      name: displayName,
      canAccess: p.canAccess,
      sourceField: p.sourceField,
      needsMigration: p.needsMigration,
    };
  });

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
