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
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden bg-white dark:bg-[#161B22] border border-[#E1E4E8] dark:border-[#30363D]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E1E4E8] dark:border-[#30363D]">
          <h2 className="text-lg font-semibold text-[#24292F] dark:text-[#E6EDF3]">Add to Strategic Backlog</h2>
          <button 
            onClick={handleClose}
            className="p-1.5 rounded-md hover:bg-[#F6F8FA] dark:hover:bg-[#21262D] text-[#8B949E] hover:text-[#24292F] dark:hover:text-[#E6EDF3] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <Label className="text-sm font-medium text-[#24292F] dark:text-[#E6EDF3] block mb-4">
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
                    "flex flex-col items-center py-5 px-3 rounded-xl transition-all",
                    "bg-white dark:bg-[#161B22]",
                    isSelected 
                      ? "border-2 border-[#C69C6D] shadow-sm" 
                      : "border border-[#E1E4E8] dark:border-[#30363D] hover:border-[rgba(198,156,109,0.3)]"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center mb-3",
                    isSelected 
                      ? "bg-[#C69C6D] text-white" 
                      : "bg-[#F6F8FA] dark:bg-[#21262D] text-[#8B949E]"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-medium text-[#24292F] dark:text-[#E6EDF3]">{cfg.label}</div>
                  <div className="text-xs text-[#8B949E] mt-0.5">{cfg.subtitle}</div>
                </button>
              );
            })}
          </div>

          {/* Form fields */}
          {selectedType && config && (
            <div className="mt-6 space-y-4">
              <div>
                <Label className="text-sm font-medium text-[#24292F] dark:text-[#E6EDF3] block mb-2">
                  {config.nameLabel}
                </Label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={config.namePlaceholder}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-lg text-sm",
                    "bg-white dark:bg-[#0D1117]",
                    "border border-[#E1E4E8] dark:border-[#30363D]",
                    "text-[#24292F] dark:text-[#E6EDF3]",
                    "placeholder:text-[#8B949E] dark:placeholder:text-[#6E7681]",
                    "focus:border-[#C69C6D] focus:ring-1 focus:ring-[rgba(198,156,109,0.3)] outline-none"
                  )}
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-[#24292F] dark:text-[#E6EDF3] block mb-2">
                  Description
                </Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description..."
                  rows={4}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg text-sm resize-none",
                    "bg-white dark:bg-[#0D1117]",
                    "border border-[#E1E4E8] dark:border-[#30363D]",
                    "text-[#24292F] dark:text-[#E6EDF3]",
                    "placeholder:text-[#8B949E] dark:placeholder:text-[#6E7681]",
                    "focus:border-[#C69C6D] focus:ring-1 focus:ring-[rgba(198,156,109,0.3)] outline-none"
                  )}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E1E4E8] dark:border-[#30363D] bg-[#F6F8FA] dark:bg-[#0D1117]">
          <Button 
            variant="ghost" 
            onClick={handleClose}
            className="text-[#57606A] dark:text-[#8B949E] hover:text-[#24292F] dark:hover:text-[#E6EDF3]"
          >
            Cancel
          </Button>
          <button
            onClick={handleCreate}
            disabled={!selectedType || !name.trim() || isSubmitting}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              "bg-[#C69C6D] hover:bg-[#B8905F] text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isSubmitting ? 'Creating...' : buttonLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
