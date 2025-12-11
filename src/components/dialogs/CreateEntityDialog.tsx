import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { useQueryClient } from '@tanstack/react-query';
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
    table: 'portfolios' as const,
    queryKeys: ['admin-programs', 'programs-header'],
  },
  project: {
    title: 'Create Project',
    description: 'Create a new project to manage your work items and sprints.',
    namePlaceholder: 'e.g., Mobile App Redesign',
    keyPlaceholder: 'e.g., MAR',
    table: 'programs' as const,
    queryKeys: ['admin-projects', 'programs-header'],
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

function generateKey(name: string): string {
  if (!name.trim()) return '';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 4).toUpperCase();
  }
  return words.slice(0, 4).map(w => w[0]).join('').toUpperCase();
}

export function CreateEntityDialog({
  open,
  onOpenChange,
  entityType,
  onSuccess,
}: CreateEntityDialogProps) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);
  const queryClient = useQueryClient();

  const config = entityConfig[entityType];

  useEffect(() => {
    if (!keyManuallyEdited) {
      setKey(generateKey(name));
    }
  }, [name, keyManuallyEdited]);

  useEffect(() => {
    if (open) {
      setName('');
      setKey('');
      setDescription('');
      setKeyManuallyEdited(false);
    }
  }, [open]);

  const handleKeyChange = (value: string) => {
    setKey(value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
    setKeyManuallyEdited(true);
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
          .from('portfolios')
          .insert({ name: name.trim() })
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        const { data: portfolios } = await supabase
          .from('portfolios')
          .select('id')
          .limit(1);

        let portfolioId = portfolios?.[0]?.id;

        if (!portfolioId) {
          const { data: newPortfolio, error: portfolioError } = await supabase
            .from('portfolios')
            .insert({ name: 'Default Project' })
            .select()
            .single();
          if (portfolioError) throw portfolioError;
          portfolioId = newPortfolio.id;
          queryClient.invalidateQueries({ queryKey: ['admin-programs'] });
          queryClient.invalidateQueries({ queryKey: ['programs-header'] });
        }

        const { data, error } = await supabase
          .from('programs')
          .insert({ name: name.trim(), portfolio_id: portfolioId })
          .select()
          .single();
        if (error) throw error;
        result = data;
      }

      if (!result) throw new Error('No data returned');

      config.queryKeys.forEach(qk => {
        queryClient.invalidateQueries({ queryKey: [qk] });
      });

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
                placeholder={config.keyPlaceholder}
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                This key will be used as a prefix for work items (e.g., {key || 'KEY'}-123)
              </p>
            </div>

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
            disabled={isCreating || !name.trim() || !key.trim()}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}