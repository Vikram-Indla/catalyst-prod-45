/**
 * CREATE TEST SET MODAL
 * Modal for creating a new test set with name, description, and optional case selection
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
import { Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { runMutationWithAudit, createPipelineContext } from '../lib/actionPipeline';
import { ScopeType } from '../hooks/useGlobalTestScope';

interface CreateTestSetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scopeType: ScopeType;
  scopeId: string | null;
}

export function CreateTestSetModal({ open, onOpenChange, scopeType, scopeId }: CreateTestSetModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [objective, setObjective] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setObjective('');
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!name.trim()) throw new Error('Set name is required');

      const context = createPipelineContext(
        user.id,
        scopeType === 'project' ? 'project' : scopeType === 'program' ? 'program' : 'global',
        scopeId,
        scopeType === 'program' ? scopeId : null,
        scopeType === 'project' ? scopeId : null
      );

      // Generate key
      const { data: existing } = await supabase
        .from('test_sets')
        .select('key')
        .order('created_at', { ascending: false })
        .limit(1);

      const lastNum = (existing?.[0] as any)?.key?.match(/SET-(\d+)/)?.[1];
      const nextNum = lastNum ? parseInt(lastNum) + 1 : 1;
      const key = `SET-${nextNum.toString().padStart(3, '0')}`;

      return runMutationWithAudit(
        { name, description, objective, key },
        {
          context,
          action: 'create',
          entityType: 'test_sets',
          mutationFn: async (input) => {
            const insertData: any = {
              key: input.key,
              name: input.name.trim(),
              description: input.description.trim() || null,
              objective: input.objective.trim() || null,
              program_id: scopeType === 'program' ? scopeId : null,
              project_id: scopeType === 'project' ? scopeId : null,
              status: 'active',
              created_by: user.id,
            };

            const { data, error } = await supabase
              .from('test_sets')
              .insert(insertData)
              .select()
              .single();

            if (error) throw error;
            return data;
          },
          getAuditInfo: (input, result) => ({
            entityId: result.id,
            entityTitle: input.name,
            description: `Created test set "${input.name}"`,
          }),
          activityType: 'created',
          queryClient,
          invalidateKeys: [['global-test-sets', scopeType, scopeId]],
          successMessage: 'Test set created',
        }
      );
    },
    onSuccess: () => {
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-1 border-border-default max-w-md">
        <DialogHeader>
          <DialogTitle className="text-text-primary flex items-center gap-2">
            <Package className="h-5 w-5 text-accent-primary" />
            Create Test Set
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-text-primary">
              Set Name <span className="text-status-error">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Login Tests, Checkout Flow"
              className="bg-surface-2 border-border-default"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="objective" className="text-text-primary">
              Objective
            </Label>
            <Input
              id="objective"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="e.g., Verify authentication flows"
              className="bg-surface-2 border-border-default"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-text-primary">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this test set..."
              className="bg-surface-2 border-border-default min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!name.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Set'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
