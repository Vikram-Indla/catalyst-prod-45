/**
 * Add Cases to Cycle Modal
 * Allows adding individual test cases or entire sets to a cycle
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  FileText,
  Folder,
  Loader2,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface AddCasesToCycleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleId: string;
  cycleName: string;
  programId: string;
  isScopeLocked: boolean;
}

interface TestCase {
  id: string;
  key: string;
  title: string;
  status: string;
  priority: string;
}

interface TestSet {
  id: string;
  key: string;
  name: string;
  is_smart_set: boolean;
  case_count: number;
}

export function AddCasesToCycleModal({
  open,
  onOpenChange,
  cycleId,
  cycleName,
  programId,
  isScopeLocked,
}: AddCasesToCycleModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'cases' | 'sets'>('cases');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
  const [selectedSetIds, setSelectedSetIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch existing executions to filter out already-added cases
  const { data: existingExecutions } = useQuery({
    queryKey: ['cycle-executions-ids', cycleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_cycle_executions')
        .select('case_id')
        .eq('cycle_id', cycleId);
      if (error) throw error;
      return new Set((data || []).map(e => e.case_id));
    },
    enabled: open && !!cycleId,
  });

  // Fetch test cases - using any to avoid TypeScript deep instantiation issues
  const { data: testCases, isLoading: loadingCases } = useQuery<TestCase[]>({
    queryKey: ['test-cases-for-cycle', programId],
    queryFn: async () => {
      if (!programId) return [];
      // Cast to any to avoid TS2589 deep type instantiation error
      const client = supabase as any;
      const result = await client
        .from('test_cases')
        .select('id, title, status, priority')
        .eq('program_id', programId)
        .eq('is_deleted', false);
        
      if (result.error) throw result.error;
      return (result.data || []).map((tc: any) => ({
        id: tc.id,
        key: `TC-${tc.id.substring(0, 6).toUpperCase()}`,
        title: tc.title || '',
        status: tc.status || 'draft',
        priority: tc.priority || 'medium',
      }));
    },
    enabled: open && !!programId,
  });

  // Fetch test sets
  const { data: testSets, isLoading: loadingSets } = useQuery({
    queryKey: ['test-sets-for-cycle', programId],
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
      return (data || []).map((s: any) => ({
        id: s.id,
        key: s.key,
        name: s.name,
        is_smart_set: s.is_smart_set,
        case_count: s.test_set_cases?.[0]?.count || 0,
      })) as TestSet[];
    },
    enabled: open && !!programId,
  });

  // Filter cases not already in cycle
  const availableCases = useMemo(() => {
    if (!testCases || !existingExecutions) return [];
    return testCases
      .filter(c => !existingExecutions.has(c.id))
      .filter(c => !searchQuery || 
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.key.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [testCases, existingExecutions, searchQuery]);

  // Filter sets
  const filteredSets = useMemo(() => {
    if (!testSets) return [];
    return testSets.filter(s => !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.key.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [testSets, searchQuery]);

  const toggleCaseSelection = (caseId: string) => {
    setSelectedCaseIds(prev => {
      const next = new Set(prev);
      if (next.has(caseId)) {
        next.delete(caseId);
      } else {
        next.add(caseId);
      }
      return next;
    });
  };

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

  const selectAllCases = () => {
    setSelectedCaseIds(new Set(availableCases.map(c => c.id)));
  };

  const clearCaseSelection = () => {
    setSelectedCaseIds(new Set());
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      let addedCount = 0;

      // Add individual cases
      if (selectedCaseIds.size > 0) {
        const inserts = Array.from(selectedCaseIds).map(caseId => ({
          cycle_id: cycleId,
          case_id: caseId,
          status: 'not_run',
        }));

        const { error } = await supabase
          .from('test_cycle_executions')
          .insert(inserts);

        if (error) throw error;
        addedCount += selectedCaseIds.size;
      }

      // Add cases from selected sets
      if (selectedSetIds.size > 0) {
        for (const setId of selectedSetIds) {
          // Get cases from set
          const { data: setCases } = await supabase
            .from('test_set_cases')
            .select('case_id, case_version')
            .eq('set_id', setId);

          if (setCases && setCases.length > 0) {
            // Filter out cases already in cycle
            const newCases = setCases.filter(sc => !existingExecutions?.has(sc.case_id));

            if (newCases.length > 0) {
              const inserts = newCases.map(sc => ({
                cycle_id: cycleId,
                case_id: sc.case_id,
                case_version: sc.case_version || 1,
                status: 'not_run',
              }));

              const { error } = await supabase
                .from('test_cycle_executions')
                .insert(inserts);

              if (error) throw error;
              addedCount += newCases.length;
            }
          }
        }
      }

      // Log activity
      await supabase.from('test_activity_log').insert({
        user_id: user.id,
        activity_type: 'cases_added',
        entity_type: 'test_cycle',
        entity_id: cycleId,
        entity_title: cycleName,
        description: `Added ${addedCount} cases to cycle`,
      });

      toast.success(`Added ${addedCount} cases to cycle`);
      queryClient.invalidateQueries({ queryKey: ['cycle-executions', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      
      setSelectedCaseIds(new Set());
      setSelectedSetIds(new Set());
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedCaseIds(new Set());
    setSelectedSetIds(new Set());
    setSearchQuery('');
    setActiveTab('cases');
    onOpenChange(false);
  };

  const totalSelected = selectedCaseIds.size + selectedSetIds.size;

  if (isScopeLocked) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-status-warning" />
              Scope Locked
            </DialogTitle>
          </DialogHeader>
          <p className="text-text-secondary">
            This cycle's scope is locked. Unlock the scope to add or remove test cases.
          </p>
          <DialogFooter>
            <Button onClick={handleClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent-primary" />
            Add Cases to "{cycleName}"
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'cases' | 'sets')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cases">
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Individual Cases
            </TabsTrigger>
            <TabsTrigger value="sets">
              <Folder className="h-3.5 w-3.5 mr-1.5" />
              From Test Sets
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 my-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-quaternary" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'cases' ? 'Search cases...' : 'Search sets...'}
                className="pl-9"
              />
            </div>
            {activeTab === 'cases' && availableCases.length > 0 && (
              <>
                <Button variant="ghost" size="sm" onClick={selectAllCases}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={clearCaseSelection}>
                  Clear
                </Button>
              </>
            )}
          </div>

          <TabsContent value="cases" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-[350px] border border-border-default rounded-lg">
              {loadingCases ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : availableCases.length === 0 ? (
                <div className="p-8 text-center text-text-tertiary">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No available cases to add</p>
                  <p className="text-xs mt-1">All cases may already be in this cycle</p>
                </div>
              ) : (
                <div className="divide-y divide-border-default">
                  {availableCases.map(tc => (
                    <label
                      key={tc.id}
                      className={cn(
                        'flex items-center gap-3 p-3 cursor-pointer transition-colors',
                        selectedCaseIds.has(tc.id)
                          ? 'bg-accent-subtle'
                          : 'hover:bg-surface-2'
                      )}
                    >
                      <Checkbox
                        checked={selectedCaseIds.has(tc.id)}
                        onCheckedChange={() => toggleCaseSelection(tc.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary truncate">
                            {tc.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-xs">{tc.key}</Badge>
                          <Badge variant="secondary" className="text-xs">{tc.priority}</Badge>
                          <Badge variant="secondary" className="text-xs">{tc.status}</Badge>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="sets" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-[350px] border border-border-default rounded-lg">
              {loadingSets ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
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
                          <span className="text-xs text-text-tertiary">
                            {set.case_count} cases
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Selection Summary */}
        {totalSelected > 0 && (
          <div className="p-3 bg-accent-subtle rounded-lg border border-accent-primary/20 mt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">
                {selectedCaseIds.size > 0 && `${selectedCaseIds.size} cases`}
                {selectedCaseIds.size > 0 && selectedSetIds.size > 0 && ', '}
                {selectedSetIds.size > 0 && `${selectedSetIds.size} sets`}
                {' '}selected
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="pt-4 border-t border-border-default mt-3">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={totalSelected === 0 || isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add to Cycle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
