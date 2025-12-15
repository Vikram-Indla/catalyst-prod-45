/**
 * Create Strategic Item Modal - CLAUDE NUCLEAR OVERWRITE
 * Type selector modal matching Claude HTML exactly
 */
import { useState } from 'react';
import { X, Layers, Target, Box } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotName: string;
}

type CreateType = 'theme' | 'objective' | 'epic' | null;

const ITEM_TYPES = [
  { id: 'theme' as const, label: 'Theme', sublabel: 'Strategic pillar', icon: Layers },
  { id: 'objective' as const, label: 'Objective', sublabel: 'Measurable goal', icon: Target },
  { id: 'epic' as const, label: 'Epic', sublabel: 'Deliverable work', icon: Box },
];

export function CreateStrategicItemModal({ open, onOpenChange, snapshotName }: CreateModalProps) {
  const [selectedType, setSelectedType] = useState<CreateType>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!open) return null;

  const handleClose = () => {
    setSelectedType(null);
    setName('');
    setDescription('');
    onOpenChange(false);
  };

  const handleCreate = () => {
    // TODO: Wire to backend
    console.log('Creating:', { type: selectedType, name, description });
    handleClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-catalyst-surface border border-catalyst-border rounded-xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-catalyst-border">
          <h2 className="text-lg font-semibold text-catalyst-text">Add to Strategic Backlog</h2>
          <button 
            onClick={handleClose}
            className="p-1 rounded hover:bg-catalyst-surface-hover text-catalyst-text-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <label className="text-sm font-medium text-catalyst-text block mb-3">
            What are you adding?
          </label>
          
          {/* Type Selector Cards */}
          <div className="grid grid-cols-3 gap-3">
            {ITEM_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={cn(
                    "p-4 border-2 rounded-lg text-center transition-all",
                    isSelected 
                      ? "border-catalyst-gold bg-catalyst-gold/10" 
                      : "border-catalyst-border hover:border-catalyst-text-muted"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center",
                    isSelected 
                      ? "bg-catalyst-gold text-white" 
                      : "bg-catalyst-surface-hover text-catalyst-text-muted"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-medium text-catalyst-text">{type.label}</div>
                  <div className="text-xs text-catalyst-text-muted mt-1">{type.sublabel}</div>
                </button>
              );
            })}
          </div>

          {/* Form Fields - Only show when type selected */}
          {selectedType && (
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-catalyst-text block mb-1.5">
                  {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Name
                </label>
                <Input
                  type="text"
                  placeholder="Enter name..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-catalyst-bg border-catalyst-border rounded-lg text-sm text-catalyst-text placeholder:text-catalyst-text-muted focus:ring-2 focus:ring-catalyst-gold/50 focus:border-catalyst-gold"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-catalyst-text block mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2.5 bg-catalyst-bg border border-catalyst-border rounded-lg text-sm text-catalyst-text placeholder:text-catalyst-text-muted focus:outline-none focus:ring-2 focus:ring-catalyst-gold/50 focus:border-catalyst-gold resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-catalyst-border bg-catalyst-surface-hover/50 rounded-b-xl">
          <button 
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-catalyst-text-muted hover:text-catalyst-text transition-colors"
          >
            Cancel
          </button>
          <Button
            onClick={handleCreate}
            disabled={!selectedType || !name.trim()}
            className={cn(
              "px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors",
              selectedType && name.trim()
                ? "bg-catalyst-gold hover:bg-catalyst-gold-hover" 
                : "bg-catalyst-border cursor-not-allowed"
            )}
          >
            Create {selectedType ? selectedType.charAt(0).toUpperCase() + selectedType.slice(1) : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}
