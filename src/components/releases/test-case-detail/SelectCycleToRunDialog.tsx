/**
 * SelectCycleToRunDialog
 * 
 * Dialog that appears when a test case is in multiple cycles,
 * allowing the user to select which cycle context to execute in.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play } from 'lucide-react';
import type { CycleForTestCase } from '@/hooks/test-cycles/useCyclesForTestCase';

interface SelectCycleToRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycles: CycleForTestCase[];
  onSelectCycle: (cycle: CycleForTestCase) => void;
}

const statusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-blue-100 text-blue-700',
  planned: 'bg-gray-100 text-gray-700',
};

export function SelectCycleToRunDialog({
  open,
  onOpenChange,
  cycles,
  onSelectCycle,
}: SelectCycleToRunDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Cycle to Run In</DialogTitle>
          <DialogDescription>
            This test case is included in multiple cycles. Select which cycle context to execute in.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 mt-4">
          {cycles.map((cycle) => (
            <Button
              key={cycle.cycleId}
              variant="outline"
              className="w-full justify-between h-auto py-3"
              onClick={() => {
                onSelectCycle(cycle);
                onOpenChange(false);
              }}
            >
              <div className="flex flex-col items-start">
                <span className="font-mono text-sm text-primary">{cycle.cycleKey}</span>
                <span className="text-sm text-muted-foreground">{cycle.cycleName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={statusColors[cycle.cycleStatus] || 'bg-gray-100 text-gray-700'}>
                  {cycle.cycleStatus.replace('_', ' ')}
                </Badge>
                <Play className="w-4 h-4" />
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
