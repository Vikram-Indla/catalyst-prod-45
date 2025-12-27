/**
 * Add to Strategic Backlog Modal
 * Theme selection opens the canonical CreateThemeDialog
 * Objective selection opens CreateObjectiveDialogV2
 */
import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Layers, Target, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateObjectiveDialogV2 } from '@/modules/okr-v2/components/CreateObjectiveDialogV2';
import { CatalystCreateTheme } from './CatalystCreateTheme';
import { CreateSnapshotModal } from '@/components/strategy/snapshots/CreateSnapshotModal';

interface AddToBacklogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotId: string;
}

type ItemType = 'theme' | 'snapshot' | 'objective' | null;

const TYPE_CONFIG = {
  theme: {
    icon: Layers,
    label: 'Theme',
    subtitle: 'Strategic pillar',
  },
  snapshot: {
    icon: Calendar,
    label: 'Snapshot',
    subtitle: 'Planning period',
  },
  objective: {
    icon: Target,
    label: 'Objective',
    subtitle: 'Measurable goal',
  },
};

export function AddToBacklogModal({ open, onOpenChange, snapshotId }: AddToBacklogModalProps) {
  const [selectedType, setSelectedType] = useState<ItemType>(null);
  const [showThemeDialog, setShowThemeDialog] = useState(false);
  const [showSnapshotDialog, setShowSnapshotDialog] = useState(false);
  const [showObjectiveDialog, setShowObjectiveDialog] = useState(false);

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSelectedType(null);
    }, 200);
  };

  const handleCreate = () => {
    if (!selectedType) return;
    
    // Close this modal and open the appropriate dialog
    onOpenChange(false);
    
    if (selectedType === 'theme') {
      setShowThemeDialog(true);
    } else if (selectedType === 'snapshot') {
      setShowSnapshotDialog(true);
    } else if (selectedType === 'objective') {
      setShowObjectiveDialog(true);
    }
  };

  const handleThemeDialogClose = (isOpen: boolean) => {
    setShowThemeDialog(isOpen);
    if (!isOpen) {
      setSelectedType(null);
    }
  };

  const handleSnapshotDialogClose = () => {
    setShowSnapshotDialog(false);
    setSelectedType(null);
  };

  const handleObjectiveDialogClose = (isOpen: boolean) => {
    setShowObjectiveDialog(isOpen);
    if (!isOpen) {
      setSelectedType(null);
    }
  };

  const buttonLabel = selectedType ? `Create` : 'Create';
  const isCreateDisabled = !selectedType;

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
            
            {/* Type Selector Cards - 3 columns */}
            <div className="grid grid-cols-3 gap-3">
              {(['theme', 'snapshot', 'objective'] as const).map((type) => {
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
                        ? "border-2 border-[#2563eb] shadow-sm" 
                        : "border border-[#E1E4E8] dark:border-[#30363D] hover:border-[rgba(37,99,235,0.3)]"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center mb-3",
                      isSelected 
                        ? "bg-[#2563eb] text-white" 
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
                "bg-[#2563eb] hover:bg-[#1d4ed8] text-white",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {buttonLabel}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CatalystCreateTheme - canonical theme creation modal */}
      <CatalystCreateTheme
        open={showThemeDialog}
        onOpenChange={handleThemeDialogClose}
        snapshotId={snapshotId}
      />

      {/* CreateSnapshotModal - canonical snapshot creation modal */}
      <CreateSnapshotModal
        open={showSnapshotDialog}
        onClose={handleSnapshotDialogClose}
      />

      {/* CreateObjectiveDialogV2 - canonical objective creation modal */}
      <CreateObjectiveDialogV2
        open={showObjectiveDialog}
        onOpenChange={handleObjectiveDialogClose}
      />
    </>
  );
}
