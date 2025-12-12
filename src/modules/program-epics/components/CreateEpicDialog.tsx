/**
 * Create Epic Dialog - Creates epics with auto-generated keys
 * 
 * KEY FORMAT: <PROGRAM_KEY>-<SEQUENCE> (e.g., DTP-001)
 * - Program key must be exactly 3 uppercase letters
 * - Sequence is 3-digit zero-padded, per-program scope
 */
import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
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
import { generateNextEpicKey, isValidProgramKey } from '@/utils/epic-key-generator';

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

  // Fetch program info to display the key preview
  const { data: program } = useQuery({
    queryKey: ['program-for-epic', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, key, name')
        .eq('id', programId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!programId,
  });

  // Derive the 3-letter key for display
  const getProgramKeyPreview = () => {
    if (!program?.key) return '???';
    if (isValidProgramKey(program.key)) return program.key;
    // Extract first 3 letters
    const upper = program.key.toUpperCase().replace(/[^A-Z]/g, '');
    return upper.length >= 3 ? upper.substring(0, 3) : 'PRG';
  };

  const createEpicMutation = useMutation({
    mutationFn: async () => {
      // Generate the next epic key for this program
      const epicKey = await generateNextEpicKey(programId);
      
      const { data, error } = await supabase
        .from('epics')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          primary_program_id: programId,
          epic_key: epicKey,
          status: 'proposed',
          health: 'green',
        } as any)
        .select()
        .single();

      if (error) throw error;
      return { ...data, epic_key: epicKey };
    },
    onSuccess: (data) => {
      // Invalidate all epic-related queries with programId scope
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['program-epics', programId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-items', programId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success(`Epic ${data.epic_key} created successfully`);
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
          {/* Epic Number Preview */}
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border border-border">
            <span className="text-sm text-muted-foreground">Epic Number:</span>
            <span className="font-mono font-medium text-brand-gold">
              {getProgramKeyPreview()}-###
            </span>
            <span className="text-xs text-muted-foreground">(auto-generated)</span>
          </div>

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
