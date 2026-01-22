// =====================================================
// CREATE PROJECT DIALOG - BUILD_UNIT_2.1 SPEC COMPLIANT
// =====================================================

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Search, Lock, Globe, Info } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getProjectLandingRoute } from '@/lib/workspaceContext';
import { useCreateProject } from '@/hooks/useProjects';
import { PROJECT_TYPE_CONFIG, PROJECT_COLORS, type ProjectType } from '@/types/project';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (project: { id: string; name: string; key: string }) => void;
  defaultProgramId?: string;
}

const KEY_REGEX = /^[A-Z]{2,5}$/;
const DEFAULT_PROGRAM_ID = '00000000-0000-0000-0000-000000000001';

export function CreateProjectDialog({ 
  open, 
  onOpenChange, 
  onSuccess, 
  defaultProgramId 
}: CreateProjectDialogProps) {
  const navigate = useNavigate();
  const createProject = useCreateProject();

  // Form state
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [programId, setProgramId] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('scrum');
  const [category, setCategory] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0]);
  
  // Validation state
  const [keyError, setKeyError] = useState('');
  const [programSearch, setProgramSearch] = useState('');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('');
      setKey('');
      setDescription('');
      setProgramId(defaultProgramId || DEFAULT_PROGRAM_ID);
      setProjectType('scrum');
      setCategory('');
      setIsPrivate(false);
      setSelectedColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]);
      setKeyError('');
      setProgramSearch('');
    }
  }, [open, defaultProgramId]);

  // Auto-generate key from name
  useEffect(() => {
    if (name && !key) {
      const generated = name
        .replace(/[^a-zA-Z\s]/g, '')
        .split(' ')
        .filter(w => w.length > 0)
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 4);
      if (generated.length >= 2) {
        setKey(generated);
      }
    }
  }, [name]);

  // Fetch programs
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

  // Fetch existing keys for validation
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
    if (!KEY_REGEX.test(value)) return 'Key must be 2-5 uppercase letters (A-Z)';
    if (existingKeys?.includes(value.toUpperCase())) return 'This key is already in use';
    return '';
  };

  const handleKeyChange = (value: string) => {
    const upperValue = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
    setKey(upperValue);
    if (upperValue.length >= 2) {
      setKeyError(validateKey(upperValue));
    } else {
      setKeyError('');
    }
  };

  const handleClose = () => {
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

    createProject.mutate(
      {
        name: name.trim(),
        key: key.toUpperCase(),
        description: description.trim() || undefined,
        program_id: programId,
        project_type: projectType,
        category: category.trim() || undefined,
        is_private: isPrivate,
        color: selectedColor,
      },
      {
        onSuccess: (data) => {
          handleClose();
          if (onSuccess) {
            onSuccess({ id: data.id, name: data.name, key: data.key });
          } else {
            navigate(getProjectLandingRoute(data.id));
          }
        },
      }
    );
  };

  const selectedProgram = programs?.find(p => p.id === programId);
  const isValid = name.trim() && key.length >= 2 && !keyError && programId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Create a new project to organize your work items.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name & Key Row */}
          <div className="grid grid-cols-[1fr_120px] gap-4">
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
              <Label htmlFor="key">Key *</Label>
              <Input
                id="key"
                value={key}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder="PRJ"
                maxLength={5}
                className={cn(keyError && 'border-destructive')}
              />
              {keyError && (
                <p className="text-xs text-destructive">{keyError}</p>
              )}
            </div>
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
          </div>

          {/* Project Type */}
          <div className="space-y-2">
            <Label>Project type *</Label>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(PROJECT_TYPE_CONFIG).map(([typeKey, config]) => (
                <button
                  key={typeKey}
                  type="button"
                  onClick={() => setProjectType(typeKey as ProjectType)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                    projectType === typeKey
                      ? 'border-brand-primary bg-brand-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <span className="text-2xl">{config.icon}</span>
                  <span className="text-sm font-medium">{config.label}</span>
                  <span className="text-xs text-muted-foreground text-center leading-tight">
                    {config.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Category & Color Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Engineering, Marketing"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {PROJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      'w-8 h-8 rounded-full transition-transform',
                      selectedColor === color && 'ring-2 ring-offset-2 ring-brand-primary scale-110'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              {isPrivate ? (
                <Lock className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Globe className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {isPrivate ? 'Private project' : 'Public project'}
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        {isPrivate
                          ? 'Only invited members can view and access this project.'
                          : 'Anyone in your organization can view this project.'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isPrivate
                    ? 'Only members can access'
                    : 'Visible to organization'}
                </p>
              </div>
            </div>
            <Switch
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
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
              disabled={!isValid || createProject.isPending}
              className="bg-brand-primary hover:bg-brand-primary-hover"
            >
              {createProject.isPending ? 'Creating...' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
