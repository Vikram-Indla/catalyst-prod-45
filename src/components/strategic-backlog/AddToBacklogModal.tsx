/**
 * Add to Strategic Backlog Modal
 * Pixel-perfect implementation matching mockups exactly
 */
import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Layers, Target } from 'lucide-react';
import { useCreateTheme } from '@/hooks/useStrategicBacklog';
import { catalystToast } from '@/lib/catalystToast';
import { cn } from '@/lib/utils';
import { CreateObjectiveDialogV2 } from '@/modules/okr-v2/components/CreateObjectiveDialogV2';

interface AddToBacklogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotId: string;
}

type ItemType = 'theme' | 'objective' | null;

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
};

export function AddToBacklogModal({ open, onOpenChange, snapshotId }: AddToBacklogModalProps) {
  const [selectedType, setSelectedType] = useState<ItemType>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showObjectiveDialog, setShowObjectiveDialog] = useState(false);
  
  const createTheme = useCreateTheme();

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSelectedType(null);
      setName('');
      setDescription('');
    }, 200);
  };

  const handleCreate = async () => {
    if (!selectedType) return;
    
    // For objectives, open the dedicated dialog
    if (selectedType === 'objective') {
      onOpenChange(false);
      setShowObjectiveDialog(true);
      return;
    }
    
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    try {
      if (selectedType === 'theme') {
        await createTheme.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          snapshot_id: snapshotId,
          status: 'draft',
        });
      }
      handleClose();
    } catch (error: any) {
      catalystToast.error('Error', error.message || 'Failed to create item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleObjectiveDialogClose = (isOpen: boolean) => {
    setShowObjectiveDialog(isOpen);
    if (!isOpen) {
      setSelectedType(null);
    }
  };

  const config = selectedType ? TYPE_CONFIG[selectedType] : null;
  const buttonLabel = selectedType && config ? `Create ${config.label}` : 'Create';
  
  // For objectives, allow clicking Create without name
  const isCreateDisabled = selectedType === 'objective' 
    ? false 
    : (!selectedType || !name.trim() || isSubmitting);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden bg-white dark:bg-[#161B22] border border-[#E1E4E8] dark:border-[#30363D]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#E1E4E8] dark:border-[#30363D]">
            <h2 className="text-lg font-semibold text-[#24292F] dark:text-[#E6EDF3]">Add to Strategic Backlog</h2>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            <Label className="text-sm font-medium text-[#24292F] dark:text-[#E6EDF3] block mb-4">
              What are you adding?
            </Label>
            
            {/* Type Selector Cards - 2 columns now */}
            <div className="grid grid-cols-2 gap-3">
              {(['theme', 'objective'] as const).map((type) => {
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

            {/* Form fields - only show for theme, not objective */}
            {selectedType && selectedType !== 'objective' && config && (
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
              disabled={isCreateDisabled}
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

      {/* CreateObjectiveDialogV2 - opens when objective is selected */}
      <CreateObjectiveDialogV2
        open={showObjectiveDialog}
        onOpenChange={handleObjectiveDialogClose}
      />
    </>
  );
}
