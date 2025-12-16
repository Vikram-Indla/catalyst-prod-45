/**
 * Add to Strategic Backlog Modal
 * Pixel-perfect implementation with type selector cards
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Layers, Target, Box, X } from 'lucide-react';
import { useCreateTheme } from '@/hooks/useStrategicBacklog';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { cn } from '@/lib/utils';

interface AddToBacklogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotId: string;
}

type ItemType = 'theme' | 'objective' | 'epic' | null;

const TYPE_CONFIG = {
  theme: {
    icon: Layers,
    label: 'Theme',
    subtitle: 'Strategic pillar',
    nameLabel: 'Theme Name',
    namePlaceholder: 'Enter name...',
  },
  objective: {
    icon: Target,
    label: 'Objective',
    subtitle: 'Measurable goal',
    nameLabel: 'Objective Name',
    namePlaceholder: 'Enter name...',
  },
  epic: {
    icon: Box,
    label: 'Epic',
    subtitle: 'Deliverable work',
    nameLabel: 'Epic Name',
    namePlaceholder: 'Enter name...',
  },
};

export function AddToBacklogModal({ open, onOpenChange, snapshotId }: AddToBacklogModalProps) {
  const [selectedType, setSelectedType] = useState<ItemType>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const createTheme = useCreateTheme();
  const queryClient = useQueryClient();

  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => {
      setSelectedType(null);
      setName('');
      setDescription('');
    }, 200);
  };

  const handleCreate = async () => {
    if (!selectedType || !name.trim()) return;
    
    setIsSubmitting(true);
    try {
      if (selectedType === 'theme') {
        await createTheme.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          snapshot_id: snapshotId,
          status: 'draft',
        });
      } else if (selectedType === 'objective') {
        // Create objective
        const { error } = await supabase
          .from('objectives')
          .insert([{
            name: name.trim(),
            description: description.trim() || null,
            status: 'pending',
          }]);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['objectives-for-backlog'] });
        queryClient.invalidateQueries({ queryKey: ['snapshot-objectives'] });
        catalystToast.success('Objective Created', 'Objective has been created successfully.');
      } else if (selectedType === 'epic') {
        // Create epic
        const { error } = await supabase
          .from('epics')
          .insert({
            name: name.trim(),
            description: description.trim() || null,
            status: 'proposed',
          });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['snapshot-epics'] });
        catalystToast.success('Epic Created', 'Epic has been created successfully.');
      }
      handleClose();
    } catch (error: any) {
      catalystToast.error('Error', error.message || 'Failed to create item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const config = selectedType ? TYPE_CONFIG[selectedType] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        <DialogHeader className="flex flex-row items-center justify-between p-5 border-b border-border">
          <DialogTitle className="text-lg font-semibold">Add to Strategic Backlog</DialogTitle>
          <button 
            onClick={handleClose}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        <div className="p-5">
          <Label className="text-sm font-medium text-foreground block mb-3">
            What are you adding?
          </Label>
          
          <div className="grid grid-cols-3 gap-3">
            {(['theme', 'objective', 'epic'] as const).map((type) => {
              const cfg = TYPE_CONFIG[type];
              const Icon = cfg.icon;
              const isSelected = selectedType === type;
              
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "p-4 border-2 rounded-lg text-center transition-all",
                    isSelected 
                      ? "border-brand-gold bg-brand-gold/5" 
                      : "border-border hover:border-muted-foreground"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center",
                    isSelected 
                      ? "bg-brand-gold text-white" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-medium text-foreground">{cfg.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{cfg.subtitle}</div>
                </button>
              );
            })}
          </div>

          {/* Form fields appear when type is selected */}
          {selectedType && config && (
            <div className="mt-6 space-y-4">
              <div>
                <Label className="text-sm font-medium text-foreground block mb-1.5">
                  {config.nameLabel}
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={config.namePlaceholder}
                  className="bg-background border-border"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground block mb-1.5">
                  Description
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description..."
                  rows={3}
                  className="bg-background border-border resize-none"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-border bg-muted/30">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!selectedType || !name.trim() || isSubmitting}
            className={cn(
              "transition-colors",
              selectedType && name.trim()
                ? "bg-brand-gold hover:bg-brand-gold-hover text-white"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isSubmitting ? 'Creating...' : `Create ${config?.label || ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
