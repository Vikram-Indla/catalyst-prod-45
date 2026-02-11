import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Calendar } from 'lucide-react';
import { useTestCycles } from '@/hooks/test-management/useTestCycles';
import { TestSet } from '@/types/test-sets';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface AddToCycleModalProps {
  open: boolean;
  onClose: () => void;
  testSet: TestSet;
}

export function AddToCycleModal({ open, onClose, testSet }: AddToCycleModalProps) {
  const queryClient = useQueryClient();
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');

  const { data: cycles, isLoading } = useTestCycles(testSet.project_id, {
    status: ['PLANNED', 'IN_PROGRESS'],
  });

  const addToCycleMutation = useMutation({
    mutationFn: async ({ cycleId, testSetId }: { cycleId: string; testSetId: string }) => {
      // Get test cases in the set
      const { data: setTestCases, error: fetchError } = await supabase
        .from('tm_test_set_cases' as any)
        .select('test_case_id')
        .eq('test_set_id', testSetId);

      if (fetchError) throw fetchError;
      if (!setTestCases || (setTestCases as any[]).length === 0) {
        throw new Error('Test set has no test cases');
      }

      // Get existing cases in cycle to avoid dupes
      const { data: existingCases } = await supabase
        .from('tm_cycle_test_cases' as any)
        .select('test_case_id')
        .eq('cycle_id', cycleId);

      const existingIds = new Set((existingCases as any[] || []).map((c: any) => c.test_case_id));
      const newTestCases = (setTestCases as any[]).filter(
        (tc: any) => !existingIds.has(tc.test_case_id)
      );

      if (newTestCases.length === 0) {
        return { added: 0, skipped: (setTestCases as any[]).length };
      }

      const { error: insertError } = await supabase
        .from('tm_cycle_test_cases' as any)
        .insert(
          newTestCases.map((tc: any) => ({
            cycle_id: cycleId,
            test_case_id: tc.test_case_id,
            execution_status: 'not_run',
          }))
        );

      if (insertError) throw insertError;
      return {
        added: newTestCases.length,
        skipped: (setTestCases as any[]).length - newTestCases.length,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['cycle-test-cases'] });

      if (result.skipped > 0) {
        toast.success(`Added ${result.added} test cases (${result.skipped} already in cycle)`);
      } else {
        toast.success(`Added ${result.added} test cases to cycle`);
      }
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add test cases to cycle');
    },
  });

  const handleAdd = () => {
    if (!selectedCycleId) {
      toast.error('Please select a cycle');
      return;
    }
    addToCycleMutation.mutate({ cycleId: selectedCycleId, testSetId: testSet.id });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Test Cycle</DialogTitle>
          <DialogDescription>
            Add all {testSet.test_count} test cases from &quot;{testSet.name}&quot; to an existing cycle
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !cycles?.length ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                No active test cycles available
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <RadioGroup value={selectedCycleId} onValueChange={setSelectedCycleId}>
                <div className="space-y-2">
                  {cycles.map((cycle: any) => (
                    <Label
                      key={cycle.id}
                      htmlFor={cycle.id}
                      className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      <RadioGroupItem value={cycle.id} id={cycle.id} />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{cycle.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {cycle.cycle_key} • Updated{' '}
                          {formatDistanceToNow(new Date(cycle.updated_at), { addSuffix: true })}
                        </p>
                      </div>
                    </Label>
                  ))}
                </div>
              </RadioGroup>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedCycleId || addToCycleMutation.isPending}
          >
            {addToCycleMutation.isPending ? 'Adding...' : 'Add to Cycle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
