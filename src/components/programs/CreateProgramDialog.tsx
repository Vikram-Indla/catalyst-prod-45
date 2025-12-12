import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
import { Textarea } from '@/components/ui/textarea';
import { getProgramLandingRoute } from '@/lib/workspaceContext';

interface CreateProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (program: { id: string; name: string; key: string }) => void;
}

export function CreateProgramDialog({ open, onOpenChange, onSuccess }: CreateProgramDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      const finalKey = key.trim() || generateKey(name);
      const { data, error } = await supabase
        .from('portfolios')
        .insert({
          name: name.trim(),
          key: finalKey.toUpperCase(),
          description: description.trim() || null,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['programs-directory'] });
      queryClient.invalidateQueries({ queryKey: ['programs-header'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-programs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-programs'] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      
      toast.success('Program created successfully');
      handleClose();
      
      // Call onSuccess callback or navigate to program
      if (onSuccess) {
        onSuccess({ id: data.id, name: data.name, key: data.key });
      } else {
        navigate(getProgramLandingRoute(data.id));
      }
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

  const generateKey = (name: string): string => {
    if (!name.trim()) return '';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].substring(0, 4).toUpperCase();
    }
    return words.slice(0, 4).map(w => w[0]).join('').toUpperCase();
  };

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate key if user hasn't manually edited it
    if (!key || key === generateKey(name)) {
      setKey(generateKey(value));
    }
  };

  const handleKeyChange = (value: string) => {
    // Only allow uppercase alphanumeric
    setKey(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10));
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
                placeholder="e.g., Digital Transformation"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="program-key">
                Key <span className="text-destructive">*</span>
              </Label>
              <Input
                id="program-key"
                placeholder="e.g., DT"
                value={key}
                onChange={(e) => handleKeyChange(e.target.value)}
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Unique prefix for epics (e.g., {key || 'KEY'}-001)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="program-description">Description</Label>
              <Textarea
                id="program-description"
                placeholder="Brief description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
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
              className="bg-brand-gold hover:bg-brand-gold-hover"
            >
              {createMutation.isPending ? 'Creating...' : 'Create program'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
