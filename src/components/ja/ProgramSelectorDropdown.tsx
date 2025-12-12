/**
 * Program Selector Dropdown - Uses shared WorkspaceSwitcherMenu
 * All users see all programs, but only Admin/Members can enter
 * Default program is hidden from the list
 */
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkspaceSwitcherMenu, WorkspaceItem } from '@/components/workspace/WorkspaceSwitcherMenu';
import { useWorkspaceAccess } from '@/hooks/useWorkspaceAccess';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { getProgramLandingRoute } from '@/lib/workspaceContext';
import { DEFAULT_PROGRAM_ID, isDefaultProgram } from '@/lib/programKeyUtils';

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

  // Map programs to WorkspaceItem format, excluding Default program
  // Keys are already canonical 3-letter from useWorkspaceAccess
  const items: WorkspaceItem[] = programs
    .filter(p => !isDefaultProgram(p))
    .map(p => ({
      id: p.id,
      key: p.key, // Already canonical 3-letter key from hook
      name: p.name,
      canAccess: p.canAccess,
      sourceField: p.sourceField,
      needsMigration: p.needsMigration,
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
      isAdmin={isAdmin}
      onSelectItem={handleSelect}
      onCreate={isAdmin ? handleCreate : undefined}
      onManage={isAdmin ? handleManage : undefined}
    />
  );
});
