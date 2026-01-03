/**
 * Shared Step Picker Modal
 * Allows selecting steps from the shared step library to add to a test case
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Library,
  Plus,
  Link2,
  Loader2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SharedStepPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testCaseId: string;
  currentStepCount: number;
  onSuccess: () => void;
}

interface SharedStep {
  id: string;
  title: string;
  description: string;
  expected_result: string | null;
  usage_count: number | null;
}

export function SharedStepPickerModal({
  open,
  onOpenChange,
  testCaseId,
  currentStepCount,
  onSuccess,
}: SharedStepPickerModalProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch shared steps
  const { data: sharedSteps = [], isLoading } = useQuery({
    queryKey: ['shared-test-steps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shared_test_steps')
        .select('*')
        .order('usage_count', { ascending: false });
      if (error) throw error;
      return data as SharedStep[];
    },
    enabled: open,
  });

  // Filter by search
  const filteredSteps = useMemo(() => {
    if (!searchQuery.trim()) return sharedSteps;
    const q = searchQuery.toLowerCase();
    return sharedSteps.filter(
      s =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }, [sharedSteps, searchQuery]);

  // Add mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      const stepIds = Array.from(selectedIds);
      const stepsToAdd = sharedSteps.filter(s => stepIds.includes(s.id));
      
      // Add as regular test steps with library_step_id reference
      let order = currentStepCount;
      for (const step of stepsToAdd) {
        order += 1;
        
        // Insert into test_steps
        const { error } = await supabase.from('test_steps').insert({
          test_case_id: testCaseId,
          step_order: order,
          action: step.description,
          expected_result: step.expected_result,
          is_shared: true,
          library_step_id: step.id,
        });
        if (error) throw error;
        
        // Increment usage count
        await supabase.from('shared_test_steps')
          .update({ usage_count: (step.usage_count || 0) + 1 })
          .eq('id', step.id);
      }
      
      return stepsToAdd.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['test-case-steps', testCaseId] });
      toast.success(`Added ${count} step${count > 1 ? 's' : ''} from library`);
      setSelectedIds(new Set());
      setSearchQuery('');
      onOpenChange(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-surface-1 border-border-default max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Library className="h-4 w-4" />
            Add Steps from Library
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search shared steps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-surface-2 border-border-default"
          />
        </div>

        {/* Steps List */}
        <ScrollArea className="flex-1 max-h-[400px] -mx-6 px-6">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredSteps.length === 0 ? (
            <div className="text-center py-8">
              <Library className="h-10 w-10 mx-auto mb-2 text-text-quaternary" />
              <p className="text-sm text-text-tertiary">No shared steps found</p>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {filteredSteps.map(step => (
                <div
                  key={step.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedIds.has(step.id)
                      ? 'bg-accent-subtle border-accent-primary'
                      : 'bg-surface-2 border-border-default hover:border-border-emphasis'
                  }`}
                  onClick={() => toggleSelect(step.id)}
                >
                  <Checkbox
                    checked={selectedIds.has(step.id)}
                    onCheckedChange={() => toggleSelect(step.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-text-primary">
                        {step.title}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        <Link2 className="h-2.5 w-2.5 mr-0.5" />
                        {step.usage_count || 0}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-secondary line-clamp-2">
                      {step.description}
                    </p>
                    {step.expected_result && (
                      <p className="text-[11px] text-text-tertiary mt-1">
                        <span className="font-medium">Expected:</span> {step.expected_result}
                      </p>
                    )}
                  </div>
                  {selectedIds.has(step.id) && (
                    <Check className="h-4 w-4 text-accent-primary shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="mt-4">
          <div className="flex items-center gap-2 mr-auto text-sm text-text-tertiary">
            {selectedIds.size > 0 && `${selectedIds.size} selected`}
          </div>
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => addMutation.mutate()}
            disabled={selectedIds.size === 0 || addMutation.isPending}
            className="bg-accent-primary text-white"
          >
            {addMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            <Plus className="h-3 w-3 mr-1" />
            Add {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
