/**
 * Add Sets to Cycle Modal
 * Allows selecting test sets to add to a test cycle
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Folder,
  PlayCircle,
  Zap,
  Loader2,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTestSetBulkOperations } from '../../hooks/useTestSetBulkOperations';

interface AddSetsToCycleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  preSelectedSetIds?: string[];
}

interface TestCycle {
  id: string;
  key: string;
  name: string;
  status: string;
}

interface TestSet {
  id: string;
  key: string;
  name: string;
  is_smart_set: boolean;
  case_count: number;
}

export function AddSetsToCycleModal({
  open,
  onOpenChange,
  programId,
  preSelectedSetIds = [],
}: AddSetsToCycleModalProps) {
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [selectedSetIds, setSelectedSetIds] = useState<Set<string>>(
    new Set(preSelectedSetIds)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const { addSetsToCycle, isAddingToCycle } = useTestSetBulkOperations();

  // Fetch active cycles
  const { data: cycles, isLoading: loadingCycles } = useQuery({
    queryKey: ['test-cycles-for-add', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_cycles')
        .select('id, key, name, status')
        .eq('program_id', programId)
        .in('status', ['draft', 'active', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as TestCycle[];
    },
    enabled: open && !!programId,
  });

  // Fetch test sets with case counts
  const { data: testSets, isLoading: loadingSets } = useQuery({
    queryKey: ['test-sets-for-add', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_sets')
        .select(`
          id, key, name, is_smart_set,
          test_set_cases(count)
        `)
        .eq('program_id', programId)
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []).map((set: any) => ({
        id: set.id,
        key: set.key,
        name: set.name,
        is_smart_set: set.is_smart_set,
        case_count: set.test_set_cases?.[0]?.count || 0,
      })) as TestSet[];
    },
    enabled: open && !!programId,
  });

  const filteredSets = useMemo(() => {
    if (!testSets) return [];
    if (!searchQuery) return testSets;
    const lower = searchQuery.toLowerCase();
    return testSets.filter(s => 
      s.name.toLowerCase().includes(lower) ||
      s.key.toLowerCase().includes(lower)
    );
  }, [testSets, searchQuery]);

  const toggleSetSelection = (setId: string) => {
    setSelectedSetIds(prev => {
      const next = new Set(prev);
      if (next.has(setId)) {
        next.delete(setId);
      } else {
        next.add(setId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedSetIds(new Set(filteredSets.map(s => s.id)));
  };

  const clearSelection = () => {
    setSelectedSetIds(new Set());
  };

  const totalCases = useMemo(() => {
    return testSets
      ?.filter(s => selectedSetIds.has(s.id))
      .reduce((sum, s) => sum + s.case_count, 0) || 0;
  }, [testSets, selectedSetIds]);

  const handleSubmit = async () => {
    if (!selectedCycleId || selectedSetIds.size === 0) return;
    
    await addSetsToCycle({
      setIds: Array.from(selectedSetIds),
      cycleId: selectedCycleId,
    });

    setSelectedSetIds(new Set());
    setSelectedCycleId(null);
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedSetIds(new Set(preSelectedSetIds));
    setSelectedCycleId(null);
    setSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-accent-primary" />
            Add Sets to Cycle
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden space-y-4">
          {/* Cycle Selection */}
          <div>
            <label className="text-sm font-medium text-text-secondary block mb-1.5">
              Target Cycle *
            </label>
            <Select value={selectedCycleId || ''} onValueChange={setSelectedCycleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a test cycle..." />
              </SelectTrigger>
              <SelectContent>
                {loadingCycles ? (
                  <div className="p-2">
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : cycles?.length === 0 ? (
                  <div className="p-4 text-center text-text-tertiary text-sm">
                    No active cycles available
                  </div>
                ) : (
                  cycles?.map(cycle => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      <div className="flex items-center gap-2">
                        <span>{cycle.name}</span>
                        <Badge variant="outline" className="text-xs">{cycle.status}</Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Set Selection */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text-secondary">
                Test Sets to Add
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  className="text-xs h-7"
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="text-xs h-7"
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-quaternary" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search sets..."
                className="pl-9"
              />
            </div>

            <ScrollArea className="flex-1 border border-border-default rounded-lg">
              {loadingSets ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : filteredSets.length === 0 ? (
                <div className="p-8 text-center text-text-tertiary">
                  <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No test sets found</p>
                </div>
              ) : (
                <div className="divide-y divide-border-default">
                  {filteredSets.map(set => (
                    <label
                      key={set.id}
                      className={cn(
                        'flex items-center gap-3 p-3 cursor-pointer transition-colors',
                        selectedSetIds.has(set.id)
                          ? 'bg-accent-subtle'
                          : 'hover:bg-surface-2'
                      )}
                    >
                      <Checkbox
                        checked={selectedSetIds.has(set.id)}
                        onCheckedChange={() => toggleSetSelection(set.id)}
                      />
                      <Folder className="h-4 w-4 text-accent-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary truncate">
                            {set.name}
                          </span>
                          {set.is_smart_set && (
                            <Badge variant="outline" className="text-xs text-status-warning border-status-warning">
                              <Zap className="h-3 w-3 mr-0.5" />
                              Smart
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-xs">{set.key}</Badge>
                          <span className="text-xs text-text-tertiary flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {set.case_count} cases
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Summary */}
          {selectedSetIds.size > 0 && (
            <div className="p-3 bg-accent-subtle rounded-lg border border-accent-primary/20">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  {selectedSetIds.size} sets selected
                </span>
                <span className="font-medium text-accent-primary">
                  {totalCases} total cases
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t border-border-default">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedCycleId || selectedSetIds.size === 0 || isAddingToCycle}
          >
            {isAddingToCycle && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add to Cycle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
