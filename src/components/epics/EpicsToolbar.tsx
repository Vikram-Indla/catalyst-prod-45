import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Calculator, TrendingUp, Upload, Download, Move, Printer, Trash2, Archive, Grid3x3, List } from 'lucide-react';
import { PermissionGuard } from '@/components/shared/PermissionGuard';

interface EpicsToolbarProps {
  onAddEpic: () => void;
  onBottomUpEstimate: () => void;
  onPrioritization: () => void;
  onImport: () => void;
  onExport: () => void;
  onMassMove: () => void;
  onWorkTree: () => void;
  onPrintCards: () => void;
  onRecycleBin: () => void;
  onCanceledItems: () => void;
  onColumnsShown: () => void;
  selectedCount?: number;
}

export function EpicsToolbar({
  onAddEpic,
  onBottomUpEstimate,
  onPrioritization,
  onImport,
  onExport,
  onMassMove,
  onWorkTree,
  onPrintCards,
  onRecycleBin,
  onCanceledItems,
  onColumnsShown,
  selectedCount = 0,
}: EpicsToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-3 border-b bg-card">
      <div className="flex items-center gap-2">
        <PermissionGuard requiredRole="program_manager" showMessage={false}>
          <Button onClick={onAddEpic} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Epic
          </Button>
        </PermissionGuard>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4 mr-2" />
              More Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={onBottomUpEstimate}>
              <Calculator className="h-4 w-4 mr-2" />
              Bottom-Up Estimate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPrioritization}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Prioritization
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onImport}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onMassMove} disabled={selectedCount === 0}>
              <Move className="h-4 w-4 mr-2" />
              Mass Move ({selectedCount})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onWorkTree}>
              <Grid3x3 className="h-4 w-4 mr-2" />
              Work Tree
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPrintCards}>
              <Printer className="h-4 w-4 mr-2" />
              Print Cards
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRecycleBin}>
              <Trash2 className="h-4 w-4 mr-2" />
              Recycle Bin
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCanceledItems}>
              <Archive className="h-4 w-4 mr-2" />
              Canceled Items
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onColumnsShown}>
          <List className="h-4 w-4 mr-2" />
          Columns Shown
        </Button>
      </div>
    </div>
  );
}
