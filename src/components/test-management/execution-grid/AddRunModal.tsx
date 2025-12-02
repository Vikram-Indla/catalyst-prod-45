/**
 * Add Run Modal - Create new test runs in a cycle
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, Plus } from 'lucide-react';
import type { ExecutionRun } from '@/types/executionGrid';

interface AddRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (runName: string, copyFromRunId?: string, copyAssignments?: boolean, copyResults?: boolean) => void;
  existingRuns: ExecutionRun[];
  isLoading?: boolean;
}

export const AddRunModal: React.FC<AddRunModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingRuns,
  isLoading = false,
}) => {
  const [runName, setRunName] = useState('');
  const [copyFromRunId, setCopyFromRunId] = useState<string | undefined>();
  const [copyAssignments, setCopyAssignments] = useState(true);
  const [copyResults, setCopyResults] = useState(false);

  const handleSubmit = () => {
    onAdd(runName || `Run ${existingRuns.length + 1}`, copyFromRunId, copyAssignments, copyResults);
    setRunName('');
    setCopyFromRunId(undefined);
    setCopyAssignments(true);
    setCopyResults(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-brand-gold" />
            Add New Run
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="runName">Run Name</Label>
            <Input
              id="runName"
              value={runName}
              onChange={(e) => setRunName(e.target.value)}
              placeholder={`Run ${existingRuns.length + 1}`}
            />
          </div>

          {existingRuns.length > 0 && (
            <>
              <div className="space-y-2">
                <Label>Copy From Existing Run</Label>
                <Select value={copyFromRunId || 'none'} onValueChange={(v) => setCopyFromRunId(v === 'none' ? undefined : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Start fresh" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Start fresh</SelectItem>
                    {existingRuns.map((run) => (
                      <SelectItem key={run.id} value={run.id}>
                        <span className="flex items-center gap-2">
                          <Copy className="h-3 w-3" />
                          {run.runName}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {copyFromRunId && (
                <div className="space-y-3 pl-2 border-l-2 border-brand-gold/30">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="copyAssignments"
                      checked={copyAssignments}
                      onCheckedChange={(checked) => setCopyAssignments(checked === true)}
                    />
                    <Label htmlFor="copyAssignments" className="text-sm font-normal">
                      Copy tester assignments
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="copyResults"
                      checked={copyResults}
                      onCheckedChange={(checked) => setCopyResults(checked === true)}
                    />
                    <Label htmlFor="copyResults" className="text-sm font-normal">
                      Copy execution results
                    </Label>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="bg-brand-gold hover:bg-brand-gold-hover text-brand-dark">
            {isLoading ? 'Adding...' : 'Add Run'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
