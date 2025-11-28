import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  MoreVertical,
  Upload,
  Download,
  FileText,
  Calculator,
  ArrowRight,
  GitBranch,
  Workflow,
  Trash2,
  XCircle,
} from 'lucide-react';

interface FeatureToolbarProps {
  selectedFeatureIds: string[];
  onCreateFeature: () => void;
  onImport: () => void;
  onExport: () => void;
  onAuditReport: () => void;
  onWSJFPrioritization: () => void;
  onMassMove: () => void;
  onPromoteToEpic: () => void;
  onWorkflow: () => void;
  onRecycleBin: () => void;
  onCanceledItems: () => void;
}

export function FeatureToolbar({
  selectedFeatureIds,
  onCreateFeature,
  onImport,
  onExport,
  onAuditReport,
  onWSJFPrioritization,
  onMassMove,
  onPromoteToEpic,
  onWorkflow,
  onRecycleBin,
  onCanceledItems,
}: FeatureToolbarProps) {
  return (
    <div className="border-b bg-card px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={onCreateFeature}>
            <Plus className="w-4 h-4 mr-2" />
            Create Feature
          </Button>
          {selectedFeatureIds.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedFeatureIds.length} selected
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="w-4 h-4 mr-2" />
              More Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onImport}>
              <Upload className="w-4 h-4 mr-2" />
              Import Features
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport}>
              <Download className="w-4 h-4 mr-2" />
              Export Features
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAuditReport}>
              <FileText className="w-4 h-4 mr-2" />
              Audit Report
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onWSJFPrioritization}>
              <Calculator className="w-4 h-4 mr-2" />
              WSJF Prioritization
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMassMove}>
              <ArrowRight className="w-4 h-4 mr-2" />
              Mass Move
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPromoteToEpic}>
              <GitBranch className="w-4 h-4 mr-2" />
              Promote to Epic
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onWorkflow}>
              <Workflow className="w-4 h-4 mr-2" />
              Workflow
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRecycleBin}>
              <Trash2 className="w-4 h-4 mr-2" />
              Recycle Bin
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCanceledItems}>
              <XCircle className="w-4 h-4 mr-2" />
              Canceled Items
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
