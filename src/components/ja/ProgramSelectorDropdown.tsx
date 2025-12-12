/**
 * Program Selector Dropdown - Uses shared WorkspaceSwitcherMenu
 * All users see all programs, but only Admin/Members can enter
 */
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkspaceSwitcherMenu, WorkspaceItem } from '@/components/workspace/WorkspaceSwitcherMenu';
import { useWorkspaceAccess } from '@/hooks/useWorkspaceAccess';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { getProgramLandingRoute } from '@/lib/workspaceContext';

interface ProgramSelectorDropdownProps {
  onClose: () => void;
  onCreateClick?: () => void;
}

export const ProgramSelectorDropdown = React.memo(function ProgramSelectorDropdown({ 
  onClose, 
  onCreateClick 
}: ProgramSelectorDropdownProps) {
  const navigate = useNavigate();
  const { programs, programsLoading, isAdmin } = useWorkspaceAccess();
  const { setProgramId, setProjectId, setProgramName, setProjectName } = useCatalystContext();

  // Map programs to WorkspaceItem format
  const items: WorkspaceItem[] = programs.map(p => ({
    id: p.id,
    key: p.key,
    name: p.name,
    subtext: p.description || undefined,
    canAccess: p.canAccess,
  }));

  const handleSelect = useCallback((item: WorkspaceItem) => {
    setProgramId(item.id);
    setProgramName(item.name);
    setProjectId(null);
    setProjectName(null);
    navigate(getProgramLandingRoute(item.id));
    onClose();
  }, [navigate, onClose, setProgramId, setProgramName, setProjectId, setProjectName]);

  const handleCreate = useCallback(() => {
    onClose();
    onCreateClick?.();
  }, [onClose, onCreateClick]);

  const handleManage = useCallback(() => {
    navigate('/admin/portfolios');
    onClose();
  }, [navigate, onClose]);

  return (
    <WorkspaceSwitcherMenu
      title="Programs"
      searchPlaceholder="Search programs..."
      items={items}
      isLoading={programsLoading}
      showActions={isAdmin}
      onSelectItem={handleSelect}
      onCreate={isAdmin ? handleCreate : undefined}
      onManage={isAdmin ? handleManage : undefined}
    />
  );
});
