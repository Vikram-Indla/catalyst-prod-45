/**
 * Create Epic Dialog - Simple dialog for creating epics within a program context
 */
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface CreateEpicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
}

export function CreateEpicDialog({ 
  open, 
  onOpenChange, 
  programId 
}: CreateEpicDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const createEpicMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          primary_program_id: programId, // CRITICAL: Use primary_program_id for program scoping
          status: 'proposed',
          health: 'green',
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate all epic-related queries with programId scope
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['program-epics', programId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-items', programId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success('Epic created successfully');
      handleClose();
    },
    onError: (error) => {
      console.error('Failed to create epic:', error);
      toast.error('Failed to create epic');
    },
  });

  const handleClose = () => {
    setName('');
    setDescription('');
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    createEpicMutation.mutate();
  };

  const isValid = name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Epic</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="epic-name">
              Epic Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="epic-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter epic name"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="epic-description">Description</Label>
            <Textarea
              id="epic-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter epic description (optional)"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || createEpicMutation.isPending}
            className="bg-brand-gold hover:bg-brand-gold-hover text-background"
          >
            {createEpicMutation.isPending ? 'Creating...' : 'Create Epic'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
