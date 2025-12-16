/**
 * Add to Strategic Backlog Modal
 * Pixel-perfect implementation matching mockups exactly
 */
import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
  const buttonLabel = selectedType && config ? `Create ${config.label}` : 'Create';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Add to Strategic Backlog</h2>
          <button 
            onClick={handleClose}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <Label className="text-sm font-medium text-foreground block mb-4">
            What are you adding?
          </Label>
          
          {/* Type Selector Cards */}
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
                    "flex flex-col items-center py-5 px-3 border-2 rounded-xl transition-all",
                    isSelected 
                      ? "border-brand-gold bg-brand-gold/5" 
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center mb-3",
                    isSelected 
                      ? "bg-brand-gold text-white" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-medium text-foreground">{cfg.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{cfg.subtitle}</div>
                </button>
              );
            })}
          </div>

          {/* Form fields */}
          {selectedType && config && (
            <div className="mt-6 space-y-4">
              <div>
                <Label className="text-sm font-medium text-foreground block mb-2">
                  {config.nameLabel}
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={config.namePlaceholder}
                  className="h-11 bg-background border-border"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground block mb-2">
                  Description
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description..."
                  rows={4}
                  className="bg-background border-border resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
          <Button 
            variant="ghost" 
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!selectedType || !name.trim() || isSubmitting}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : buttonLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
