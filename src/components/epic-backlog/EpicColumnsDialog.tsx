import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EpicColumnsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedColumnsMain: string[];
  selectedColumnsSmall: string[];
  onColumnsChange: (main: string[], small: string[]) => void;
}

const AVAILABLE_COLUMNS = [
  'Strategic Driver',
  'Dependency',
  'Acceptance Criteria',
  'Age',
  'Blocked',
  'Budget',
  'Capitalized',
  'Child Count',
  'Customers',
  'Investment Type',
  'MVP',
  'Owner',
  'Points',
  'Process Step',
  'Score',
  'Story Point Progress',
  'Story Points',
  'Tag',
  'T-Shirt Size',
  'Type',
  'Value',
  'Weeks WSJF',
  'Objectives',
];

export function EpicColumnsDialog({ 
  open, 
  onOpenChange, 
  selectedColumnsMain, 
  selectedColumnsSmall, 
  onColumnsChange 
}: EpicColumnsDialogProps) {
  const [mainColumns, setMainColumns] = useState<string[]>(selectedColumnsMain);
  const [smallColumns, setSmallColumns] = useState<string[]>(selectedColumnsSmall);

  useEffect(() => {
    setMainColumns(selectedColumnsMain);
    setSmallColumns(selectedColumnsSmall);
  }, [selectedColumnsMain, selectedColumnsSmall]);

  const handleMainColumnToggle = (column: string) => {
    setMainColumns(prev => {
      if (prev.includes(column)) {
        return prev.filter(c => c !== column);
      } else if (prev.length < 5) {
        return [...prev, column];
      }
      return prev;
    });
  };

  const handleSmallColumnToggle = (column: string) => {
    setSmallColumns(prev => {
      if (prev.includes(column)) {
        return prev.filter(c => c !== column);
      } else if (prev.length < 2) {
        return [...prev, column];
      }
      return prev;
    });
  };

  const handleApply = () => {
    onColumnsChange(mainColumns, smallColumns);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Columns</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="main" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="main">Main View (Max 5)</TabsTrigger>
            <TabsTrigger value="small">Small View (Max 2)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="main" className="space-y-2 pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Selected: {mainColumns.length} / 5
            </p>
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_COLUMNS.map((column) => (
                <div key={column} className="flex items-center space-x-2">
                  <Checkbox
                    id={`main-${column}`}
                    checked={mainColumns.includes(column)}
                    onCheckedChange={() => handleMainColumnToggle(column)}
                    disabled={!mainColumns.includes(column) && mainColumns.length >= 5}
                  />
                  <Label 
                    htmlFor={`main-${column}`}
                    className={!mainColumns.includes(column) && mainColumns.length >= 5 ? 'text-muted-foreground' : ''}
                  >
                    {column}
                  </Label>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="small" className="space-y-2 pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Selected: {smallColumns.length} / 2
            </p>
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_COLUMNS.map((column) => (
                <div key={column} className="flex items-center space-x-2">
                  <Checkbox
                    id={`small-${column}`}
                    checked={smallColumns.includes(column)}
                    onCheckedChange={() => handleSmallColumnToggle(column)}
                    disabled={!smallColumns.includes(column) && smallColumns.length >= 2}
                  />
                  <Label 
                    htmlFor={`small-${column}`}
                    className={!smallColumns.includes(column) && smallColumns.length >= 2 ? 'text-muted-foreground' : ''}
                  >
                    {column}
                  </Label>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
