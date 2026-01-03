/**
 * Add to Cycle Modal
 * Select a test cycle to add test cases to
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, PlayCircle, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  runMutationWithAudit,
  createPipelineContext,
  PipelineError,
} from '../lib/actionPipeline';

interface AddToCycleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseIds: string[];
  scopeType: 'program' | 'project';
  scopeId: string;
  onSuccess?: () => void;
}

export function AddToCycleModal({
  open,
  onOpenChange,
  caseIds,
  scopeType,
  scopeId,
  onSuccess,
}: AddToCycleModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  // Fetch available cycles (only planned/in_progress)
  const { data: cycles = [], isLoading } = useQuery({
    queryKey: ['test-cycles-for-modal', scopeId],
    queryFn: async () => {
      let query = supabase
        .from('test_cycles')
        .select('id, name, key, status, environment')
        .in('status', ['planned', 'in_progress'])
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (scopeType === 'project') {
        query = query.eq('project_id', scopeId);
      } else {
        query = query.eq('program_id', scopeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const filtered = cycles.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.key?.toLowerCase().includes(search.toLowerCase())
  );

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCycleId || !user) throw new Error('Select a cycle');
      const context = createPipelineContext(user.id, scopeType, scopeId);

      // Create execution records for each case
      const inserts = caseIds.map(caseId => ({
        cycle_id: selectedCycleId,
        case_id: caseId,
        status: 'not_run',
        assigned_to: user.id,
      }));

      return runMutationWithAudit({ cycleId: selectedCycleId, caseIds }, {
        context,
        action: 'link',
        entityType: 'test_cycles',
        activityType: 'cases_added',
        successMessage: `${caseIds.length} case(s) added to cycle`,
        queryClient,
        invalidateKeys: [
          ['test-cycles', scopeId],
          ['test-cycle', selectedCycleId],
        ],
        mutationFn: async () => {
          const { error } = await supabase.from('test_cycle_executions').insert(inserts);
          if (error) throw new PipelineError('unknown', error.message);
          return { cycleId: selectedCycleId, count: caseIds.length };
        },
        getAuditInfo: () => ({
          entityId: selectedCycleId!,
          description: `Added ${caseIds.length} case(s) to cycle`,
          metadata: { caseIds },
        }),
      });
    },
    onSuccess: () => {
      onOpenChange(false);
      setSelectedCycleId(null);
      onSuccess?.();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-surface-1 border-border-default">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <PlayCircle className="h-4 w-4" />
            Add {caseIds.length} case(s) to Cycle
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              placeholder="Search cycles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-surface-2"
            />
          </div>

          <ScrollArea className="h-[250px] border border-border-default rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-text-tertiary text-sm gap-1">
                <p>No active cycles found</p>
                <p className="text-xs">Create a cycle first</p>
              </div>
            ) : (
              <div className="p-1">
                {filtered.map(cycle => (
                  <button
                    key={cycle.id}
                    onClick={() => setSelectedCycleId(cycle.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors',
                      selectedCycleId === cycle.id
                        ? 'bg-accent-subtle border border-accent-primary/30'
                        : 'hover:bg-surface-3'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{cycle.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-tertiary">{cycle.key}</span>
                        {cycle.environment && (
                          <Badge variant="outline" className="text-[10px] h-4">
                            {cycle.environment}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[10px]',
                        cycle.status === 'in_progress' && 'bg-status-warning/10 text-status-warning'
                      )}
                    >
                      {cycle.status}
                    </Badge>
                    {selectedCycleId === cycle.id && (
                      <Check className="h-4 w-4 text-accent-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => addMutation.mutate()}
            disabled={!selectedCycleId || addMutation.isPending}
            className="bg-accent-primary text-white"
          >
            {addMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            Add to Cycle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
