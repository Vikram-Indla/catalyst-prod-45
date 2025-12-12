import React, { useState, useEffect } from 'react';
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
import { Search } from 'lucide-react';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (project: { id: string; name: string; key: string }) => void;
  defaultProgramId?: string;
}

const KEY_REGEX = /^[A-Z]{3}$/;
const DEFAULT_PROGRAM_ID = '00000000-0000-0000-0000-000000000001';

export function CreateProjectDialog({ open, onOpenChange, onSuccess, defaultProgramId }: CreateProjectDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [programId, setProgramId] = useState('');
  const [keyError, setKeyError] = useState('');
  const [programSearch, setProgramSearch] = useState('');

  // Set default program when dialog opens
  useEffect(() => {
    if (open) {
      setProgramId(defaultProgramId || DEFAULT_PROGRAM_ID);
    }
  }, [open, defaultProgramId]);

  // Fetch programs for dropdown
  const { data: programs } = useQuery({
    queryKey: ['programs-for-project'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
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
        .from('projects')
        .select('key');
      if (error) throw error;
      return data?.map(p => p.key?.toUpperCase()) || [];
    },
  });

  const filteredPrograms = programs?.filter(p => 
    p.name.toLowerCase().includes(programSearch.toLowerCase()) ||
    p.key?.toLowerCase().includes(programSearch.toLowerCase())
  );

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
      // Ensure program is selected
      const selectedProgramId = programId || DEFAULT_PROGRAM_ID;
      const finalKey = key.trim().toUpperCase();
      
      // Final validation
      const error = validateKey(finalKey);
      if (error) throw new Error(error);

      // Insert into projects table (not programs!)
      const { data, error: dbError } = await supabase
        .from('projects')
        .insert({
          name: name.trim(),
          key: finalKey,
          description: description.trim() || null,
          program_id: selectedProgramId,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects-directory'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
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
    setProgramId(DEFAULT_PROGRAM_ID);
    setKeyError('');
    setProgramSearch('');
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
    if (!programId) {
      toast.error('Program is required');
      return;
    }
    createProject.mutate();
  };

  const selectedProgram = programs?.find(p => p.id === programId);

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
          {/* Name */}
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

          {/* Key */}
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

          {/* Program */}
          <div className="space-y-2">
            <Label htmlFor="program">Program *</Label>
            <Select value={programId} onValueChange={setProgramId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a program">
                  {selectedProgram ? `${selectedProgram.name} (${selectedProgram.key})` : 'Select a program'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="z-[400]">
                <div className="px-2 py-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search programs..."
                      value={programSearch}
                      onChange={(e) => setProgramSearch(e.target.value)}
                      className="pl-8 h-8"
                    />
                  </div>
                </div>
                {filteredPrograms?.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name} ({program.key})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Projects must be linked to a program
            </p>
          </div>

          {/* Description */}
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
