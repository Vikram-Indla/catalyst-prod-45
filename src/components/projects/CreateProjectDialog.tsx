import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { getProjectLandingRoute } from '@/lib/workspaceContext';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (project: { id: string; name: string; key: string }) => void;
}

const KEY_REGEX = /^[A-Z]{3}$/;

export function CreateProjectDialog({ open, onOpenChange, onSuccess }: CreateProjectDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [programId, setProgramId] = useState('');
  const [projectType, setProjectType] = useState<'scrum' | 'kanban'>('scrum');
  const [keyError, setKeyError] = useState('');

  // Fetch programs (portfolios in DB)
  const { data: programs } = useQuery({
    queryKey: ['programs-for-project'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, name, key')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing project keys for uniqueness validation
  const { data: existingKeys } = useQuery({
    queryKey: ['project-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('key');
      if (error) throw error;
      return data?.map(p => p.key?.toUpperCase()) || [];
    },
  });

  const validateKey = (value: string): string => {
    if (!value) return 'Project key is required';
    if (!KEY_REGEX.test(value)) return 'Key must be exactly 3 uppercase letters (A-Z)';
    if (existingKeys?.includes(value.toUpperCase())) return 'This key is already in use';
    return '';
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

  const createProject = useMutation({
    mutationFn: async () => {
      let portfolioId = programId;

      // If no program selected, use default
      if (!portfolioId) {
        const { data: existingDefault } = await supabase
          .from('portfolios')
          .select('id')
          .eq('name', 'Default')
          .single();

        if (existingDefault) {
          portfolioId = existingDefault.id;
        } else {
          throw new Error('Please select a program');
        }
      }

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
          portfolio_id: portfolioId,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects-directory'] });
      queryClient.invalidateQueries({ queryKey: ['programs-for-project'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects-header'] });
      queryClient.invalidateQueries({ queryKey: ['project-keys'] });
      toast.success('Project created successfully');
      handleClose();
      
      if (onSuccess) {
        onSuccess({ id: data.id, name: data.name, key: data.key });
      } else {
        navigate(getProjectLandingRoute(data.id));
      }
    },
    onError: (error) => {
      toast.error('Failed to create project: ' + error.message);
    },
  });

  const handleClose = () => {
    setName('');
    setKey('');
    setDescription('');
    setProgramId('');
    setProjectType('scrum');
    setKeyError('');
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }
    const error = validateKey(key);
    if (error) {
      setKeyError(error);
      return;
    }
    createProject.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Create a new project to organize your work items.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="key">Project Key *</Label>
            <Input
              id="key"
              value={key}
              onChange={(e) => handleKeyChange(e.target.value)}
              placeholder="ABC"
              maxLength={3}
              className={keyError ? 'border-destructive' : ''}
            />
            {keyError ? (
              <p className="text-xs text-destructive">{keyError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Exactly 3 uppercase letters (A-Z)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="program">Program *</Label>
            <Select value={programId} onValueChange={setProgramId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a program" />
              </SelectTrigger>
              <SelectContent>
                {programs?.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name} ({program.key})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter project description (optional)"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!name.trim() || !key || key.length !== 3 || !!keyError || !programId || createProject.isPending}
              className="bg-brand-gold hover:bg-brand-gold-hover"
            >
              {createProject.isPending ? 'Creating...' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
