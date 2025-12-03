import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface EpicColumnsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedColumns: string[];
  onColumnsChange: (columns: string[]) => void;
}

const AVAILABLE_COLUMNS = [
  { id: 'acceptance_criteria', label: 'Acceptance Criteria' },
  { id: 'age', label: 'Age' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'budget', label: 'Budget' },
  { id: 'chat', label: 'Chat' },
  { id: 'child_count', label: 'Child Count' },
  { id: 'dependency', label: 'Dependency' },
  { id: 'estimate', label: 'Estimate (Bottom-Up)' },
  { id: 'mvp', label: 'MVP' },
  { id: 'owner', label: 'Owner' },
  { id: 'points_estimate', label: 'Points' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'primary_program', label: 'Program' },
  { id: 'process_step', label: 'Process Step' },
  { id: 'state', label: 'State' },
  { id: 'strategic_driver', label: 'Strategic Driver' },
  { id: 'theme', label: 'Theme' },
  { id: 'wsjf', label: 'WSJF Prioritization' },
];

const DEFAULT_COLUMNS = ['id', 'name', 'state', 'labels', 'points_estimate', 'estimate', 'mvp', 'process_step'];

export function EpicColumnsDialog({
  open,
  onOpenChange,
  selectedColumns,
  onColumnsChange,
}: EpicColumnsDialogProps) {
  const [localSelection, setLocalSelection] = useState<string[]>(selectedColumns);
  const [localUnassignedSelection, setLocalUnassignedSelection] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('epic');

  useEffect(() => {
    setLocalSelection(selectedColumns);
  }, [selectedColumns, open]);

  const toggleColumn = (columnId: string, isUnassigned: boolean = false) => {
    if (isUnassigned) {
      setLocalUnassignedSelection((prev) =>
        prev.includes(columnId)
          ? prev.filter((id) => id !== columnId)
          : prev.length < 5 ? [...prev, columnId] : prev
      );
    } else {
      setLocalSelection((prev) =>
        prev.includes(columnId)
          ? prev.filter((id) => id !== columnId)
          : prev.length < 5 ? [...prev, columnId] : prev
      );
    }
  };

  const handleReset = () => {
    setLocalSelection(DEFAULT_COLUMNS);
    setLocalUnassignedSelection([]);
  };

  const handleApply = () => {
    onColumnsChange(localSelection);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">Customize Your Columns</DialogTitle>
          <p className="text-sm text-muted-foreground">Page Settings For Jason Kidner</p>
        </DialogHeader>
        
        <Alert className="bg-warning/10 border-warning/50">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm text-warning-foreground">
            You can select up to 5 columns below
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="theme">Theme</TabsTrigger>
            <TabsTrigger value="epic">Epic</TabsTrigger>
            <TabsTrigger value="capability">Capability</TabsTrigger>
            <TabsTrigger value="feature">Feature</TabsTrigger>
            <TabsTrigger value="story">Story</TabsTrigger>
            <TabsTrigger value="defect">Defect</TabsTrigger>
            <TabsTrigger value="objective">Objective</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-[2fr,1fr,1fr] gap-4 pb-2 border-b">
                  <div className="font-semibold text-sm">Column Name</div>
                  <div className="font-semibold text-sm text-center">Main View</div>
                  <div className="font-semibold text-sm text-center">Unassigned Backlog<br/>View</div>
                </div>

                {AVAILABLE_COLUMNS.map((column) => (
                  <div key={column.id} className="grid grid-cols-[2fr,1fr,1fr] gap-4 items-center py-2">
                    <Label htmlFor={`main-${column.id}`} className="text-sm font-normal cursor-pointer">
                      {column.label}
                    </Label>
                    <div className="flex justify-center">
                      <Checkbox
                        id={`main-${column.id}`}
                        checked={localSelection.includes(column.id)}
                        onCheckedChange={() => toggleColumn(column.id, false)}
                        disabled={!localSelection.includes(column.id) && localSelection.length >= 5}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Checkbox
                        id={`unassigned-${column.id}`}
                        checked={localUnassignedSelection.includes(column.id)}
                        onCheckedChange={() => toggleColumn(column.id, true)}
                        disabled={!localUnassignedSelection.includes(column.id) && localUnassignedSelection.length >= 5}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between items-center">
          <Button variant="ghost" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleApply} className="bg-primary">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
