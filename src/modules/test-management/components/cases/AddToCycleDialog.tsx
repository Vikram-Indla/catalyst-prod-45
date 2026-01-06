/**
 * Add to Cycle Dialog
 * Allows adding test cases to a test cycle
 */

import { useState } from 'react';
import { useTestCycles, useAddCasesToCycle } from '../../hooks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, PlayCircle } from 'lucide-react';

interface AddToCycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseIds: string[];
  projectId: string;
  onSuccess?: () => void;
}

export function AddToCycleDialog({ 
  open, 
  onOpenChange, 
  caseIds,
  projectId,
  onSuccess 
}: AddToCycleDialogProps) {
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  
  // Fetch available cycles (active or planned)
  const { data: cyclesData, isLoading: cyclesLoading } = useTestCycles({
    project_id: projectId,
    status: 'active', // Can only use single status with current API
  });
  
  const cycles = cyclesData?.data || [];
  
  const addToCycle = useAddCasesToCycle();

  const handleSubmit = async () => {
    if (!selectedCycleId || caseIds.length === 0) return;
    
    addToCycle.mutate(
      {
        cycleId: selectedCycleId,
        caseIds: caseIds,
      },
      {
        onSuccess: () => {
          onSuccess?.();
          onOpenChange(false);
          setSelectedCycleId('');
        },
      }
    );
  };

  const handleClose = () => {
    setSelectedCycleId('');
    onOpenChange(false);
  };

  const selectedCycle = cycles.find(c => c.id === selectedCycleId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-primary" />
            Add to Test Cycle
          </DialogTitle>
          <DialogDescription>
            Select a test cycle to add {caseIds.length} test case{caseIds.length > 1 ? 's' : ''} to.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Selected Cases Count */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Badge variant="secondary">{caseIds.length}</Badge>
            <span className="text-sm">test case{caseIds.length > 1 ? 's' : ''} selected</span>
          </div>

          {/* Cycle Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Cycle</label>
            <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a test cycle" />
              </SelectTrigger>
              <SelectContent>
                {cyclesLoading ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    Loading cycles...
                  </div>
                ) : cycles.length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    No active cycles available
                  </div>
                ) : (
                  cycles.map(cycle => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      <div className="flex items-center gap-2">
                        <span>{cycle.title}</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {cycle.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Cycle Info */}
          {selectedCycle && (
            <div className="p-3 border rounded-lg text-sm space-y-1 bg-muted/50">
              <div><strong>Cycle Key:</strong> {selectedCycle.cycle_key}</div>
              <div><strong>Environment:</strong> {selectedCycle.environment?.name || 'Not specified'}</div>
              <div><strong>Status:</strong> <span className="capitalize">{selectedCycle.status}</span></div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={addToCycle.isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedCycleId || addToCycle.isPending}
          >
            {addToCycle.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Add to Cycle
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
