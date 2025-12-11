import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calculator,
  ListTree,
  Upload,
  Download,
  Move,
  GitBranch,
  Printer,
  Trash2,
  XCircle,
  MoreHorizontal,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TechnicalScoringDialog } from './TechnicalScoringDialog';
import { EpicMassMoveDialog } from './EpicMassMoveDialog';
import { EpicImportDialog } from './EpicImportDialog';

interface MoreActionsMenuProps {
  epicIds: string[];
  onExport: () => void;
  onRefetch: () => void;
  onBottomUpEstimate?: () => void;
}

export function MoreActionsMenu({ 
  epicIds, 
  onExport, 
  onRefetch,
  onBottomUpEstimate 
}: MoreActionsMenuProps) {
  const navigate = useNavigate();
  const [techScoringOpen, setTechScoringOpen] = useState(false);
  const [massMoveOpen, setMassMoveOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <MoreHorizontal className="h-4 w-4" />
            More Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Estimation & Prioritization */}
          <DropdownMenuItem onClick={onBottomUpEstimate}>
            <Calculator className="h-4 w-4 mr-2" />
            Bottom-Up Estimate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTechScoringOpen(true)}>
            <ListTree className="h-4 w-4 mr-2" />
            Technical Scoring
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Import/Export */}
          <DropdownMenuItem onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import Epics
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Epics
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Bulk Actions */}
          <DropdownMenuItem onClick={() => setMassMoveOpen(true)}>
            <Move className="h-4 w-4 mr-2" />
            Mass Move
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/items/epics/work-tree')}>
            <GitBranch className="h-4 w-4 mr-2" />
            Work Tree
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Epic Cards
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Archive Access */}
          <DropdownMenuItem onClick={() => navigate('/items/epics/recycle-bin')}>
            <Trash2 className="h-4 w-4 mr-2" />
            Access Recycle Bin
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/items/epics/canceled')}>
            <XCircle className="h-4 w-4 mr-2" />
            Access Canceled Items
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Technical Scoring Dialog */}
      <TechnicalScoringDialog
        open={techScoringOpen}
        onOpenChange={setTechScoringOpen}
        epicIds={epicIds}
        onSuccess={onRefetch}
      />

      {/* Mass Move Dialog - Program, Owner, State only (no PI) */}
      <EpicMassMoveDialog
        open={massMoveOpen}
        onOpenChange={setMassMoveOpen}
        epicIds={epicIds}
        onSuccess={onRefetch}
      />

      {/* Import Dialog */}
      <EpicImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={onRefetch}
      />
    </>
  );
}
