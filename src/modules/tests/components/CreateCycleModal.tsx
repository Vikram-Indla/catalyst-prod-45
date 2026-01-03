/**
 * CREATE CYCLE MODAL
 * Modal for creating a new test cycle with name, dates, env, build, and set selection.
 * Generates executions for included test cases when sets are selected.
 */

import React, { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar as CalendarIcon, 
  Package,
  ChevronRight,
  RefreshCcw,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CreateCycleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  programId?: string;
}

interface TestSet {
  id: string;
  key: string;
  name: string;
  case_count?: number;
}

export function CreateCycleModal({ open, onOpenChange, projectId, programId }: CreateCycleModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [environment, setEnvironment] = useState('');
  const [buildVersion, setBuildVersion] = useState('');
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>([]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setStartDate(undefined);
      setEndDate(undefined);
      setEnvironment('');
      setBuildVersion('');
      setSelectedSetIds([]);
    }
  }, [open]);

  const scopeId = projectId || programId;
  const scopeColumn = projectId ? 'project_id' : 'program_id';

  // Fetch available test sets for this scope
  const { data: testSets, isLoading: setsLoading } = useQuery({
    queryKey: ['scope-test-sets', scopeId],
    queryFn: async () => {
      if (!scopeId) return [];
      
      const { data, error } = await supabase
        .from('test_sets')
        .select(`
          id, key, name,
          test_set_cases(id)
        `)
        .eq(scopeColumn, scopeId)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      
      return (data || []).map((set: any) => ({
        id: set.id,
        key: set.key,
        name: set.name,
        case_count: set.test_set_cases?.length || 0,
      })) as TestSet[];
    },
    enabled: open && !!scopeId,
  });

  // Create cycle mutation with execution generation
  const createCycleMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!name.trim()) throw new Error('Cycle name is required');

      // Generate cycle key
      const { data: existing } = await supabase
        .from('test_cycles')
        .select('key')
        .order('created_at', { ascending: false })
        .limit(1);

      const lastNum = existing?.[0]?.key?.match(/CYC-(\d+)/)?.[1];
      const nextNum = lastNum ? parseInt(lastNum) + 1 : 1;
      const key = `CYC-${nextNum.toString().padStart(3, '0')}`;

      // Create the cycle
      const { data: cycle, error: cycleError } = await supabase
        .from('test_cycles')
        .insert({
          key,
          name: name.trim(),
          objective: description.trim() || null,
          start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
          end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
          environment: environment.trim() || null,
          build_version: buildVersion.trim() || null,
          project_id: projectId || null,
          program_id: programId || null,
          status: 'planned',
          created_by: user.id,
        })
        .select()
        .single();

      if (cycleError) throw cycleError;

      // If sets are selected, link them and generate executions
      if (selectedSetIds.length > 0) {
        // Link sets to cycle
        const setLinks = selectedSetIds.map(setId => ({
          cycle_id: cycle.id,
          set_id: setId,
          added_by: user.id,
        }));

        const { error: linkError } = await supabase
          .from('test_cycle_sets')
          .insert(setLinks);

        if (linkError) throw linkError;

        // Get all test cases from selected sets
        const { data: setCases } = await supabase
          .from('test_set_cases')
          .select('case_id, case_version')
          .in('set_id', selectedSetIds);

        if (setCases && setCases.length > 0) {
          // Dedupe by case_id (a case can be in multiple sets)
          const uniqueCases = new Map<string, { case_id: string; case_version: number }>();
          setCases.forEach((sc: any) => {
            if (!uniqueCases.has(sc.case_id)) {
              uniqueCases.set(sc.case_id, {
                case_id: sc.case_id,
                case_version: sc.case_version || 1,
              });
            }
          });

          // Generate executions for each case
          const executions = Array.from(uniqueCases.values()).map(tc => ({
            cycle_id: cycle.id,
            case_id: tc.case_id,
            case_version: tc.case_version,
            status: 'not_executed',
          }));

          const { error: execError } = await supabase
            .from('test_cycle_executions')
            .insert(executions);

          if (execError) throw execError;
        }
      }

      // Log audit entry
      await supabase.from('test_activity_log').insert({
        user_id: user.id,
        activity_type: 'created',
        entity_type: 'test_cycle',
        entity_id: cycle.id,
        entity_title: cycle.name,
        description: `Created test cycle "${cycle.name}"${selectedSetIds.length > 0 ? ` with ${selectedSetIds.length} set(s)` : ''}`,
      });

      return cycle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-test-cycles', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-test-summary', projectId] });
      toast.success('Test cycle created');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleSet = (setId: string) => {
    setSelectedSetIds(prev =>
      prev.includes(setId)
        ? prev.filter(id => id !== setId)
        : [...prev, setId]
    );
  };

  const selectedCaseCount = testSets
    ?.filter(s => selectedSetIds.includes(s.id))
    .reduce((sum, s) => sum + (s.case_count || 0), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-1 border-border-default max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-text-primary flex items-center gap-2">
            <RefreshCcw className="h-5 w-5 text-accent-primary" />
            Create Test Cycle
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1">
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-text-primary">
                  Cycle Name <span className="text-status-error">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Sprint 14 Regression"
                  className="bg-surface-2 border-border-default"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-text-primary">
                  Objective / Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose of this test cycle..."
                  className="bg-surface-2 border-border-default min-h-[80px]"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-text-primary">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal bg-surface-2 border-border-default',
                        !startDate && 'text-text-tertiary'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'MMM d, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-surface-1 border-border-default">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-text-primary">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal bg-surface-2 border-border-default',
                        !endDate && 'text-text-tertiary'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'MMM d, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-surface-1 border-border-default">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => startDate ? date < startDate : false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Environment & Build */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="environment" className="text-text-primary">Environment</Label>
                <Input
                  id="environment"
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  placeholder="e.g., QA, Staging, UAT"
                  className="bg-surface-2 border-border-default"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="build" className="text-text-primary">Build Version</Label>
                <Input
                  id="build"
                  value={buildVersion}
                  onChange={(e) => setBuildVersion(e.target.value)}
                  placeholder="e.g., v2.3.1-rc1"
                  className="bg-surface-2 border-border-default"
                />
              </div>
            </div>

            {/* Test Sets Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-text-primary">Include Test Sets</Label>
                {selectedSetIds.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedSetIds.length} set(s) • {selectedCaseCount} case(s)
                  </Badge>
                )}
              </div>

              {setsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !testSets || testSets.length === 0 ? (
                <div className="bg-surface-2 border border-border-default rounded-lg p-4 text-center">
                  <AlertCircle className="h-8 w-8 mx-auto text-text-tertiary mb-2" />
                  <p className="text-text-secondary text-sm">
                    No test sets available. Create test sets first to include them in cycles.
                  </p>
                </div>
              ) : (
                <div className="border border-border-default rounded-lg divide-y divide-border-default max-h-[200px] overflow-auto">
                  {testSets.map((set) => (
                    <label
                      key={set.id}
                      className="flex items-center gap-3 p-3 hover:bg-surface-hover cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedSetIds.includes(set.id)}
                        onCheckedChange={() => toggleSet(set.id)}
                      />
                      <Package className="h-4 w-4 text-accent-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-text-primary font-medium truncate">
                            {set.name}
                          </span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {set.key}
                          </Badge>
                        </div>
                        <span className="text-xs text-text-tertiary">
                          {set.case_count} test case{set.case_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-text-tertiary" />
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t border-border-default pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createCycleMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => createCycleMutation.mutate()}
            disabled={!name.trim() || createCycleMutation.isPending}
          >
            {createCycleMutation.isPending ? 'Creating...' : 'Create Cycle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
