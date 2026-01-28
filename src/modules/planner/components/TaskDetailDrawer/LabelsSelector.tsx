// ============================================================
// LABELS SELECTOR - Task labels with add functionality
// ============================================================

import { useState } from 'react';
import { Tag, Plus, X, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Predefined label colors
const LABEL_COLORS = [
  { name: 'Red', value: 'red', bg: 'bg-red-500', text: 'text-white' },
  { name: 'Orange', value: 'orange', bg: 'bg-orange-500', text: 'text-white' },
  { name: 'Yellow', value: 'yellow', bg: 'bg-yellow-500', text: 'text-black' },
  { name: 'Green', value: 'green', bg: 'bg-green-500', text: 'text-white' },
  { name: 'Blue', value: 'blue', bg: 'bg-blue-500', text: 'text-white' },
  { name: 'Purple', value: 'purple', bg: 'bg-purple-500', text: 'text-white' },
  { name: 'Pink', value: 'pink', bg: 'bg-pink-500', text: 'text-white' },
  { name: 'Gray', value: 'gray', bg: 'bg-gray-500', text: 'text-white' },
];

// Predefined labels (could be fetched from DB later)
const AVAILABLE_LABELS = [
  { id: '1', name: 'Bug', color: 'red' },
  { id: '2', name: 'Feature', color: 'blue' },
  { id: '3', name: 'Enhancement', color: 'purple' },
  { id: '4', name: 'Documentation', color: 'green' },
  { id: '5', name: 'Urgent', color: 'orange' },
  { id: '6', name: 'Low Priority', color: 'gray' },
];

interface LabelsSelectorProps {
  taskId: string;
  selectedLabels: string[];
  onLabelsChange: (labels: string[]) => void;
}

export function LabelsSelector({ taskId, selectedLabels = [], onLabelsChange }: LabelsSelectorProps) {
  const [open, setOpen] = useState(false);

  const getColorClasses = (color: string) => {
    const colorConfig = LABEL_COLORS.find(c => c.value === color);
    return colorConfig || LABEL_COLORS[7]; // Default to gray
  };

  const toggleLabel = (labelId: string) => {
    if (selectedLabels.includes(labelId)) {
      onLabelsChange(selectedLabels.filter(id => id !== labelId));
    } else {
      onLabelsChange([...selectedLabels, labelId]);
    }
  };

  const selectedLabelObjects = AVAILABLE_LABELS.filter(l => selectedLabels.includes(l.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 hover:bg-muted/50 px-2 py-1 rounded transition-colors min-h-[28px]">
          {selectedLabelObjects.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedLabelObjects.map(label => {
                const colors = getColorClasses(label.color);
                return (
                  <Badge
                    key={label.id}
                    className={cn(
                      "text-xs px-2 py-0.5 font-medium border-0",
                      colors.bg,
                      colors.text
                    )}
                  >
                    {label.name}
                  </Badge>
                );
              })}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Add labels...</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 z-[500] bg-popover" align="end">
        <div className="p-2 border-b border-border">
          <p className="text-sm font-medium text-foreground">Select Labels</p>
        </div>
        <div className="max-h-[280px] overflow-y-auto p-1">
          {AVAILABLE_LABELS.map(label => {
            const colors = getColorClasses(label.color);
            const isSelected = selectedLabels.includes(label.id);
            
            return (
              <button
                key={label.id}
                onClick={() => toggleLabel(label.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2 py-2 rounded transition-colors",
                  isSelected ? "bg-muted" : "hover:bg-muted/50"
                )}
              >
                <div className={cn("w-3 h-3 rounded-full", colors.bg)} />
                <span className="text-sm flex-1 text-left">{label.name}</span>
                {isSelected && <Check className="w-4 h-4 text-primary" />}
              </button>
            );
          })}
        </div>
        <div className="p-2 border-t border-border">
          <button className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors">
            <Plus className="w-3 h-3" />
            Create new label
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}