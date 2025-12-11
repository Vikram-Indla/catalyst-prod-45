import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

interface CreateProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProgramDialog({ open, onOpenChange }: CreateProgramDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .insert({
          name: name.trim(),
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs-directory'] });
      queryClient.invalidateQueries({ queryKey: ['programs-header'] });
      toast.success('Program created successfully');
      handleClose();
    },
    onError: (error) => {
      toast.error('Failed to create program: ' + error.message);
    },
  });

  const handleClose = () => {
    setName('');
    setKey('');
    setDescription('');
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Program name is required');
      return;
    }
    createMutation.mutate();
  };

  const generateKey = (name: string) => {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 10);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!key || key === generateKey(name)) {
      setKey(generateKey(value));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create program</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="program-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="program-name"
                placeholder="Enter program name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="program-key">Key</Label>
              <Input
                id="program-key"
                placeholder="e.g., PROD"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A unique identifier for this program
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="program-description">Description</Label>
              <Input
                id="program-description"
                placeholder="Describe the purpose of this program"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create program'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
