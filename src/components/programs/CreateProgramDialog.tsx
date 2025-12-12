import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  const [keyError, setKeyError] = useState('');

  // Fetch existing program keys for uniqueness validation
  const { data: existingKeys } = useQuery({
    queryKey: ['program-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('key');
      if (error) throw error;
      return data?.map(p => p.key?.toUpperCase()) || [];
    },
  });

  const KEY_REGEX = /^[A-Z]{3}$/;

  const validateKey = (value: string): string => {
    if (!value) return 'Program key is required';
    if (!KEY_REGEX.test(value)) return 'Key must be exactly 3 uppercase letters (A-Z)';
    if (existingKeys?.includes(value.toUpperCase())) return 'This key is already in use';
    return '';
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const finalKey = key.trim().toUpperCase();
      
      // Final validation
      const error = validateKey(finalKey);
      if (error) throw new Error(error);

      const { data, error: dbError } = await supabase
        .from('programs')
        .insert({
          name: name.trim(),
          key: finalKey,
          description: description.trim() || null,
          status: 'active',
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['programs-directory'] });
      queryClient.invalidateQueries({ queryKey: ['programs-header'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-programs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-programs'] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['program-keys'] });
      
      toast.success('Program created successfully');
      handleClose();
      
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
    setKeyError('');
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Program name is required');
      return;
    }
    const error = validateKey(key);
    if (error) {
      setKeyError(error);
      return;
    }
    createMutation.mutate();
  };

  const handleKeyChange = (value: string) => {
    const upperValue = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    setKey(upperValue);
    if (upperValue.length === 3) {
      setKeyError(validateKey(upperValue));
    } else {
      setKeyError('');
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
                placeholder="e.g., Digital Transformation"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                placeholder="e.g., DTG"
                value={key}
                onChange={(e) => handleKeyChange(e.target.value)}
                maxLength={3}
                className={keyError ? 'border-destructive' : ''}
              />
              {keyError ? (
                <p className="text-xs text-destructive">{keyError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Exactly 3 uppercase letters (A-Z). Used as prefix for epics (e.g., {key || 'ABC'}-001)
                </p>
              )}
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
              disabled={!name.trim() || !key || key.length !== 3 || !!keyError || createMutation.isPending}
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
