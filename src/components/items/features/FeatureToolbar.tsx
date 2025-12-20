/**
 * FeatureToolbar — Slim Framework
 * 
 * KEPT: Create, Export, Mass Move
 * HIDDEN: Import, Audit Report, WSJF Prioritization, Promote to Epic, Workflow, Recycle Bin, Canceled Items
 * 
 * These SAFe/heavy actions are disabled in the slim model.
 */

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  MoreVertical,
  Download,
  ArrowRight,
} from 'lucide-react';

interface FeatureToolbarProps {
  selectedFeatureIds: string[];
  onCreateFeature: () => void;
  onImport?: () => void; // Hidden
  onExport: () => void;
  onAuditReport?: () => void; // Hidden
  onWSJFPrioritization?: () => void; // Hidden - SAFe
  onMassMove: () => void;
  onPromoteToEpic?: () => void; // Hidden
  onWorkflow?: () => void; // Hidden
  onRecycleBin?: () => void; // Hidden
  onCanceledItems?: () => void; // Hidden
}

export function FeatureToolbar({
  selectedFeatureIds,
  onCreateFeature,
  onExport,
  onMassMove,
}: FeatureToolbarProps) {
  return (
    <div className="border-b bg-card px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={onCreateFeature} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Feature
          </Button>
          {selectedFeatureIds.length > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedFeatureIds.length} selected
              </span>
              <Button variant="outline" size="sm" onClick={onMassMove}>
                <ArrowRight className="w-4 h-4 mr-2" />
                Move
              </Button>
            </>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="w-4 h-4 mr-2" />
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onExport}>
              <Download className="w-4 h-4 mr-2" />
              Export Features
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
