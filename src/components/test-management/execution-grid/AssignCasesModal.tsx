/**
 * Assign Cases Modal - Assign test cases to testers
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, User, CheckCircle2 } from 'lucide-react';
import type { ExecutionTester, ExecutionGridRow } from '@/types/executionGrid';

interface AssignCasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (assignments: Array<{ caseId: string; testerId: string; runNumber: number }>) => void;
  selectedCases: ExecutionGridRow[];
  testers: ExecutionTester[];
  runNumber: number;
  isLoading?: boolean;
}

export const AssignCasesModal: React.FC<AssignCasesModalProps> = ({
  isOpen,
  onClose,
  onAssign,
  selectedCases,
  testers,
  runNumber,
  isLoading = false,
}) => {
  const [selectedTesterId, setSelectedTesterId] = useState<string | null>(null);
  const [distributeEvenly, setDistributeEvenly] = useState(false);

  const handleAssign = () => {
    if (distributeEvenly && testers.length > 0) {
      // Distribute cases evenly among testers
      const assignments = selectedCases.map((caseItem, idx) => ({
        caseId: caseItem.caseId,
        testerId: testers[idx % testers.length].id,
        runNumber,
      }));
      onAssign(assignments);
    } else if (selectedTesterId) {
      // Assign all to selected tester
      const assignments = selectedCases.map((caseItem) => ({
        caseId: caseItem.caseId,
        testerId: selectedTesterId,
        runNumber,
      }));
      onAssign(assignments);
    }
    setSelectedTesterId(null);
    setDistributeEvenly(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-gold" />
            Assign Test Cases
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            Assigning {selectedCases.length} test case(s) for Run {runNumber}
          </div>

          <div className="flex items-center space-x-2 pb-4 border-b border-border">
            <Checkbox
              id="distribute"
              checked={distributeEvenly}
              onCheckedChange={(checked) => {
                setDistributeEvenly(checked === true);
                if (checked) setSelectedTesterId(null);
              }}
            />
            <label htmlFor="distribute" className="text-sm font-medium">
              Distribute evenly among all testers
            </label>
          </div>

          {!distributeEvenly && (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {testers.map((tester) => (
                  <div
                    key={tester.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTesterId === tester.id
                        ? 'border-brand-gold bg-brand-gold/10'
                        : 'border-border hover:border-brand-gold/50'
                    }`}
                    onClick={() => setSelectedTesterId(tester.id)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={tester.avatarUrl} />
                      <AvatarFallback className="bg-brand-gold/20 text-brand-gold text-xs">
                        {tester.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{tester.name}</div>
                      <div className="text-xs text-muted-foreground">{tester.email}</div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {tester.assignedCases} assigned
                      </Badge>
                    </div>
                    {selectedTesterId === tester.id && (
                      <CheckCircle2 className="h-5 w-5 text-brand-gold" />
                    )}
                  </div>
                ))}

                {testers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No testers available</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {distributeEvenly && testers.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm font-medium mb-2">Distribution Preview</div>
              <div className="space-y-1">
                {testers.map((tester, idx) => {
                  const casesForTester = selectedCases.filter((_, i) => i % testers.length === idx);
                  return (
                    <div key={tester.id} className="flex items-center justify-between text-sm">
                      <span>{tester.name}</span>
                      <Badge variant="secondary">{casesForTester.length} cases</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isLoading || (!selectedTesterId && !distributeEvenly)}
            className="bg-brand-gold hover:bg-brand-gold-hover text-brand-dark"
          >
            {isLoading ? 'Assigning...' : 'Assign Cases'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
