import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Search, AlertTriangle } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  key: string;
  description: string | null;
  program_id: string;
}

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSuccess?: () => void;
}

export function EditProjectDialog({ open, onOpenChange, project, onSuccess }: EditProjectDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [programId, setProgramId] = useState('');
  const [originalProgramId, setOriginalProgramId] = useState('');
  const [programSearch, setProgramSearch] = useState('');
  const [showProgramChangeConfirm, setShowProgramChangeConfirm] = useState(false);
  const [pendingProgramId, setPendingProgramId] = useState<string | null>(null);

  // Initialize form when project changes
  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setProgramId(project.program_id);
      setOriginalProgramId(project.program_id);
    }
  }, [project]);

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

  const filteredPrograms = programs?.filter(p => 
    p.name.toLowerCase().includes(programSearch.toLowerCase()) ||
    p.key?.toLowerCase().includes(programSearch.toLowerCase())
  );

  const updateProject = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error('No project to update');
      
      const { error: dbError } = await supabase
        .from('projects')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          program_id: programId,
        })
        .eq('id', project.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-directory'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-settings'] });
      toast.success('Project updated successfully');
      handleClose();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error('Failed to update project: ' + error.message);
    },
  });

  const handleClose = () => {
    setName('');
    setDescription('');
    setProgramId('');
    setProgramSearch('');
    setPendingProgramId(null);
    onOpenChange(false);
  };

  const handleProgramChange = (newProgramId: string) => {
    // If changing program, show confirmation
    if (newProgramId !== originalProgramId) {
      setPendingProgramId(newProgramId);
      setShowProgramChangeConfirm(true);
    } else {
      setProgramId(newProgramId);
    }
  };

  const confirmProgramChange = () => {
    if (pendingProgramId) {
      setProgramId(pendingProgramId);
    }
    setShowProgramChangeConfirm(false);
    setPendingProgramId(null);
  };

  const cancelProgramChange = () => {
    setShowProgramChangeConfirm(false);
    setPendingProgramId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }
    if (!programId) {
      toast.error('Program is required');
      return;
    }
    updateProject.mutate();
  };

  const selectedProgram = programs?.find(p => p.id === programId);
  const originalProgram = programs?.find(p => p.id === originalProgramId);
  const pendingProgram = programs?.find(p => p.id === pendingProgramId);

  if (!project) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
            <DialogDescription>
              Update project details. Project key cannot be changed here.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Key (read-only) */}
            <div className="space-y-2">
              <Label>Project Key</Label>
              <div className="px-3 py-2 bg-muted border rounded-md text-sm font-mono">
                {project.key}
              </div>
              <p className="text-xs text-muted-foreground">
                Project key cannot be changed. Use Key Migration for key changes.
              </p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Project name *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>

            {/* Program */}
            <div className="space-y-2">
              <Label htmlFor="edit-program">Program *</Label>
              <Select value={programId} onValueChange={handleProgramChange}>
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
              {programId !== originalProgramId && (
                <p className="text-xs text-warning flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Program will be changed from {originalProgram?.name} to {selectedProgram?.name}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
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
                disabled={!name.trim() || !programId || updateProject.isPending}
                className="bg-brand-gold hover:bg-brand-gold-hover"
              >
                {updateProject.isPending ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Program Change Confirmation */}
      <AlertDialog open={showProgramChangeConfirm} onOpenChange={setShowProgramChangeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Confirm Program Change
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are moving this project from <strong>{originalProgram?.name}</strong> to{' '}
                <strong>{pendingProgram?.name}</strong>.
              </p>
              <p className="text-sm">
                This will affect:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Program → Project filtering</li>
                <li>Inherited access permissions</li>
                <li>Work item visibility in program views</li>
              </ul>
              <p className="text-sm">
                Direct project members will be preserved. Inherited members from the old program will be removed unless they are also direct members.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelProgramChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmProgramChange} className="bg-brand-gold hover:bg-brand-gold-hover">
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
