import { Button } from '@/components/ui/button';
import { Plus, Upload, Download, Archive, TrendingUp, PanelRightClose, PanelRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BacklogToolbarProps {
  selectedCount: number;
  onOpenPrioritization: () => void;
  onToggleUnassigned: () => void;
  isUnassignedOpen: boolean;
  onExport?: () => void;
}

export function BacklogToolbar({
  selectedCount,
  onOpenPrioritization,
  onToggleUnassigned,
  isUnassignedOpen,
  onExport,
}: BacklogToolbarProps) {
  return (
    <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2">
      <Button size="sm" variant="default">
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
          <DropdownMenuItem>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export to CSV
          </DropdownMenuItem>
          <DropdownMenuItem disabled={selectedCount === 0}>
            <Archive className="h-4 w-4 mr-2" />
            Mass Move ({selectedCount})
          </DropdownMenuItem>
          <DropdownMenuItem disabled={selectedCount === 0}>
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
        <div className="ml-2 text-sm text-muted-foreground">
          {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
        </div>
      )}

      <div className="flex-1" />

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
  );
}
