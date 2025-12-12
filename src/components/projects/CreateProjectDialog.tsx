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

function generateKey(name: string): string {
  if (!name.trim()) return '';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 4).toUpperCase();
  }
  return words.slice(0, 4).map(w => w[0]).join('').toUpperCase();
}

export function CreateProjectDialog({ open, onOpenChange, onSuccess }: CreateProjectDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [programId, setProgramId] = useState('');
  const [projectType, setProjectType] = useState<'scrum' | 'kanban'>('scrum');

  // Fetch programs (portfolios in DB)
  const { data: programs } = useQuery({
    queryKey: ['programs-for-project'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const createProject = useMutation({
    mutationFn: async () => {
      let portfolioId = programId;

      // If no program selected, create or use default
      if (!portfolioId) {
        // Check for existing default program
        const { data: existingDefault } = await supabase
          .from('portfolios')
          .select('id')
          .eq('name', 'Default')
          .single();

        if (existingDefault) {
          portfolioId = existingDefault.id;
        } else {
          // Create default program
          const { data: newDefault, error: defaultError } = await supabase
            .from('portfolios')
            .insert({ name: 'Default', key: 'DEFAULT', status: 'active' })
            .select('id')
            .single();
          
          if (defaultError) throw defaultError;
          portfolioId = newDefault.id;
        }
      }

      const finalKey = key.trim() || generateKey(name);
      const { data, error } = await supabase
        .from('programs')
        .insert({
          name: name.trim(),
          key: finalKey.toUpperCase(),
          description: description.trim() || null,
          portfolio_id: portfolioId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects-directory'] });
      queryClient.invalidateQueries({ queryKey: ['programs-for-project'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects-header'] });
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
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Project name is required');
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
            <Label htmlFor="program">Program</Label>
            <Select value={programId} onValueChange={setProgramId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a program (optional)" />
              </SelectTrigger>
              <SelectContent>
                {programs?.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              If no program is selected, the project will be added to the Default program.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Project type</Label>
            <Select value={projectType} onValueChange={(v) => setProjectType(v as 'scrum' | 'kanban')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scrum">Scrum</SelectItem>
                <SelectItem value="kanban">Kanban</SelectItem>
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
              disabled={createProject.isPending}
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
