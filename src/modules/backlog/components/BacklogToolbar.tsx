import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Download, Archive, TrendingUp, PanelRightClose, PanelRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBacklogState } from '../hooks/useBacklogState';
import { CreateEpicDialog } from '@/modules/program-epics/components/CreateEpicDialog';

interface BacklogToolbarProps {
  selectedCount: number;
  onOpenPrioritization: () => void;
  onToggleUnassigned: () => void;
  isUnassignedOpen: boolean;
  onExport?: () => void;
  onImport?: () => void;
  onBulkDelete?: () => void;
  onBulkMove?: () => void;
}

export function BacklogToolbar({
  selectedCount,
  onOpenPrioritization,
  onToggleUnassigned,
  isUnassignedOpen,
  onExport,
  onImport,
  onBulkDelete,
  onBulkMove,
}: BacklogToolbarProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { type, isEpicBacklog, programId } = useBacklogState();

  // Label for add button based on type (always Epic in Epic Backlog mode)
  const itemTypeLabel = isEpicBacklog ? 'Epic' : (type === 'epic' ? 'Epic' : type.charAt(0).toUpperCase() + type.slice(1));

  // HARD GUARD: Cannot create epic without programId
  const canCreate = isEpicBacklog && type === 'epic' && !!programId;

  const handleAddClick = () => {
    if (!canCreate) {
      console.error('[BacklogToolbar] Cannot create epic without programId');
      return;
    }
    setIsCreateDialogOpen(true);
  };

  return (
    <>
      <div className="flex items-center gap-2 border-b bg-card px-4 sm:px-6 py-3">
        {/* Left side: Action buttons */}
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="default" 
            onClick={handleAddClick}
            disabled={!canCreate}
            title={!canCreate ? 'Program context required to create epics' : undefined}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={onImport}>
                <Upload className="h-4 w-4 mr-2" />
                Import from CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Export to CSV
              </DropdownMenuItem>
              {!isEpicBacklog && (
                <DropdownMenuItem disabled={selectedCount === 0} onClick={onBulkMove}>
                  <Archive className="h-4 w-4 mr-2" />
                  Mass Move to PI ({selectedCount})
                </DropdownMenuItem>
              )}
              <DropdownMenuItem disabled={selectedCount === 0} onClick={onBulkDelete}>
                <Archive className="h-4 w-4 mr-2" />
                Mass Delete ({selectedCount})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" variant="outline" onClick={onOpenPrioritization}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Prioritize
          </Button>

          {selectedCount > 0 && (
            <span className="text-sm text-muted-foreground ml-2">
              {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side: Unassigned Backlog toggle */}
        <Button
          size="sm"
          variant="outline"
          onClick={onToggleUnassigned}
        >
          {isUnassignedOpen ? (
            <PanelRightClose className="h-4 w-4 mr-2" />
          ) : (
            <PanelRight className="h-4 w-4 mr-2" />
          )}
          Unassigned Backlog
        </Button>
      </div>

      {/* CANONICAL Create Epic Dialog - requires programId */}
      {programId && (
        <CreateEpicDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          programId={programId}
        />
      )}
    </>
  );
}