import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

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

// Generate a key from the name (uppercase, first letters or abbreviation)
function generateKey(name: string): string {
  if (!name.trim()) return '';
  
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    // Single word: take first 3-4 characters
    return words[0].substring(0, 4).toUpperCase();
  }
  // Multiple words: take first letter of each (up to 4)
  return words
    .slice(0, 4)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

export function CreateEntityDialog({ 
  open, 
  onOpenChange, 
  entityType,
  onSuccess 
}: CreateEntityDialogProps) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);
  const queryClient = useQueryClient();

  const config = entityConfig[entityType];

  // Auto-generate key from name unless manually edited
  useEffect(() => {
    if (!keyManuallyEdited) {
      setKey(generateKey(name));
    }
  }, [name, keyManuallyEdited]);

  // Reset form when dialog opens
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
          .insert({
            name: name.trim(),
          })
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        // project - needs portfolio_id (we'll use a default or first available)
        const { data: portfolios } = await supabase
          .from('portfolios')
          .select('id')
          .limit(1);
        
        const { data, error } = await supabase
          .from('programs')
          .insert({
            name: name.trim(),
            portfolio_id: portfolios?.[0]?.id || null,
          })
          .select()
          .single();
        if (error) throw error;
        result = data;
      }

      if (!result) throw new Error('No data returned');

      // Invalidate relevant queries
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
      <DialogContent className="sm:max-w-[480px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{config.title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {config.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="entity-name" className="text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="entity-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={config.namePlaceholder}
              className="h-10"
              autoFocus
            />
          </div>

          {/* Key Field */}
          <div className="space-y-2">
            <Label htmlFor="entity-key" className="text-sm font-medium">
              Key <span className="text-destructive">*</span>
            </Label>
            <Input
              id="entity-key"
              value={key}
              onChange={(e) => handleKeyChange(e.target.value)}
              placeholder={config.keyPlaceholder}
              className="h-10 font-mono uppercase"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">
              This key will be used as a prefix for work items (e.g., {key || 'KEY'}-123)
            </p>
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="entity-description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="entity-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description (optional)"
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={isCreating || !name.trim() || !key.trim()}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white min-w-[100px]"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
