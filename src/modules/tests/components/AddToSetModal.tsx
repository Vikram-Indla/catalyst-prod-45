/**
 * Add to Set Modal
 * Select a test set to add test cases to
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Layers, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface AddToSetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseIds: string[];
  scopeType: 'program' | 'project';
  scopeId: string;
  onSuccess?: () => void;
}

export function AddToSetModal({
  open,
  onOpenChange,
  caseIds,
  scopeType,
  scopeId,
  onSuccess,
}: AddToSetModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);

  // Fetch available sets
  const { data: sets = [], isLoading } = useQuery({
    queryKey: ['test-sets-for-modal', scopeId],
    queryFn: async () => {
      let query = supabase
        .from('test_sets')
        .select('id, name, key, status')
        .neq('status', 'archived')
        .order('name', { ascending: true });

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

  const filtered = sets.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.key?.toLowerCase().includes(search.toLowerCase())
  );

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSetId || !user) throw new Error('Select a set');
      const context = createPipelineContext(user.id, scopeType, scopeId);

      // Get max sort order
      const { data: existing } = await supabase
        .from('test_set_cases')
        .select('sort_order')
        .eq('set_id', selectedSetId)
        .order('sort_order', { ascending: false })
        .limit(1);

      let sortOrder = (existing?.[0]?.sort_order || 0) + 1;

      const inserts = caseIds.map(caseId => ({
        set_id: selectedSetId,
        case_id: caseId,
        sort_order: sortOrder++,
        added_by: user.id,
      }));

      return runMutationWithAudit({ setId: selectedSetId, caseIds }, {
        context,
        action: 'link',
        entityType: 'test_sets',
        activityType: 'cases_added',
        successMessage: `${caseIds.length} case(s) added to set`,
        queryClient,
        invalidateKeys: [
          ['test-sets', scopeId],
          ['test-set', selectedSetId],
        ],
        mutationFn: async () => {
          const { error } = await supabase.from('test_set_cases').insert(inserts);
          if (error) throw new PipelineError('unknown', error.message);
          return { setId: selectedSetId, count: caseIds.length };
        },
        getAuditInfo: () => ({
          entityId: selectedSetId!,
          description: `Added ${caseIds.length} case(s) to set`,
          metadata: { caseIds },
        }),
      });
    },
    onSuccess: () => {
      onOpenChange(false);
      setSelectedSetId(null);
      onSuccess?.();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-surface-1 border-border-default">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" />
            Add {caseIds.length} case(s) to Set
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              placeholder="Search sets..."
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
              <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
                No sets found
              </div>
            ) : (
              <div className="p-1">
                {filtered.map(set => (
                  <button
                    key={set.id}
                    onClick={() => setSelectedSetId(set.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors',
                      selectedSetId === set.id
                        ? 'bg-accent-subtle border border-accent-primary/30'
                        : 'hover:bg-surface-3'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{set.name}</p>
                      <p className="text-xs text-text-tertiary">{set.key}</p>
                    </div>
                    {selectedSetId === set.id && (
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
            disabled={!selectedSetId || addMutation.isPending}
            className="bg-accent-primary text-white"
          >
            {addMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            Add to Set
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
