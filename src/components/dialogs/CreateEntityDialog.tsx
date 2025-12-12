import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type EntityType = 'program' | 'project' | 'product';

interface CreateEntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: EntityType;
  onSuccess?: (entity: { id: string; name: string; key: string }) => void;
}

const entityConfig = {
  program: {
    title: 'Create Program',
    description: 'Create a new program to organize your projects and teams.',
    namePlaceholder: 'e.g., Digital Transformation',
    keyPlaceholder: 'e.g., DT',
    table: 'programs' as const,
    queryKeys: ['admin-programs', 'programs-header', 'programs-for-project'],
  },
  project: {
    title: 'Create Project',
    description: 'Create a new project to manage your work items and sprints.',
    namePlaceholder: 'e.g., Mobile App Redesign',
    keyPlaceholder: 'e.g., MAR',
    table: 'projects' as const,
    queryKeys: ['admin-projects', 'programs-header', 'projects-directory', 'projects'],
  },
  product: {
    title: 'Create Product',
    description: 'Create a new product line to organize your business domains.',
    namePlaceholder: 'e.g., Enterprise Solutions',
    keyPlaceholder: 'e.g., ENT',
    table: 'business_lines' as const,
    queryKeys: ['business-lines', 'products-header'],
  },
};

const KEY_REGEX = /^[A-Z]{3}$/;
const DEFAULT_PROGRAM_ID = '00000000-0000-0000-0000-000000000001';

export function CreateEntityDialog({
  open,
  onOpenChange,
  entityType,
  onSuccess,
}: CreateEntityDialogProps) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [programId, setProgramId] = useState('');
  const [programSearch, setProgramSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [keyError, setKeyError] = useState('');
  const queryClient = useQueryClient();

  const config = entityConfig[entityType];

  // Fetch programs for project creation
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
    enabled: entityType === 'project',
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
    enabled: entityType === 'project',
  });

  const filteredPrograms = programs?.filter(p => 
    p.name.toLowerCase().includes(programSearch.toLowerCase()) ||
    p.key?.toLowerCase().includes(programSearch.toLowerCase())
  );

  const selectedProgram = programs?.find(p => p.id === programId);

  useEffect(() => {
    if (open) {
      setName('');
      setKey('');
      setDescription('');
      setKeyError('');
      setProgramSearch('');
      // Set default program for projects
      if (entityType === 'project') {
        setProgramId(DEFAULT_PROGRAM_ID);
      }
    }
  }, [open, entityType]);

  const validateProjectKey = (value: string): string => {
    if (!value) return 'Project key is required';
    if (!KEY_REGEX.test(value)) return 'Key must be exactly 3 uppercase letters (A-Z)';
    if (existingKeys?.includes(value.toUpperCase())) return 'This key is already in use';
    return '';
  };

  const handleKeyChange = (value: string) => {
    if (entityType === 'project') {
      // Project keys: exactly 3 uppercase letters
      const upperValue = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
      setKey(upperValue);
      if (upperValue.length === 3) {
        setKeyError(validateProjectKey(upperValue));
      } else {
        setKeyError('');
      }
    } else {
      // Other entity keys: more flexible
      setKey(value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      catalystToast.error('Validation Error', 'Please enter a name');
      return;
    }
    if (!key.trim()) {
      catalystToast.error('Validation Error', 'Please enter a key');
      return;
    }

    // Additional validation for projects
    if (entityType === 'project') {
      const keyValidationError = validateProjectKey(key);
      if (keyValidationError) {
        setKeyError(keyValidationError);
        catalystToast.error('Validation Error', keyValidationError);
        return;
      }
      if (!programId) {
        catalystToast.error('Validation Error', 'Program is required');
        return;
      }
    }

    setIsCreating(true);
    try {
      let result: { id: string; name: string } | null = null;

      if (entityType === 'product') {
        const { data, error } = await supabase
          .from('business_lines')
          .insert({
            name: name.trim(),
            key: key.trim(),
            description: description.trim() || null,
            is_active: true,
            sort_order: 0,
          })
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else if (entityType === 'program') {
        const { data, error } = await supabase
          .from('programs')
          .insert({ 
            name: name.trim(),
            key: key.trim(),
            description: description.trim() || null,
          })
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        // Creating a project - MUST have program_id
        const selectedProgramId = programId || DEFAULT_PROGRAM_ID;

        const { data, error } = await supabase
          .from('projects')
          .insert({ 
            name: name.trim(), 
            key: key.trim().toUpperCase(),
            description: description.trim() || null,
            program_id: selectedProgramId 
          })
          .select()
          .single();
        if (error) throw error;
        result = data;
      }

      if (!result) throw new Error('No data returned');

      config.queryKeys.forEach(qk => {
        queryClient.invalidateQueries({ queryKey: [qk] });
      });
      queryClient.invalidateQueries({ queryKey: ['project-keys'] });

      const entityLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1);
      catalystToast.success('Success', `${entityLabel} created successfully`);
      onOpenChange(false);
      onSuccess?.({ id: result.id, name: result.name, key: key.trim() });
    } catch (error) {
      console.error(`Error creating ${entityType}:`, error);
      catalystToast.error('Error', `Failed to create ${entityType}`);
    } finally {
      setIsCreating(false);
    }
  };

  const isProjectKeyValid = entityType !== 'project' || (key.length === 3 && !keyError);
  const isProgramValid = entityType !== 'project' || !!programId;
  const isFormValid = name.trim() && key.trim() && isProjectKeyValid && isProgramValid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-6">
            {config.description}
          </p>

          <div className="flex flex-col gap-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={config.namePlaceholder}
                autoFocus
              />
            </div>

            {/* Key */}
            <div className="space-y-2">
              <Label htmlFor="key">
                Key <span className="text-destructive">*</span>
              </Label>
              <Input
                id="key"
                value={key}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder={entityType === 'project' ? 'ABC' : config.keyPlaceholder}
                maxLength={entityType === 'project' ? 3 : 10}
                className={keyError ? 'border-destructive' : ''}
              />
              {keyError ? (
                <p className="text-xs text-destructive">{keyError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {entityType === 'project' 
                    ? 'Exactly 3 uppercase letters (A-Z)'
                    : `This key will be used as a prefix for work items (e.g., ${key || 'KEY'}-123)`
                  }
                </p>
              )}
            </div>

            {/* Program - Only for projects */}
            {entityType === 'project' && (
              <div className="space-y-2">
                <Label htmlFor="program">
                  Program <span className="text-destructive">*</span>
                </Label>
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
                    {filteredPrograms?.length === 0 && (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        No programs found
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Projects must be linked to a program
                </p>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description (optional)"
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !isFormValid}
            className="bg-brand-gold hover:bg-brand-gold-hover"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
